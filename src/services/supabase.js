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

// TRANSACTIONS - com suporte a persistência histórica e soft-delete

/**
 * Buscar transações com suporte a filtros avançados
 * @param {string} userId - ID do usuário
 * @param {Object} options - Opções de busca
 * @param {boolean} options.includeDeleted - Incluir transações deletadas (soft-delete)
 * @param {string} options.startDate - Data inicial (YYYY-MM-DD)
 * @param {string} options.endDate - Data final (YYYY-MM-DD)
 * @param {string} options.type - Tipo de transação (income, expense, investment)
 * @param {string} options.category - Categoria
 */
export const getTransactions = async (userId, options = {}) => {
  const { includeDeleted = false, startDate, endDate, type, category } = options;
  
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId);
  
  // Filtrar soft-deleted
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }
  
  // Filtrar por período
  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }
  
  // Filtrar por tipo
  if (type) {
    query = query.eq('type', type);
  }
  
  // Filtrar por categoria
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query.order('date', { ascending: false });
  return { data, error };
};

/**
 * Criar transação com timestamps e metadata
 * @param {Object} transaction - Dados da transação
 * @param {Object} metadata - Metadata adicional (import_id, source, etc)
 */
export const createTransaction = async (transaction, metadata = {}) => {
  const transactionWithMetadata = {
    ...transaction,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      ...metadata,
      created_via: metadata.source || 'manual'
    }
  };
  
  const { data, error } = await supabase
    .from('transactions')
    .insert([transactionWithMetadata])
    .select();
  return { data, error };
};

/**
 * Atualizar transação (atualiza updated_at automaticamente via trigger)
 */
export const updateTransaction = async (id, updates) => {
  const { data, error } = await supabase
    .from('transactions')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();
  return { data, error };
};

/**
 * Soft-delete de transação (marca deleted_at ao invés de excluir)
 * @param {string} id - ID da transação
 * @param {boolean} hardDelete - Se true, exclui permanentemente
 */
export const deleteTransaction = async (id, hardDelete = false) => {
  if (hardDelete) {
    // Exclusão permanente
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    return { error };
  }
  
  // Soft-delete
  const { data, error } = await supabase
    .from('transactions')
    .update({ 
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();
  return { data, error };
};

/**
 * Restaurar transação soft-deleted
 */
export const restoreTransaction = async (id) => {
  const { data, error } = await supabase
    .from('transactions')
    .update({ 
      deleted_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();
  return { data, error };
};

/**
 * Buscar transações deletadas (lixeira)
 */
export const getDeletedTransactions = async (userId) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  return { data, error };
};

// IMPORT HISTORY - Rastreamento de importações

/**
 * Criar registro de importação
 */
export const createImportHistory = async (importData) => {
  const { data, error } = await supabase
    .from('import_history')
    .insert([{
      user_id: importData.userId,
      source: importData.source,
      file_name: importData.fileName || null,
      total_rows: importData.totalRows || 0,
      imported_count: 0,
      failed_count: 0,
      status: 'processing',
      metadata: importData.metadata || {}
    }])
    .select();
  return { data, error };
};

/**
 * Atualizar status da importação
 */
export const updateImportHistory = async (id, updates) => {
  const { data, error } = await supabase
    .from('import_history')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();
  return { data, error };
};

/**
 * Buscar histórico de importações
 */
export const getImportHistory = async (userId, limit = 20) => {
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .eq('user_id', userId)
    .order('import_date', { ascending: false })
    .limit(limit);
  return { data, error };
};

// TRANSACTION AUDIT - Auditoria de transações

/**
 * Buscar histórico de auditoria de uma transação
 */
export const getTransactionAudit = async (transactionId) => {
  const { data, error } = await supabase
    .from('transaction_audit')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });
  return { data, error };
};

/**
 * Buscar todas as alterações do usuário
 */
export const getUserAuditLog = async (userId, options = {}) => {
  const { limit = 50, startDate, endDate, action } = options;
  
  let query = supabase
    .from('transaction_audit')
    .select('*')
    .eq('user_id', userId);
  
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }
  if (action) {
    query = query.eq('action', action);
  }
  
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return { data, error };
};

// EXPORT - Gerar URL de exportação

/**
 * Gerar URL para exportação CSV
 */
export const getExportUrl = (userId, options = {}) => {
  const { startDate, endDate, includeDeleted = false } = options;
  const baseUrl = process.env.REACT_APP_API_URL || window.location.origin;
  
  const params = new URLSearchParams({
    userId,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(includeDeleted && { includeDeleted: 'true' })
  });
  
  return `${baseUrl}/api/export-transactions?${params.toString()}`;
};