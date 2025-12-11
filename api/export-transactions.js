// Serverless endpoint para exportação de transações em CSV
// Compatível com Vercel e plataformas serverless similares

import { createClient } from '@supabase/supabase-js';

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// Função para escapar valores CSV
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Formatar data para exibição
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
};

// Formatar valor monetário
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0,00';
  return Number(amount).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Traduzir tipo de transação
const translateType = (type) => {
  const types = {
    income: 'Receita',
    expense: 'Despesa',
    investment: 'Investimento'
  };
  return types[type] || type;
};

// Traduzir método de pagamento
const translatePaymentMethod = (method) => {
  const methods = {
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    pix: 'PIX',
    transfer: 'Transferência',
    boleto_bancario: 'Boleto',
    paycheck: 'Contracheque',
    application: 'Aplicação',
    redemption: 'Resgate'
  };
  return methods[method] || method || '';
};

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Obter parâmetros da query
  const { userId, startDate, endDate, includeDeleted, format = 'csv' } = req.query;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId é obrigatório'
    });
  }

  // Validar datas se fornecidas
  if (startDate && isNaN(Date.parse(startDate))) {
    return res.status(400).json({
      success: false,
      error: 'startDate inválido. Use formato YYYY-MM-DD'
    });
  }

  if (endDate && isNaN(Date.parse(endDate))) {
    return res.status(400).json({
      success: false,
      error: 'endDate inválido. Use formato YYYY-MM-DD'
    });
  }

  // Inicializar cliente Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                      process.env.SUPABASE_KEY || 
                      process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      error: 'Configuração do Supabase não encontrada'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Construir query base
    let query = supabase
      .from('transactions')
      .select(`
        id,
        date,
        description,
        amount,
        type,
        category,
        payment_method,
        account_id,
        card_id,
        is_installment,
        installment_count,
        is_alimony,
        created_at,
        updated_at,
        deleted_at,
        metadata,
        accounts:account_id (name),
        cards:card_id (name)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // Filtrar por soft-delete
    if (includeDeleted !== 'true') {
      query = query.is('deleted_at', null);
    }

    // Filtrar por período
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Erro ao buscar transações:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar transações: ' + error.message
      });
    }

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nenhuma transação encontrada para os critérios especificados'
      });
    }

    // Formato JSON
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        count: transactions.length,
        data: transactions
      });
    }

    // Gerar CSV
    const headers = [
      'Data',
      'Descrição',
      'Valor',
      'Tipo',
      'Categoria',
      'Forma de Pagamento',
      'Conta/Cartão',
      'Parcelado',
      'Nº Parcelas',
      'Pensão',
      'Data Criação',
      'Data Atualização',
      'Status'
    ];

    const rows = transactions.map(t => [
      formatDate(t.date),
      escapeCSV(t.description),
      formatCurrency(t.amount),
      translateType(t.type),
      escapeCSV(t.category || ''),
      translatePaymentMethod(t.payment_method),
      escapeCSV(t.accounts?.name || t.cards?.name || ''),
      t.is_installment ? 'Sim' : 'Não',
      t.installment_count || '',
      t.is_alimony ? 'Sim' : 'Não',
      formatDate(t.created_at),
      formatDate(t.updated_at),
      t.deleted_at ? 'Excluído' : 'Ativo'
    ]);

    // Montar CSV com BOM para suporte a caracteres especiais no Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\r\n');

    // Gerar nome do arquivo
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `transacoes_${dateStr}.csv`;

    // Configurar headers para download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('Erro na exportação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno: ' + error.message
    });
  }
}
