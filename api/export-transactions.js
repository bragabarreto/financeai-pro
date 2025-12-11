/**
 * Serverless Function: Export Transactions to CSV
 * 
 * This endpoint exports transactions for a given user to CSV format.
 * Query parameters:
 * - userId: Required. User ID to export transactions for
 * - startDate: Optional. ISO date string for filtering (inclusive)
 * - endDate: Optional. ISO date string for filtering (inclusive)
 * - type: Optional. Filter by transaction type (income, expense, investment)
 */

const { createClient } = require('@supabase/supabase-js');
const { parse } = require('json2csv');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get query parameters
    const { userId, startDate, endDate, type } = req.query;

    // Validate required parameters
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null); // Exclude soft-deleted transactions

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    // Apply type filter if provided
    if (type && ['income', 'expense', 'investment'].includes(type)) {
      query = query.eq('type', type);
    }

    // Order by date descending
    query = query.order('date', { ascending: false });

    // Execute query
    const { data: transactions, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    // Handle empty results
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ error: 'No transactions found' });
    }

    // Transform data for CSV export
    const csvData = transactions.map(t => ({
      'ID': t.id,
      'Data': t.date,
      'Descrição': t.description || '',
      'Tipo': t.type,
      'Categoria': t.category || '',
      'Valor': t.amount,
      'Conta': t.account || '',
      'Método de Pagamento': t.payment_method || '',
      'Cartão de Crédito': t.credit_card || '',
      'É Parcela': t.is_installment ? 'Sim' : 'Não',
      'Número da Parcela': t.installment_number || '',
      'Total de Parcelas': t.installment_count || '',
      'Valor Total': t.total_amount || '',
      'Observações': t.notes || '',
      'Criado em': t.created_at || '',
      'Atualizado em': t.updated_at || ''
    }));

    // Define CSV fields
    const fields = [
      'ID',
      'Data',
      'Descrição',
      'Tipo',
      'Categoria',
      'Valor',
      'Conta',
      'Método de Pagamento',
      'Cartão de Crédito',
      'É Parcela',
      'Número da Parcela',
      'Total de Parcelas',
      'Valor Total',
      'Observações',
      'Criado em',
      'Atualizado em'
    ];

    // Convert to CSV
    const csv = parse(csvData, { fields });

    // Generate filename with current date
    const filename = `transactions_${userId}_${new Date().toISOString().split('T')[0]}.csv`;

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Add BOM for proper Excel UTF-8 encoding
    const BOM = '\uFEFF';
    res.status(200).send(BOM + csv);

  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ 
      error: 'Failed to export transactions',
      message: error.message 
    });
  }
};
