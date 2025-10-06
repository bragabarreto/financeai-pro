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
      income: ['credito', 'crédito', 'entrada', 'receita', 'income', 'credit', '+'],
      investment: ['investimento', 'aplicacao', 'aplicação', 'resgate', 'investment', 'invest']
    }
  },
  paymentMethod: {
    keywords: ['meio', 'pagamento', 'payment', 'metodo', 'método', 'forma'],
    values: {
      credit_card: ['credito', 'crédito', 'credit card', 'cc'],
      debit_card: ['debito', 'débito', 'debit', 'cartao debito', 'cartão débito'],
      pix: ['pix'],
      transfer: ['transferencia', 'transferência', 'ted', 'doc', 'transfer'],
      bank_account: ['conta', 'account', 'banco', 'bank'],
      paycheck: ['contracheque', 'folha', 'salario', 'salário', 'paycheck']
    }
  },
  beneficiary: {
    keywords: ['beneficiario', 'beneficiário', 'favorecido', 'para', 'to', 'destino']
  },
  depositor: {
    keywords: ['depositante', 'origem', 'de', 'from', 'pagador']
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
    type: null,
    paymentMethod: null,
    beneficiary: null,
    depositor: null
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
    
    // Check for payment method field
    if (!mapping.paymentMethod && FIELD_PATTERNS.paymentMethod.keywords.some(kw => normalizedHeader.includes(kw))) {
      mapping.paymentMethod = header;
    }
    
    // Check for beneficiary field
    if (!mapping.beneficiary && FIELD_PATTERNS.beneficiary.keywords.some(kw => normalizedHeader.includes(kw))) {
      mapping.beneficiary = header;
    }
    
    // Check for depositor field
    if (!mapping.depositor && FIELD_PATTERNS.depositor.keywords.some(kw => normalizedHeader.includes(kw))) {
      mapping.depositor = header;
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
 * @param {String} beneficiary - Beneficiary information
 * @param {String} depositor - Depositor information
 * @param {String} userIdentifier - User identifier (name, CPF, etc.)
 * @returns {String} Transaction type: 'income', 'expense', or 'investment'
 */
export const detectTransactionType = (typeField, amount, beneficiary = '', depositor = '', userIdentifier = '') => {
  const normalizedType = typeField ? String(typeField).toLowerCase().trim() : '';
  const normalizedBeneficiary = beneficiary ? String(beneficiary).toLowerCase().trim() : '';
  const normalizedDepositor = depositor ? String(depositor).toLowerCase().trim() : '';
  const normalizedUser = userIdentifier ? String(userIdentifier).toLowerCase().trim() : '';
  
  // Check for investment indicators in type field
  if (FIELD_PATTERNS.type.values.investment.some(val => normalizedType.includes(val))) {
    return 'investment';
  }
  
  // Check if user is both depositor and beneficiary (investment)
  if (normalizedUser && normalizedBeneficiary && normalizedDepositor) {
    const userIsBeneficiary = normalizedBeneficiary.includes(normalizedUser);
    const userIsDepositor = normalizedDepositor.includes(normalizedUser);
    
    if (userIsBeneficiary && userIsDepositor) {
      return 'investment';
    }
  }
  
  // Check if user is beneficiary (income)
  if (normalizedUser && normalizedBeneficiary && normalizedBeneficiary.includes(normalizedUser)) {
    return 'income';
  }
  
  // Check for income indicators
  if (FIELD_PATTERNS.type.values.income.some(val => normalizedType.includes(val))) {
    return 'income';
  }
  
  // Check for expense indicators
  if (FIELD_PATTERNS.type.values.expense.some(val => normalizedType.includes(val))) {
    return 'expense';
  }
  
  // When type field is ambiguous or missing, use amount as a strong hint
  // Negative amount = expense, Positive amount = income
  // This is the most reliable indicator for bank statements
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
 * Detect payment method from description or payment method field
 * @param {String} paymentMethodField - Payment method field value
 * @param {String} description - Transaction description
 * @param {String} transactionType - Transaction type (expense, income, investment)
 * @returns {String|null} Detected payment method
 */
export const detectPaymentMethod = (paymentMethodField, description, transactionType) => {
  const normalizedPayment = paymentMethodField ? String(paymentMethodField).toLowerCase().trim() : '';
  const normalizedDesc = description ? String(description).toLowerCase().trim() : '';
  
  // Check payment method field first
  if (normalizedPayment) {
    if (FIELD_PATTERNS.paymentMethod.values.pix.some(val => normalizedPayment.includes(val))) {
      return 'pix';
    }
    // Check debit card before credit card to avoid false positives
    if (FIELD_PATTERNS.paymentMethod.values.debit_card.some(val => normalizedPayment.includes(val))) {
      return 'debit_card';
    }
    if (FIELD_PATTERNS.paymentMethod.values.credit_card.some(val => normalizedPayment.includes(val))) {
      return 'credit_card';
    }
    if (FIELD_PATTERNS.paymentMethod.values.transfer.some(val => normalizedPayment.includes(val))) {
      return 'transfer';
    }
    if (FIELD_PATTERNS.paymentMethod.values.paycheck.some(val => normalizedPayment.includes(val))) {
      return 'paycheck';
    }
    if (FIELD_PATTERNS.paymentMethod.values.bank_account.some(val => normalizedPayment.includes(val))) {
      return 'bank_account';
    }
  }
  
  // Try to infer from description
  if (normalizedDesc) {
    if (/(pix)/i.test(normalizedDesc)) {
      return 'pix';
    }
    // Check for debit card first (more specific pattern)
    if (/(cartao\s*debito|cartão\s*débito|debit\s*card)/i.test(normalizedDesc)) {
      return 'debit_card';
    }
    if (/(cartao|cartão|card|credito|crédito)/i.test(normalizedDesc) && !/(debito|débito|debit)/i.test(normalizedDesc)) {
      return 'credit_card';
    }
    if (/(ted|doc|transferencia|transferência)/i.test(normalizedDesc)) {
      return 'transfer';
    }
    if (/(contracheque|folha|salario|salário)/i.test(normalizedDesc)) {
      return 'paycheck';
    }
  }
  
  // Default based on transaction type
  if (transactionType === 'investment') {
    return null; // Will be selected manually
  }
  
  return null; // Needs manual selection
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
    score += 25;
  }
  
  // Amount present and valid
  if (transaction.amount && transaction.amount > 0) {
    score += 25;
  }
  
  // Description present
  if (transaction.description && transaction.description.trim().length > 0) {
    score += 20;
  }
  
  // Type detected
  if (transaction.type) {
    score += 15;
  }
  
  // Category detected
  if (transaction.category) {
    score += 10;
  }
  
  // Payment method detected
  if (transaction.payment_method) {
    score += 5;
  }
  
  return Math.min(score, 100);
};

/**
 * Extract transactions from parsed data
 * @param {Array} data - Parsed file data
 * @param {Object} mapping - Field mapping (optional, will auto-detect if not provided)
 * @param {String} userIdentifier - User identifier for type detection (optional)
 * @returns {Array} Extracted transactions with metadata
 */
export const extractTransactions = (data, mapping = null, userIdentifier = '') => {
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
    const beneficiary = row[fieldMapping.beneficiary] || '';
    const depositor = row[fieldMapping.depositor] || '';
    const paymentMethodField = row[fieldMapping.paymentMethod] || '';
    
    const transactionType = detectTransactionType(typeField, amount, beneficiary, depositor, userIdentifier);
    const paymentMethod = detectPaymentMethod(paymentMethodField, description, transactionType);
    
    const transaction = {
      originalIndex: index,
      date: parseDate(row[fieldMapping.date] || row[headers.find(h => h.toLowerCase().includes('data'))]),
      description: String(description).trim(),
      amount: amount,
      type: transactionType,
      category: row[fieldMapping.category] || categorizeTransaction(description),
      payment_method: paymentMethod,
      beneficiary: beneficiary ? String(beneficiary).trim() : null,
      depositor: depositor ? String(depositor).trim() : null,
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
