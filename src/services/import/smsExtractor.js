/**
 * SMS/Text Transaction Extractor
 * Extracts transaction data from SMS notifications and text messages
 */

/**
 * Common SMS patterns for Brazilian banks
 */
const SMS_PATTERNS = {
  // CAIXA: Compra aprovada COLSANTACECIL R$ 450,00 06/10 às 16:45, ELO VIRTUAL final 6539
  // CAIXA: Compra aprovada em RAFAEL FERNANDES SALE R$ 457,00 em 2 vezes, 06/10 as 19:55
  caixa: {
    pattern: /(?:CAIXA|CEF):\s*Compra\s+aprovada\s+(?:em\s+)?(.*?)\s+R?\$?\s*([\d.,\s]+)(?:\s+em\s+\d+\s+vezes?,?)?\s+(\d{1,2}\/\d{1,2})\s+[aà]s\s+(\d{1,2}:\d{2})/i,
    type: 'expense',
    paymentMethod: 'credit_card'
  },
  // Nubank: Compra aprovada: R$ 150,00 em RESTAURANTE XYZ em 15/03
  nubank: {
    pattern: /(?:Nubank|Nu).*?Compra\s+(?:aprovada|realizada)[:\s]+R?\$?\s*([\d.,]+)\s+(?:em|no)\s+([^0-9]+?)(?:\s+em\s+(\d{1,2}\/\d{1,2}))?$/i,
    type: 'expense',
    paymentMethod: 'credit_card'
  },
  // PIX: Você recebeu um Pix de R$ 250,00 de João Silva em 10/03 às 14:30
  pix_received: {
    pattern: /recebeu.*?Pix.*?R?\$?\s*([\d.,]+)\s+de\s+(.+?)\s+em/i,
    type: 'income',
    paymentMethod: 'pix'
  },
  // PIX: Você enviou um Pix de R$ 100,00 para Maria Santos em 10/03 às 10:15
  pix_sent: {
    pattern: /(?:enviou|transferiu).*?Pix.*?R?\$?\s*([\d.,]+)\s+para\s+(.+?)\s+em/i,
    type: 'expense',
    paymentMethod: 'pix'
  },
  // Salary/Income: Salário, Crédito salarial, etc.
  salary: {
    pattern: /(?:sal[aá]rio|cr[ée]dito\s+salarial|pagamento\s+sal[aá]rio).*?R?\$?\s*([\d.,]+)/i,
    type: 'income',
    paymentMethod: 'transfer'
  },
  // Investment application: Aplicação, Investimento
  investment_application: {
    pattern: /(?:aplica[çc][aã]o|investimento).*?R?\$?\s*([\d.,]+)/i,
    type: 'investment',
    paymentMethod: 'application'
  },
  // Investment redemption: Resgate
  investment_redemption: {
    pattern: /resgate.*?R?\$?\s*([\d.,]+)/i,
    type: 'investment',
    paymentMethod: 'redemption'
  },
  // Generic card transaction: Compra de R$ 89,90 em LOJA ABC em 12/03
  generic_purchase: {
    pattern: /Compra.*?R?\$?\s*([\d.,]+)\s+(?:em|no)\s+(.*?)(?:\s+em\s+(\d{1,2}\/\d{1,2}))?/i,
    type: 'expense',
    paymentMethod: 'debit_card'
  },
  // TED/DOC: Transferência de R$ 500,00 para Conta 1234-5 em 08/03
  transfer: {
    pattern: /(?:Transfer[êe]ncia|TED|DOC).*?R?\$?\s*([\d.,]+)(?:.*?para\s+(.*?))?(?:\s+em\s+(\d{1,2}\/\d{1,2}))?/i,
    type: 'expense',
    paymentMethod: 'transfer'
  },
  // Débito: Débito de R$ 45,00 em ESTABELECIMENTO em 05/03
  debit: {
    pattern: /D[ée]bito.*?R?\$?\s*([\d.,]+)\s+(?:em|no)\s+(.*?)(?:\s+em\s+(\d{1,2}\/\d{1,2}))?/i,
    type: 'expense',
    paymentMethod: 'debit_card'
  },
  // Generic amount pattern as fallback
  generic_amount: {
    pattern: /R?\$?\s*([\d.,]+)/,
    type: 'expense',
    paymentMethod: null
  }
};

/**
 * Parse Brazilian currency format
 * @param {string} amountStr - Amount string (e.g., "1.234,56" or "1234.56")
 * @returns {number} Parsed amount
 */
const parseAmount = (amountStr) => {
  if (!amountStr) return 0;
  
  // Remove R$ and spaces
  let cleaned = amountStr.replace(/R?\$?\s*/g, '');
  
  // Check if it's Brazilian format (1.234,56) or US format (1,234.56)
  const hasCommaDecimal = /\d+\.\d{3},\d{2}/.test(cleaned);
  const hasDotDecimal = /\d+,\d{3}\.\d{2}/.test(cleaned);
  
  if (hasCommaDecimal) {
    // Brazilian format: remove dots, replace comma with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasDotDecimal) {
    // US format: remove commas
    cleaned = cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    // Simple comma decimal
    cleaned = cleaned.replace(',', '.');
  }
  
  return parseFloat(cleaned) || 0;
};

