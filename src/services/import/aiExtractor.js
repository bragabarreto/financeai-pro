/**
 * AI-powered data extraction service
 * Uses pattern matching and intelligent field detection
 * to extract financial transaction data from various formats
 */

/**
 * Common field patterns for transaction data
 */
const FIELD_PATTERNS = {
  date: {
    keywords: ['data', 'date', 'dt', 'dia', 'vencimento', 'lancamento'],
    patterns: [
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,  // DD/MM/YYYY or DD-MM-YYYY
      /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/,    // YYYY-MM-DD
      /\d{1,2}\s+\w+\s+\d{4}/               // DD Month YYYY
    ]
  },
  amount: {
    keywords: ['valor', 'amount', 'quantia', 'total', 'preco', 'preço', 'debito', 'credito', 'saldo'],
    patterns: [
      /R?\$?\s*[\d.,]+/,                     // R$ 1.234,56 or 1234.56
      /[\d.,]+/                              // Simple numbers
    ]
  },
  description: {
    keywords: ['descricao', 'descrição', 'description', 'historico', 'histórico', 'memo', 'nome', 'estabelecimento']
  },
  category: {
    keywords: ['categoria', 'category', 'tipo', 'classificacao', 'classificação']
  },
  type: {
    keywords: ['tipo', 'type', 'operacao', 'operação', 'natureza'],
    values: {
      expense: ['debito', 'débito', 'saida', 'saída', 'despesa', 'gasto', 'expense', 'debit', '-'],
      income: ['credito', 'crédito', 'entrada', 'receita', 'income', 'credit', '+']
    }
  }
};

/**
 * Detect field mapping from column headers
 * @param {Array} headers - Column headers from file
 * @returns {Object} Field mapping
 */
export const detectFieldMapping = (headers) => {
  const mapping = {
    date: null,
    amount: null,
    description: null,
    category: null,
    type: null
  };

  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    
    // Check for date field
    if (!mapping.date && FIELD_PATTERNS.date.keywords.some(kw => normalizedHeader.includes(kw))) {
      mapping.date = header;
    }
    
    // Check for amount field
    if (!mapping.amount && FIELD_PATTERNS.amount.keywords.some(kw => normalizedHeader.includes(kw))) {
      mapping.amount = header;
    }
    
    // Check for description field
    if (!mapping.description && FIELD_PATTERNS.description.keywords.some(kw => normalizedHeader.includes(kw))) {
      mapping.description = header;
    }
    
    // Check for category field
    if (!mapping.category && FIELD_PATTERNS.category.keywords.some(kw => normalizedHeader.includes(kw))) {
      mapping.category = header;
    }
    
    // Check for type field
    if (!mapping.type && FIELD_PATTERNS.type.keywords.some(kw => normalizedHeader.includes(kw))) {
      mapping.type = header;
    }
  });

  return mapping;
};

/**
 * Parse date from various formats
 * @param {String} dateString - Date string to parse
 * @returns {String} ISO date string (YYYY-MM-DD)
 */
