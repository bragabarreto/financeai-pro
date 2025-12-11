/**
 * Export Transactions API Endpoint
 * 
 * Serverless function to export transactions as CSV
 * 
 * Query parameters:
 * - userId: Required - User ID for filtering transactions
 * - startDate: Optional - Start date for filtering (YYYY-MM-DD)
 * - endDate: Optional - End date for filtering (YYYY-MM-DD)
 * - type: Optional - Transaction type filter (income, expense, investment)
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Convert array of objects to CSV string
 */
const convertToCSV = (data) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Define CSV headers
  const headers = [
    'id',
    'date',
    'description',
    'amount',
    'type',
    'category',
    'payment_method',
    'account',
    'is_installment',
    'installment_number',
    'installment_count',
    'notes',
    'created_at',
    'updated_at'
  ];

  // Create header row
  const headerRow = headers.join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      let value = row[header];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      
      // Handle dates
      if (header.includes('_at') || header === 'date') {
        value = value ? new Date(value).toISOString() : '';
      }
      
      // Handle numbers
      if (header === 'amount') {
        value = value.toString();
      }
      
      // Escape commas and quotes in strings
      if (typeof value === 'string') {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
      }
      
      return value;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract query parameters
    const { userId, startDate, endDate, type } = req.query;

    // Validate userId
    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    // Build query
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null); // Exclude soft-deleted transactions

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

    // Order by date
    query = query.order('date', { ascending: false });

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch transactions',
        details: error.message 
      });
    }

    // Convert to CSV
    const csv = convertToCSV(data);

    // Set headers for CSV download
    const filename = `transactions_${userId}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Send CSV
    return res.status(200).send(csv);

  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