/**
 * Parse date from SMS (usually DD/MM format)
 * @param {string} dateStr - Date string
 * @param {string} timeStr - Time string (optional)
 * @returns {string} ISO date string
 */
const parseDate = (dateStr, timeStr = '') => {
  if (!dateStr) {
    return new Date().toISOString().split('T')[0];
  }
  
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Parse DD/MM
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    
    // If time is provided, include it
    if (timeStr) {
      return `${currentYear}-${month}-${day}T${timeStr}:00`;
    }
    
    return `${currentYear}-${month}-${day}`;
  }
  
  return new Date().toISOString().split('T')[0];
};

/**
 * Clean and normalize description
 * @param {string} description - Raw description
 * @returns {string} Cleaned description
 */
const cleanDescription = (description) => {
  if (!description) return '';
  
  return description
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/['"]/g, '')
    .substring(0, 100); // Limit length
};

/**
 * Extract transaction from SMS text
 * @param {string} smsText - SMS message text
 * @returns {Object|null} Extracted transaction or null
 */
export const extractFromSMS = (smsText) => {
  if (!smsText || typeof smsText !== 'string') {
    return null;
  }
  
  const text = smsText.trim();
  
  // Try each pattern
  for (const [bankName, config] of Object.entries(SMS_PATTERNS)) {
    const match = text.match(config.pattern);
    
    if (match) {
      let transaction = {
        type: config.type,
        payment_method: config.paymentMethod,
        origin: 'sms_import',
        raw_text: text.substring(0, 200) // Store original for reference
      };
      
      // Extract based on pattern type
      if (bankName === 'caixa') {
        transaction.description = cleanDescription(match[1]);
        transaction.amount = parseAmount(match[2]);
        transaction.date = parseDate(match[3], match[4]);
      } else if (bankName === 'nubank') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = cleanDescription(match[2]);
        transaction.date = match[3] ? parseDate(match[3]) : parseDate('');
      } else if (bankName === 'pix_received' || bankName === 'pix_sent') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = cleanDescription(match[2] || 'Transferência PIX');
        transaction.date = match[3] ? parseDate(match[3], match[4]) : parseDate('');
      } else if (bankName === 'salary') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = 'Salário';
        transaction.date = parseDate('');
      } else if (bankName === 'investment_application') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = 'Aplicação em Investimento';
        transaction.date = parseDate('');
      } else if (bankName === 'investment_redemption') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = 'Resgate de Investimento';
        transaction.date = parseDate('');
      } else if (bankName === 'generic_purchase' || bankName === 'debit' || bankName === 'transfer') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = cleanDescription(match[2] || 'Transação');
        transaction.date = match[3] ? parseDate(match[3]) : parseDate('');
      } else if (bankName === 'generic_amount') {
        // Fallback for generic amount detection
        transaction.amount = parseAmount(match[1]);
        transaction.description = 'Transação importada de SMS';
        transaction.date = parseDate('');
      }
      
      // Validate that we have at least amount
      if (transaction.amount > 0) {
        return transaction;
      }
    }
  }
  
  return null;
};

/**
 * Extract multiple transactions from text (separated by newlines)
 * @param {string} text - Text containing one or more SMS messages
 * @returns {Array} Array of extracted transactions
 */
export const extractMultipleFromText = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Split by newlines and process each line as potential SMS
  const lines = text.split(/\n+/).filter(line => line.trim().length > 10);
  const transactions = [];
  
  for (const line of lines) {
    const transaction = extractFromSMS(line);
    if (transaction) {
      transactions.push(transaction);
    }
  }
  
  return transactions;
};

/**
 * Calculate confidence score for SMS extraction
 * @param {Object} transaction - Extracted transaction
 * @returns {number} Confidence score (0-100)
 */
export const calculateSMSConfidence = (transaction) => {
  let score = 0;
  
  // Has valid amount
  if (transaction.amount && transaction.amount > 0) {
    score += 40;
  }
  
  // Has description
  if (transaction.description && transaction.description.length > 3) {
    score += 25;
  }
  
  // Has payment method detected
  if (transaction.payment_method) {
    score += 15;
  }
  
  // Has valid date
  if (transaction.date) {
    score += 10;
  }
  
  // Has type detected
  if (transaction.type) {
    score += 10;
  }
  
  return Math.min(score, 100);
};

/**
 * Validate SMS extraction result
 * @param {Array} transactions - Extracted transactions
 * @returns {Object} Validation result
 */
export const validateSMSExtraction = (transactions) => {
  const errors = [];
  const warnings = [];
  
  if (!Array.isArray(transactions)) {
    errors.push('Resultado de extração inválido');
    return { valid: false, errors, warnings };
  }
  
  if (transactions.length === 0) {
    warnings.push('Nenhuma transação foi detectada no texto fornecido');
  }
  
  transactions.forEach((t, index) => {
    if (!t.amount || t.amount <= 0) {
      warnings.push(`Transação ${index + 1}: valor inválido ou não detectado`);
    }
    
    if (!t.description || t.description.length < 3) {
      warnings.push(`Transação ${index + 1}: descrição não detectada ou muito curta`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validTransactions: transactions.filter(t => t.amount > 0).length,
    totalTransactions: transactions.length
  };
};
