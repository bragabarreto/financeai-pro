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
  const { 
    includeDeleted = false, 
    limit, 
    offset,
    startDate,
    endDate,
    type
  } = options;
  
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId);
  
  // Exclude soft-deleted transactions by default
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }
  
  // Apply filters
  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }
  if (type) {
    query = query.eq('type', type);
  }
  
  // Apply pagination using range (more reliable than limit)
  if (offset !== undefined || limit !== undefined) {
    const start = offset || 0;
    const end = start + (limit || 100) - 1;
    query = query.range(start, end);
  }
  
  query = query.order('date', { ascending: false });
  
  const { data, error } = await query;
  return { data, error };
};

export const createTransaction = async (transaction) => {
  // Ensure metadata exists and merge with any provided metadata
  const transactionData = {
    ...transaction,
    metadata: transaction.metadata || {}
  };
  
  const { data, error } = await supabase
    .from('transactions')
    .insert([transactionData])
    .select();
  
  // Optional: Log to transaction_audit
  if (data && data.length > 0 && !error) {
    await logTransactionAudit(data[0].id, transaction.user_id, 'create', data[0]);
  }
  
  return { data, error };
};

export const updateTransaction = async (id, updates) => {
  // Get the old data before update for audit logging
  const { data: oldData } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();
  
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select();
  
  // Optional: Log to transaction_audit
  if (data && data.length > 0 && !error && oldData) {
    const changedFields = Object.keys(updates).filter(
      key => updates[key] !== oldData[key]
    );
    await logTransactionAudit(
      data[0].id, 
      data[0].user_id, 
      'update', 
      data[0], 
      changedFields
    );
  }
  
  return { data, error };
};

export const deleteTransaction = async (id) => {
  // Implement soft delete by setting deleted_at timestamp
  const { data, error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  
  // Optional: Log to transaction_audit
  if (data && data.length > 0 && !error) {
    await logTransactionAudit(data[0].id, data[0].user_id, 'delete', data[0]);
  }
  
  return { error };
};

// Helper function to log transaction audit events
const logTransactionAudit = async (transactionId, userId, eventType, payload, changedFields = []) => {
  try {
    await supabase
      .from('transaction_audit')
      .insert([{
        transaction_id: transactionId,
        user_id: userId,
        event_type: eventType,
        payload: payload,
        changed_fields: changedFields,
        metadata: {}
      }]);
  } catch (error) {
    console.error('Failed to log transaction audit:', error);
  }
};

// Import history functions
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

export const getImportHistory = async (userId, options = {}) => {
  const { limit = 50, offset = 0 } = options;
  
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .eq('user_id', userId)
    .order('import_date', { ascending: false })
    .range(offset, offset + limit - 1);
  
  return { data, error };
};