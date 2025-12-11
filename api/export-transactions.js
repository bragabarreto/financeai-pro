/**
 * Vercel Serverless Function: Export Transactions
 * 
 * Exports user transactions to CSV or XLSX format
 * Supports filtering by date range, category, and payment method
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Convert transactions to CSV format
 */
function convertToCSV(transactions) {
  if (!transactions || transactions.length === 0) {
    return 'No transactions to export';
  }

  const headers = [
    'ID',
    'Data',
    'Descrição',
    'Valor',
    'Tipo',
    'Categoria',
    'Método de Pagamento',
    'Parcelas',
    'Criado em',
    'Atualizado em'
  ];

  const rows = transactions.map(t => [
    t.id,
    t.date,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.amount,
    t.type,
    t.category || '',
    t.payment_method || '',
    t.installments || '',
    t.created_at || '',
    t.updated_at || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authorization token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - Missing or invalid token' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Parse request body
    const { format = 'csv', filters = {} } = req.body;

    // Build query
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('date', { ascending: false });

    // Apply filters
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod);
    }

    // Execute query
    const { data: transactions, error: queryError } = await query;

    if (queryError) {
      console.error('Query error:', queryError);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    // Log export to import_history
    try {
      await supabase.from('import_history').insert({
        user_id: user.id,
        file_type: 'manual',
        file_name: `export_${format}_${new Date().toISOString().split('T')[0]}`,
        records_imported: transactions.length,
        status: 'success',
        metadata: {
          action: 'export',
          format: format,
          filters: filters,
          record_count: transactions.length
        }
      });
    } catch (logError) {
      console.error('Failed to log export:', logError);
      // Don't fail the export if logging fails
    }

    // Convert to requested format
    if (format === 'csv') {
      const csvContent = convertToCSV(transactions);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`);
      
      return res.status(200).send('\uFEFF' + csvContent); // Add BOM for Excel UTF-8 support
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.json"`);
      
      return res.status(200).json({
        exportDate: new Date().toISOString(),
        totalRecords: transactions.length,
        filters: filters,
        transactions: transactions
      });
    } else {
      return res.status(400).json({ error: 'Unsupported format. Use csv or json.' });
    }

  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
