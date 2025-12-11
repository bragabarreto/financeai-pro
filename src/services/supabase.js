import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// AUTH
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const signUp = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
};

// CATEGORIES
export const getCategories = async (userId) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const createCategory = async (category) => {
  const { data, error } = await supabase
    .from('categories')
    .insert([category])
    .select();
  return { data, error };
};

export const updateCategory = async (id, updates) => {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select();
  return { data, error };
};

export const deleteCategory = async (id) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  return { error };
};

// ACCOUNTS
export const getAccounts = async (userId) => {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const createAccount = async (account) => {
  const { data, error } = await supabase
    .from('accounts')
    .insert([account])
    .select();
  return { data, error };
};

export const updateAccount = async (id, updates) => {
  const { data, error } = await supabase
    .from('accounts')
    .update(updates)
    .eq('id', id)
    .select();
  return { data, error };
};

export const deleteAccount = async (id) => {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id);
  return { error };
};

// TRANSACTIONS
export const getTransactions = async (userId, options = {}) => {
  // Support backward compatibility: if second parameter is a boolean, treat it as includeDeleted
  if (typeof options === 'boolean') {
    options = { includeDeleted: options };
  }
  
  const { includeDeleted = false, limit, offset } = options;
  
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId);
  
  // Exclude soft-deleted transactions unless includeDeleted is true
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }
  
  // Apply pagination if provided
  if (limit !== undefined) {
    const from = offset || 0;
    const to = from + limit - 1;
    query = query.range(from, to);
  }
  
  query = query.order('date', { ascending: false });
  
  const { data, error } = await query;
  return { data, error };
};

export const createTransaction = async (transaction) => {
  // Ensure created_at and metadata are set
  const transactionWithDefaults = {
    ...transaction,
    created_at: transaction.created_at || new Date().toISOString(),
    metadata: transaction.metadata || {}
  };
  
  const { data, error } = await supabase
    .from('transactions')
    .insert([transactionWithDefaults])
    .select();
  
  // Optional: Log to audit trail
  if (data && data.length > 0 && !error) {
    try {
      await createAuditLog({
        transaction_id: data[0].id,
        user_id: transaction.user_id,
        action: 'create',
        payload: data[0]
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't fail the transaction if audit logging fails
    }
  }
  
  return { data, error };
};

export const updateTransaction = async (id, updates) => {
  // updated_at will be set automatically by the database trigger
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select();
  
  // Optional: Log to audit trail
  if (data && data.length > 0 && !error) {
    try {
      await createAuditLog({
        transaction_id: id,
        user_id: data[0].user_id,
        action: 'update',
        payload: data[0]
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't fail the transaction if audit logging fails
    }
  }
  
  return { data, error };
};

export const deleteTransaction = async (id) => {
  // Get the transaction before soft-deleting for audit log
  const { data: existingTransaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();
  
  // Implement soft-delete by setting deleted_at timestamp
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('transactions')
    .update({ deleted_at: now })
    .eq('id', id)
    .select();
  
  // Optional: Log to audit trail
  if (data && data.length > 0 && !error && existingTransaction) {
    try {
      await createAuditLog({
        transaction_id: id,
        user_id: existingTransaction.user_id,
        action: 'delete',
        payload: existingTransaction
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't fail the transaction if audit logging fails
    }
  }
  
  return { error };
};

// Helper function to create audit log entries
const createAuditLog = async (auditData) => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('transaction_audit')
    .insert([{
      transaction_id: auditData.transaction_id,
      user_id: auditData.user_id,
      action: auditData.action,
      payload: auditData.payload,
      timestamp: now
    }]);
  
  if (error) {
    throw error;
  }
};

// IMPORT HISTORY
export const createImportHistory = async (importData) => {
  const { data, error } = await supabase
    .from('import_history')
    .insert([importData])
    .select();
  return { data, error };
};

export const updateImportHistory = async (id, updates) => {
  const { data, error } = await supabase
    .from('import_history')
    .update(updates)
    .eq('id', id)
    .select();
  return { data, error };
};

export const getImportHistory = async (userId) => {
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .eq('user_id', userId)
    .order('import_date', { ascending: false });
  return { data, error };
};