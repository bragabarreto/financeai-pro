/**
 * SMS/Text Transaction Extractor
 * Extracts transaction data from SMS notifications and text messages
 * 
 * Format example: CAIXA[Banco]: Compra aprovada LA BRASILERIE [Estabelecimento]R$ 47,20[Valor]09/10[data DD/MM]as 06:49, ELO final 1527[dados do cartao]
 */

/**
 * Extract bank name from SMS
 * @param {string} text - SMS text
 * @returns {string|null} Bank name
 */
const extractBankName = (text) => {
  const bankPatterns = [
    /^(CAIXA|CEF|Nubank|Nu|Banco\s+do\s+Brasil|BB|Bradesco|Itau|Itaú|Santander|Inter)/i
  ];
  
  for (const pattern of bankPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
};

/**
 * Extract card last digits from SMS
 * @param {string} text - SMS text
 * @returns {string|null} Last 4 digits
 */
const extractCardDigits = (text) => {
  const patterns = [
    /final\s+(\d{4})/i,
    /cart[aã]o\s+(?:final\s+)?(\d{4})/i,
    /\*{4}\s*(\d{4})/,
    /(\d{4})(?:\s*$|\s+[^0-9])/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Common SMS patterns for Brazilian banks
 */
const SMS_PATTERNS = {
  // CAIXA: Compra aprovada COLSANTACECIL R$ 450,00 06/10 às 16:45, ELO VIRTUAL final 6539
  // CAIXA: Compra aprovada em RAFAEL FERNANDES SALE R$ 457,00 em 2 vezes, 06/10 as 19:55
  // CAIXA: Compra aprovada LA BRASILERIE R$ 47,20 09/10 as 06:49, ELO final 1527
  caixa: {
    pattern: /(?:CAIXA|CEF):\s*Compra\s+aprovada\s+(?:em\s+)?(.*?)\s+R?\$?\s*([\d.,\s]+)(?:\s+em\s+\d+\s+vezes?,?)?\s+(\d{1,2}\/\d{1,2})\s+[aà]s\s+(\d{1,2}:\d{2})/i,
    type: 'expense',
    paymentMethod: 'credit_card'
  },
  // Santander (sem prefixo do banco):
  // "Compra no cartão final 0405, de R$ 66,00, em 17/10/25, às 18:53, em COMERCIAL CASA, aprovada."
  // Captura dígitos do cartão, valor, data, hora e estabelecimento
  santander_card: {
    pattern: /Compra\s+no\s+cart[aã]o\s+final\s+(\d{4})\s*,?\s*de\s+R?\$?\s*([\d.,]+)\s*,?\s*em\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*,?\s*(?:[aà]s|as)\s+(\d{1,2}:\d{2})\s*,?\s*em\s+(.+?)(?:[,.]\s*)?(?:aprovad[ao])?/i,
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
    pattern: /(?:Transfer[êe]ncia|TED|DOC).*?R?\$?\s*([\d.,]+).*?(?:em|no)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
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
 * Parse date from SMS (Brazilian DD/MM format)
 * @param {string} dateStr - Date string in DD/MM or DD/MM/YYYY format
 * @param {string} timeStr - Time string (optional, HH:MM format)
 * @returns {string|null} ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS), or null if not found
 */
const parseDate = (dateStr, timeStr = '') => {
  if (!dateStr) {
    return null; // Return null instead of current date to allow user to fill manually
  }
  
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Parse DD/MM/YYYY or DD-MM-YYYY
  const matchWithYear = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (matchWithYear) {
    const day = matchWithYear[1].padStart(2, '0');
    const month = matchWithYear[2].padStart(2, '0');
    let year = matchWithYear[3];
    
    // Handle 2-digit year
    if (year.length === 2) {
      year = `20${year}`;
    }
    
    if (timeStr) {
      return `${year}-${month}-${day}T${timeStr}:00`;
    }
    
    return `${year}-${month}-${day}`;
  }
  
  // Parse DD/MM or DD-MM (without year)
  const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    
    // Use current year
    if (timeStr) {
      return `${currentYear}-${month}-${day}T${timeStr}:00`;
    }
    
    return `${currentYear}-${month}-${day}`;
  }
  
  // Return null if no date pattern matched (let user fill manually)
  return null;
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
  
  // Extract bank name and card digits for metadata
  const bankName = extractBankName(text);
  const cardDigits = extractCardDigits(text);
  
  // Try each pattern
  for (const [patternName, config] of Object.entries(SMS_PATTERNS)) {
    const match = text.match(config.pattern);
    
    if (match) {
      let transaction = {
        type: config.type,
        payment_method: config.paymentMethod,
        origin: 'sms_import',
        raw_text: text.substring(0, 200), // Store original for reference
        bank_name: bankName, // Add bank metadata
        card_last_digits: cardDigits // Add card metadata
      };
      
      // Extract based on pattern type
      if (patternName === 'caixa') {
        transaction.description = cleanDescription(match[1]);
        transaction.amount = parseAmount(match[2]);
        transaction.date = parseDate(match[3], match[4]);
      } else if (patternName === 'santander_card') {
        // For Santander SMS without explicit bank prefix, derive fields from groups
        // match[1]=card last 4, [2]=amount, [3]=date, [4]=time, [5]=merchant
        transaction.card_last_digits = match[1];
        transaction.amount = parseAmount(match[2]);
        transaction.date = parseDate(match[3], match[4]);
        transaction.description = cleanDescription(match[5]);
        // If bank name was not detected by prefix, set to SANTANDER for clarity
        if (!transaction.bank_name) {
          transaction.bank_name = 'SANTANDER';
        }
      } else if (patternName === 'nubank') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = cleanDescription(match[2]);
        transaction.date = match[3] ? parseDate(match[3]) : parseDate('');
      } else if (patternName === 'pix_received' || patternName === 'pix_sent') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = cleanDescription(match[2] || 'Transferência PIX');
        transaction.date = match[3] ? parseDate(match[3], match[4]) : parseDate('');
      } else if (patternName === 'salary') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = 'Salário';
        transaction.date = parseDate('');
      } else if (patternName === 'investment_application') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = 'Aplicação em Investimento';
        transaction.date = parseDate('');
      } else if (patternName === 'investment_redemption') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = 'Resgate de Investimento';
        transaction.date = parseDate('');
      } else if (patternName === 'transfer') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = 'Transferência Bancária';
        transaction.date = match[2] ? parseDate(match[2]) : parseDate('');
      } else if (patternName === 'generic_purchase' || patternName === 'debit') {
        transaction.amount = parseAmount(match[1]);
        transaction.description = cleanDescription(match[2] || 'Transação');
        transaction.date = match[3] ? parseDate(match[3]) : parseDate('');
      } else if (patternName === 'generic_amount') {
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
