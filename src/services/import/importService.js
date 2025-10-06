import { parseFile, validateFile } from './fileParser';
import { extractTransactions, validateTransactions } from './aiExtractor';
import { supabase } from '../../supabaseClient';

/**
 * Main import service
 * Orchestrates file parsing, AI extraction, and data import
 */

/**
 * Process uploaded file and extract transactions
 * @param {File} file - The uploaded file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
export const processImportFile = async (file, options = {}) => {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Parse file
  const parseResult = await parseFile(file);
  
  // Extract transactions using AI
  const transactions = extractTransactions(parseResult.data, options.fieldMapping);
  
  // Validate extracted transactions
  const validationResult = validateTransactions(transactions);
  
  return {
    parseResult,
    transactions,
    validation: validationResult,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      processedAt: new Date().toISOString(),
      totalRows: parseResult.rowCount,
      extractedTransactions: transactions.length,
      validTransactions: validationResult.validTransactions
    }
  };
};

/**
 * Import transactions to database
 * @param {Array} transactions - Transactions to import
 * @param {String} userId - User ID
 * @param {String} accountId - Account ID
 * @param {Object} categoryMapping - Mapping from category names to IDs
 * @returns {Promise<Object>} Import result
 */
export const importTransactions = async (transactions, userId, accountId, categoryMapping = {}) => {
  const importedTransactions = [];
  const failedTransactions = [];
  
  for (const transaction of transactions) {
    try {
      // Map category name to ID if available
      const categoryId = categoryMapping[transaction.category] || null;
      
      // Prepare transaction data
      const transactionData = {
        user_id: userId,
        account_id: accountId,
        type: transaction.type,
        description: transaction.description,
        amount: transaction.amount,
        category: categoryId,
        date: transaction.date,
        payment_method: transaction.payment_method || null,
        created_at: new Date().toISOString(),
        metadata: {
          imported: true,
          confidence: transaction.confidence,
          original_category: transaction.category,
          import_date: new Date().toISOString(),
          beneficiary: transaction.beneficiary,
          depositor: transaction.depositor
        }
      };
      
      // Insert into database
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select();
      
      if (error) {
        throw error;
      }
      
      importedTransactions.push({
        ...transaction,
        id: data[0].id,
        success: true
      });
    } catch (error) {
      failedTransactions.push({
        ...transaction,
        error: error.message,
        success: false
      });
    }
  }
  
  // Update account balance
  if (importedTransactions.length > 0) {
    await updateAccountBalance(accountId, userId);
  }
  
  return {
    success: failedTransactions.length === 0,
    imported: importedTransactions.length,
    failed: failedTransactions.length,
    importedTransactions,
    failedTransactions
  };
};

/**
 * Update account balance after import
 * @param {String} accountId - Account ID
 * @param {String} userId - User ID
 */
const updateAccountBalance = async (accountId, userId) => {
  // Get all transactions for this account
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('account_id', accountId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching transactions:', error);
    return;
  }
  
  // Calculate balance
  let balance = 0;
  transactions.forEach(t => {
    if (t.type === 'income') {
      balance += t.amount;
    } else if (t.type === 'expense') {
      balance -= t.amount;
    } else if (t.type === 'investment') {
      // Investments reduce balance (money moved to investment)
      balance -= t.amount;
    }
  });
  
  // Update account
  await supabase
    .from('accounts')
    .update({ balance })
    .eq('id', accountId);
};

/**
 * Save import history
 * @param {String} userId - User ID
 * @param {Object} importResult - Import result data
 * @returns {Promise<Object>} Saved import record
 */
export const saveImportHistory = async (userId, importResult) => {
  const historyRecord = {
    user_id: userId,
    file_name: importResult.metadata.fileName,
    file_size: importResult.metadata.fileSize,
    total_rows: importResult.metadata.totalRows,
    extracted_transactions: importResult.metadata.extractedTransactions,
    imported_transactions: importResult.imported,
    failed_transactions: importResult.failed,
    import_date: new Date().toISOString(),
    status: importResult.success ? 'completed' : 'partial',
    metadata: importResult
  };
  
  const { data, error } = await supabase
    .from('import_history')
    .insert([historyRecord])
    .select();
  
  if (error) {
    console.error('Error saving import history:', error);
  }
  
  return data ? data[0] : null;
};

/**
 * Get import history for user
 * @param {String} userId - User ID
 * @returns {Promise<Array>} Import history records
 */
export const getImportHistory = async (userId) => {
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .eq('user_id', userId)
    .order('import_date', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('Error fetching import history:', error);
    return [];
  }
  
  return data || [];
};

/**
 * Rollback an import
 * @param {String} importId - Import history ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Rollback result
 */
export const rollbackImport = async (importId, userId) => {
  // Get import record
  const { data: importRecord, error: fetchError } = await supabase
    .from('import_history')
    .select('*')
    .eq('id', importId)
    .eq('user_id', userId)
    .single();
  
  if (fetchError || !importRecord) {
    throw new Error('Import record not found');
  }
  
  // Get transactions from this import
  const importDate = importRecord.import_date;
  const { data: transactions, error: transError } = await supabase
    .from('transactions')
    .select('id, account_id')
    .eq('user_id', userId)
    .gte('created_at', importDate)
    .lte('created_at', new Date(new Date(importDate).getTime() + 60000).toISOString());
  
  if (transError) {
    throw new Error('Failed to fetch transactions');
  }
  
  // Delete transactions
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .in('id', transactions.map(t => t.id));
  
  if (deleteError) {
    throw new Error('Failed to delete transactions');
  }
  
  // Update account balances
  const accountIds = [...new Set(transactions.map(t => t.account_id))];
  for (const accountId of accountIds) {
    await updateAccountBalance(accountId, userId);
  }
  
  // Mark import as rolled back
  await supabase
    .from('import_history')
    .update({ status: 'rolled_back' })
    .eq('id', importId);
  
  return {
    success: true,
    deletedCount: transactions.length
  };
};