export const parseDate = (dateString) => {
  if (!dateString) return null;

  const dateStr = String(dateString).trim();
  
  // Try YYYY-MM-DD first (more specific pattern)
  const isoFormat = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoFormat) {
    const [, year, month, day] = isoFormat;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const brFormat = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (brFormat) {
    let [, day, month, year] = brFormat;
    year = year.length === 2 ? `20${year}` : year;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try to parse as JS Date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
};

/**
 * Parse amount from various formats
 * @param {String|Number} amountString - Amount to parse
 * @returns {Number} Parsed amount
 */
export const parseAmount = (amountString) => {
  if (typeof amountString === 'number') return Math.abs(amountString);
  if (!amountString) return 0;

  let amountStr = String(amountString).trim();
  
  // Remove currency symbols and spaces
  amountStr = amountStr.replace(/[R$\s]/g, '');
  
  // Check if negative (for expenses)
  const isNegative = amountStr.includes('-') || amountStr.startsWith('(');
  
  // Remove parentheses and minus signs
  amountStr = amountStr.replace(/[\(\)\-]/g, '');
  
  // Handle Brazilian format (1.234,56) vs US format (1,234.56)
  const hasCommaDecimal = /\d,\d{2}$/.test(amountStr);
  
  if (hasCommaDecimal) {
    // Brazilian format: 1.234,56 -> 1234.56
    amountStr = amountStr.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: 1,234.56 -> 1234.56
    amountStr = amountStr.replace(/,/g, '');
  }
  
  const amount = parseFloat(amountStr);
  return isNaN(amount) ? 0 : Math.abs(amount);
};

/**
 * Detect transaction type from value or type field
 * @param {String} typeField - Type field value
 * @param {Number} amount - Transaction amount
 * @returns {String} Transaction type: 'income' or 'expense'
 */
export const detectTransactionType = (typeField, amount) => {
  if (!typeField) {
    // If no type field, assume negative amounts are expenses
    return amount < 0 ? 'expense' : 'income';
  }

  const normalizedType = String(typeField).toLowerCase().trim();
  
  // Check for income indicators
  if (FIELD_PATTERNS.type.values.income.some(val => normalizedType.includes(val))) {
    return 'income';
  }
  
  // Check for expense indicators
  if (FIELD_PATTERNS.type.values.expense.some(val => normalizedType.includes(val))) {
    return 'expense';
  }
  
  // Default: assume expense if negative, income if positive
  return amount < 0 ? 'expense' : 'income';
};

/**
 * Categorize transaction based on description
 * @param {String} description - Transaction description
 * @returns {String} Suggested category
 */
export const categorizeTransaction = (description) => {
  if (!description) return 'outros';

  const desc = description.toLowerCase();
  
  // Shopping (check before food to catch "mercado livre")
  if (/(shopping|loja|magazine|mercado\s*livre|amazon|shopee)/i.test(desc)) {
    return 'compras';
  }
  
  // Food & Dining
  if (/(restaurante|lanchonete|padaria|mercado|supermercado|ifood|uber\s*eats|rappi)/i.test(desc)) {
    return 'alimentacao';
  }
  
  // Transportation
  if (/(uber|99|taxi|combustivel|gasolina|posto|estacionamento|pedagio|pedágio)/i.test(desc)) {
    return 'transporte';
  }
  
  // Bills & Utilities
  if (/(luz|energia|agua|água|internet|telefone|celular|conta|fatura)/i.test(desc)) {
    return 'contas';
  }
  
  // Health
  if (/(farmacia|farmácia|hospital|clinica|clínica|medico|médico|plano\s*de?\s*saude|plano\s*de?\s*saúde)/i.test(desc)) {
    return 'saude';
  }
  
  // Entertainment
  if (/(cinema|teatro|netflix|spotify|show|evento|ingresso)/i.test(desc)) {
    return 'lazer';
  }
  
  // Salary
  if (/(salario|salário|pagamento|vencimento|folha)/i.test(desc)) {
    return 'salario';
  }
  
  return 'outros';
};

/**
 * Calculate confidence score for extracted data
 * @param {Object} transaction - Extracted transaction
 * @returns {Number} Confidence score (0-100)
 */
export const calculateConfidence = (transaction) => {
  let score = 0;
  
  // Date present and valid
  if (transaction.date && parseDate(transaction.date)) {
    score += 30;
  }
  
  // Amount present and valid
  if (transaction.amount && transaction.amount > 0) {
    score += 30;
  }
  
  // Description present
  if (transaction.description && transaction.description.trim().length > 0) {
    score += 20;
  }
  
  // Type detected
  if (transaction.type) {
    score += 10;
  }
  
  // Category detected
  if (transaction.category) {
    score += 10;
  }
  
  return Math.min(score, 100);
};

/**
 * Extract transactions from parsed data
 * @param {Array} data - Parsed file data
 * @param {Object} mapping - Field mapping (optional, will auto-detect if not provided)
 * @returns {Array} Extracted transactions with metadata
 */
export const extractTransactions = (data, mapping = null) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  // Auto-detect field mapping if not provided
  const headers = Object.keys(data[0]);
  const fieldMapping = mapping || detectFieldMapping(headers);
  
  const transactions = data.map((row, index) => {
    const description = row[fieldMapping.description] || row[headers.find(h => h.toLowerCase().includes('desc'))] || '';
    const rawAmount = row[fieldMapping.amount] || row[headers.find(h => h.toLowerCase().includes('valor'))] || 0;
    const amount = parseAmount(rawAmount);
    const typeField = row[fieldMapping.type] || '';
    
    const transaction = {
      originalIndex: index,
      date: parseDate(row[fieldMapping.date] || row[headers.find(h => h.toLowerCase().includes('data'))]),
      description: String(description).trim(),
      amount: amount,
      type: detectTransactionType(typeField, amount),
      category: row[fieldMapping.category] || categorizeTransaction(description),
      rawData: row
    };
    
    transaction.confidence = calculateConfidence(transaction);
    
    return transaction;
  });
  
  // Filter out invalid transactions
  return transactions.filter(t => t.date && t.amount > 0);
};

/**
 * Validate extracted transactions
 * @param {Array} transactions - Extracted transactions
 * @returns {Object} Validation result with errors
 */
export const validateTransactions = (transactions) => {
  const errors = [];
  const warnings = [];
  
  transactions.forEach((transaction, index) => {
    // Check required fields
    if (!transaction.date) {
      errors.push({
        index,
        field: 'date',
        message: `Linha ${index + 1}: Data inválida ou ausente`
      });
    }
    
    if (!transaction.amount || transaction.amount <= 0) {
      errors.push({
        index,
        field: 'amount',
        message: `Linha ${index + 1}: Valor inválido ou ausente`
      });
    }
    
    if (!transaction.description || transaction.description.length === 0) {
      warnings.push({
        index,
        field: 'description',
        message: `Linha ${index + 1}: Descrição ausente`
      });
    }
    
    // Check confidence score
    if (transaction.confidence < 50) {
      warnings.push({
        index,
        field: 'confidence',
        message: `Linha ${index + 1}: Baixa confiança na extração (${transaction.confidence}%)`
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalTransactions: transactions.length,
    validTransactions: transactions.filter(t => t.confidence >= 50).length
  };
};
