import { parseFile, validateFile } from './fileParser';
import { extractTransactions, validateTransactions } from './aiExtractor';
import { supabase } from '../../supabaseClient';

/**
 * Main import service - FIXED VERSION
 * Handles Brazilian formats and CSV parsing issues
 */

/**
 * Convert Brazilian currency format to number
 * @param {String} value - Brazilian currency (e.g., "R$ 1.234,56" or "R$ 1,09")
 * @returns {Number} Numeric value
 */
export const parseBrazilianCurrency = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove R$, spaces, and quotes
  let cleaned = value.toString()
    .replace(/["']/g, '')
    .replace(/R\$/g, '')
    .trim();
  
  // Check if has both dot and comma (e.g., "1.234,56")
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // Remove thousands separator (dot) and replace decimal comma with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } 
  // Check if has only comma (e.g., "1,09")
  else if (cleaned.includes(',')) {
    // Replace decimal comma with dot
    cleaned = cleaned.replace(',', '.');
  }
  
  const number = parseFloat(cleaned);
  return isNaN(number) ? 0 : number;
};

/**
 * Convert Brazilian date format to ISO format
 * @param {String} date - Brazilian date (DD/MM/YYYY)
 * @returns {String} ISO date (YYYY-MM-DD)
 */
export const parseBrazilianDate = (date) => {
  if (!date) return null;
  
  // Remove quotes
  const cleaned = date.toString().replace(/["']/g, '').trim();
  
  // Check if already in ISO format
  if (cleaned.match(/^\d{4}-\d{2}-\d{2}/)) {
    return cleaned.split('T')[0];
  }
  
  // Parse DD/MM/YYYY or DD-MM-YYYY
  const matchFull = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (matchFull) {
    const day = matchFull[1].padStart(2, '0');
    const month = matchFull[2].padStart(2, '0');
    let year = matchFull[3];
    // Handle 2-digit year
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }
  
  // Parse DD/MM without year (use current year)
  const matchShort = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (matchShort) {
    const day = matchShort[1].padStart(2, '0');
    const month = matchShort[2].padStart(2, '0');
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }
  
  return null;
};

/**
 * Parse CSV with proper handling of quoted fields
 * @param {String} csvText - CSV content
 * @returns {Array} Parsed rows
 */
export const parseCSVProperly = (csvText) => {
  const lines = csvText.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = [];
    let currentField = '';
    let insideQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];
      
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          j++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // Field separator
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add last field
    row.push(currentField.trim());
    result.push(row);
  }
  
  return result;
};

/**
 * Process uploaded file and extract transactions - FIXED VERSION
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

  // Parse file using the appropriate parser
  const parseResult = await parseFile(file);
  
  const { data: parsedData, fileType } = parseResult;
  
  // Handle different file types
  let transactions = [];
  const errors = [];
  
  if (fileType === 'csv' || fileType === 'excel') {
    // Process tabular data (CSV or Excel)
    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      throw new Error('Arquivo vazio ou sem dados válidos');
    }
    
    // Use AI extractor to intelligently extract transactions
    try {
      const { extractTransactions } = await import('./aiExtractor');
      const extracted = extractTransactions(parsedData);
      
      if (!extracted || extracted.length === 0) {
        throw new Error('Não foi possível extrair transações do arquivo. Verifique o formato dos dados.');
      }
      
      transactions = extracted;
    } catch (error) {
      throw new Error(`Erro ao extrair transações: ${error.message}`);
    }
  } else if (fileType === 'pdf' || fileType === 'doc') {
    // For PDF and DOC, we currently return placeholder
    // These formats require more sophisticated parsing (pdf.js, mammoth.js)
    throw new Error(
      `Arquivos ${fileType.toUpperCase()} requerem processamento manual no momento. ` +
      'Por favor, converta para CSV ou Excel, ou use a opção "SMS/Texto" para colar o conteúdo extraído.'
    );
  } else {
    throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
  }
  
  return {
    transactions,
    errors,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      fileType: fileType,
      processedAt: new Date().toISOString(),
      totalRows: parsedData.length || 0,
      extractedTransactions: transactions.length,
      failedRows: errors.length
    }
  };
};

/**
 * Helper function to calculate installment dates
 * @param {String} startDate - Start date in YYYY-MM-DD format
 * @param {Number} count - Number of installments
 * @returns {Array} Array of dates in YYYY-MM-DD format
 */
const calculateInstallmentDates = (startDate, count) => {
  const dates = [];
  const date = new Date(startDate + 'T12:00:00'); // Add time to avoid timezone issues
  for (let i = 0; i < count; i++) {
    const installmentDate = new Date(date);
    installmentDate.setMonth(date.getMonth() + i);
    const year = installmentDate.getFullYear();
    const month = String(installmentDate.getMonth() + 1).padStart(2, '0');
    const day = String(installmentDate.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
};

/**
 * Import transactions to database - FIXED VERSION
 * Handles installment transactions by creating individual records for each installment
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
      // Resolve category ID: prefer explicit categoryId, otherwise map from name
      let categoryId = null;
      if (transaction.categoryId) {
        categoryId = transaction.categoryId;
      } else if (transaction.category) {
        const nameExact = String(transaction.category);
        const nameLower = nameExact.toLowerCase();
        categoryId = categoryMapping[nameExact] || categoryMapping[nameLower] || null;
      }
      
      // Determine the correct account_id or card_id based on payment method
      const finalAccountId = transaction.card_id ? null : (transaction.account_id || accountId);
      const cardId = transaction.card_id || null;
      
      // Ensure amount is a valid number
      const totalAmount = typeof transaction.amount === 'number' 
        ? transaction.amount 
        : parseBrazilianCurrency(transaction.amount);
      
      // Ensure date is in ISO format (YYYY-MM-DD only, no time component)
      let date = transaction.date;
      
      // If it's a Date object, convert to ISO string without timezone issues
      if (date instanceof Date) {
        // Use UTC methods to avoid timezone shifts
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        date = `${year}-${month}-${day}`;
      } 
      // If it's already in ISO format, extract just the date part (remove time if present)
      else if (date && date.match(/^\d{4}-\d{2}-\d{2}/)) {
        date = date.split('T')[0];
      } 
      // Otherwise, try to parse Brazilian format
      else {
        date = parseBrazilianDate(date);
      }
      
      if (!date) {
        throw new Error('Data inválida');
      }
      
      if (totalAmount === 0 || isNaN(totalAmount)) {
        throw new Error('Valor inválido');
      }
      
      // Check if it's an installment transaction
      const isInstallment = transaction.is_installment && transaction.installment_count > 1;
      
      if (isInstallment) {
        // Create multiple individual transactions for each installment
        const installmentCount = parseInt(transaction.installment_count);
        const installmentAmount = totalAmount / installmentCount;
        const installmentDates = calculateInstallmentDates(date, installmentCount);
        const lastInstallmentDate = installmentDates[installmentDates.length - 1];
        
        const installmentTransactions = [];
        
        for (let i = 0; i < installmentCount; i++) {
          installmentTransactions.push({
            user_id: userId,
            account_id: finalAccountId,
            card_id: cardId,
            type: transaction.type || 'expense',
            description: `${transaction.description} (${i + 1}/${installmentCount})`,
            amount: installmentAmount,
            total_amount: totalAmount,
            category: categoryId,
            date: installmentDates[i],
            payment_method: transaction.payment_method || null,
            is_alimony: transaction.is_alimony || false,
            origin: transaction.origin || 'import',
            created_at: new Date().toISOString(),
            is_installment: true,
            installment_count: installmentCount,
            installment_number: i + 1,
            installment_due_dates: null,
            last_installment_date: lastInstallmentDate
          });
        }
        
        // Insert all installments at once
        const { data, error } = await supabase
          .from('transactions')
          .insert(installmentTransactions)
          .select();
        
        if (error) {
          throw error;
        }
        
        // Add all installments as imported
        data.forEach((installedTx, idx) => {
          importedTransactions.push({
            ...transaction,
            id: installedTx.id,
            description: `${transaction.description} (${idx + 1}/${installmentCount})`,
            amount: installmentAmount,
            date: installmentDates[idx],
            success: true
          });
        });
        
        console.log(`✅ ${installmentCount} parcelas criadas para: ${transaction.description}`);
      } else {
        // Single transaction (no installments)
        const transactionData = {
          user_id: userId,
          account_id: finalAccountId,
          card_id: cardId,
          type: transaction.type || 'expense',
          description: transaction.description,
          amount: totalAmount,
          category: categoryId,
          date: date,
          payment_method: transaction.payment_method || null,
          is_alimony: transaction.is_alimony || false,
          origin: transaction.origin || 'import',
          created_at: new Date().toISOString(),
          is_installment: false,
          installment_count: null,
          installment_due_dates: null,
          last_installment_date: null
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
      }
    } catch (error) {
      failedTransactions.push({
        ...transaction,
        error: error.message,
        success: false
      });
    }
  }
  
  // Update account balance
  if (importedTransactions.length > 0 && accountId) {
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
  if (!accountId) return;
  
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
    file_name: importResult.metadata?.fileName || 'unknown',
    file_size: importResult.metadata?.fileSize || 0,
    total_rows: importResult.metadata?.totalRows || 0,
    extracted_transactions: importResult.metadata?.extractedTransactions || 0,
    imported_transactions: importResult.imported || 0,
    failed_transactions: importResult.failed || 0,
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
  const accountIds = [...new Set(transactions.map(t => t.account_id).filter(Boolean))];
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
