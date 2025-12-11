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
export const getTransactions = async (userId) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null) // Filtrar apenas transações ativas (não deletadas)
    .order('date', { ascending: false });
  return { data, error };
};

export const createTransaction = async (transaction) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction])
    .select();
  return { data, error };
};

export const updateTransaction = async (id, updates) => {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select();
  return { data, error };
};

export const deleteTransaction = async (id) => {
  // Soft delete - marca como deletado ao invés de remover
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return { error };
};

export const hardDeleteTransaction = async (id) => {
  // Hard delete - remove permanentemente (use com cuidado)
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  return { error };
};

export const restoreTransaction = async (id) => {
  // Restaurar transação deletada
  const { data, error } = await supabase
    .from('transactions')
    .update({ deleted_at: null })
    .eq('id', id)
    .select();
  return { data, error };
};

export const getDeletedTransactions = async (userId) => {
  // Obter transações deletadas (lixeira)
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  return { data, error };
};

// IMPORT HISTORY
export const getImportHistory = async (userId, limit = 50) => {
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .eq('user_id', userId)
    .order('import_date', { ascending: false })
    .limit(limit);
  return { data, error };
};

export const createImportRecord = async (importData) => {
  const { data, error } = await supabase
    .from('import_history')
    .insert([importData])
    .select();
  return { data, error };
};

export const getImportStats = async (userId) => {
  const { data, error } = await supabase
    .from('import_history')
    .select('file_type, status, records_imported, records_failed')
    .eq('user_id', userId);
  
  if (error) return { data: null, error };
  
  // Calcular estatísticas
  const stats = {
    total_imports: data.length,
    successful: data.filter(i => i.status === 'success').length,
    failed: data.filter(i => i.status === 'failed').length,
    partial: data.filter(i => i.status === 'partial').length,
    total_records: data.reduce((sum, i) => sum + (i.records_imported || 0), 0),
    by_type: {}
  };
  
  // Agrupar por tipo
  data.forEach(imp => {
    if (!stats.by_type[imp.file_type]) {
      stats.by_type[imp.file_type] = { count: 0, records: 0 };
    }
    stats.by_type[imp.file_type].count++;
    stats.by_type[imp.file_type].records += imp.records_imported || 0;
  });
  
  return { data: stats, error: null };
};

// TRANSACTION AUDIT
export const getTransactionAudit = async (transactionId) => {
  const { data, error } = await supabase
    .from('transaction_audit')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const getUserAuditLog = async (userId, limit = 100) => {
  const { data, error } = await supabase
    .from('transaction_audit')
    .select('*, transactions(description, amount)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data, error };
};

export const getAuditByAction = async (userId, action) => {
  const { data, error } = await supabase
    .from('transaction_audit')
    .select('*')
    .eq('user_id', userId)
    .eq('action', action)
    .order('created_at', { ascending: false });
  return { data, error };
};

// EXPORT TRANSACTIONS
export const exportTransactions = async (format = 'csv', filters = {}) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { data: null, error: { message: 'Não autenticado' } };
    }

    const response = await fetch('/api/export-transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ format, filters })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { data: null, error: errorData };
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// BULK OPERATIONS
export const bulkCreateTransactions = async (transactions) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transactions)
    .select();
  return { data, error };
};

export const bulkDeleteTransactions = async (ids) => {
  // Soft delete em massa
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids);
  return { error };
};

export const bulkRestoreTransactions = async (ids) => {
  const { data, error } = await supabase
    .from('transactions')
    .update({ deleted_at: null })
    .in('id', ids)
    .select();
  return { data, error };
};
