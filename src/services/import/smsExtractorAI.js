/**
 * SMS/Text Transaction Extractor with AI Enhancement
 * Extracts transaction data from SMS notifications using AI
 */

/**
 * Parse Brazilian currency format
 * @param {string} amountStr - Amount string
 * @returns {number} Parsed amount
 */
const parseAmount = (amountStr) => {
  if (!amountStr) return 0;
  
  let cleaned = amountStr.replace(/R?\$?\s*/g, '');
  
  const hasCommaDecimal = /\d+\.\d{3},\d{2}/.test(cleaned);
  const hasDotDecimal = /\d+,\d{3}\.\d{2}/.test(cleaned);
  
  if (hasCommaDecimal) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasDotDecimal) {
    cleaned = cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  return parseFloat(cleaned) || 0;
};

/**
 * Parse date from SMS format
 * @param {string} dateStr - Date string (DD/MM or DD/MM/YYYY)
 * @returns {string} ISO date string
 */
const parseDate = (dateStr) => {
  if (!dateStr) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
  
  const parts = dateStr.split('/');
  const today = new Date();
  
  if (parts.length === 2) {
    const [day, month] = parts;
    return `${today.getFullYear()}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } else if (parts.length === 3) {
    const [day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return today.toISOString().split('T')[0];
};

/**
 * Extract card last digits from SMS
 * @param {string} text - SMS text
 * @returns {string|null} Last 4 digits or null
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
 * Extract card last digits from SMS
 * @param {string} text - SMS text
 * @returns {string|null} Last 4 digits or null
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
 * Extract transaction data from SMS using AI
 * @param {string} smsText - SMS text
 * @param {Object} aiConfig - AI configuration with provider and apiKey
 * @param {Array} cards - User's credit cards for matching
 * @returns {Promise<Object>} Extracted transaction data
 */
export const extractFromSMSWithAI = async (smsText, aiConfig, cards = []) => {
  if (!aiConfig || !aiConfig.apiKey) {
    throw new Error('Configuração de IA não fornecida');
  }

  const cardDigitsList = cards.flatMap(card => {
    const digits = [card.last_digits];
    if (card.last_digits_list && Array.isArray(card.last_digits_list)) {
      digits.push(...card.last_digits_list);
    }
    return digits.filter(d => d);
  });

  const prompt = `Você é um assistente especializado em extrair dados de transações financeiras de mensagens SMS bancárias brasileiras.

Analise o seguinte SMS e extraia as informações da transação:

"""
${smsText}
"""

Cartões cadastrados (últimos 4 dígitos): ${cardDigitsList.length > 0 ? cardDigitsList.join(', ') : 'Nenhum'}

Retorne APENAS um objeto JSON válido com os seguintes campos:
{
  "description": "descrição do estabelecimento ou beneficiário (extraia o nome do estabelecimento sem prefixos ou sufixos como 'em', 'no', etc.)",
  "amount": valor numérico da transação,
  "date": "data no formato YYYY-MM-DD",
  "type": "expense" ou "income" ou "investment",
  "category": "categoria sugerida (alimentacao, transporte, compras, saude, lazer, salario, outros)",
  "card_last_digits": "últimos 4 dígitos do cartão se mencionado, ou null",
  "card_id": "ID do cartão se os dígitos corresponderem a um cartão cadastrado, ou null",
  "installments": número de parcelas se mencionado ou 1,
  "confidence": score de confiança de 0 a 100,
  "bank_name": "nome do banco remetente do SMS (CAIXA, Nubank, etc.) ou null"
}

IMPORTANTE:
- Extraia o nome do estabelecimento de forma limpa (ex: "LA BRASILERIE" em vez de "em LA BRASILERIE")
- Para estabelecimentos de alimentação (restaurantes, padarias, lanchonetes, etc.), use categoria "alimentacao"
- Se os últimos 4 dígitos do cartão corresponderem a algum dos cartões cadastrados, use o card_id correspondente
- Para PIX recebido, type deve ser "income"
- Para PIX enviado ou compras, type deve ser "expense"
- Valores devem ser numéricos (sem R$ ou formatação)
- Datas devem estar no formato YYYY-MM-DD
- Se a data tiver apenas DD/MM, use o ano atual (${new Date().getFullYear()})
- Datas no formato DD/MM significam dia/mês (ex: 09/10 = 9 de outubro, não 10 de setembro)
- Retorne APENAS o JSON, sem texto adicional`;

  try {
    let response;
    
    if (aiConfig.provider === 'openai' || aiConfig.provider === 'chatgpt') {
      response = await callOpenAI(prompt, aiConfig.apiKey, aiConfig.model || 'gpt-4.1-mini');
    } else if (aiConfig.provider === 'gemini') {
      response = await callGemini(prompt, aiConfig.apiKey, aiConfig.model || 'gemini-2.5-flash');
    } else if (aiConfig.provider === 'claude') {
      response = await callClaude(prompt, aiConfig.apiKey, aiConfig.model || 'claude-3-5-sonnet-20241022');
    } else {
      throw new Error(`Provedor de IA não suportado: ${aiConfig.provider}`);
    }

    // Parse JSON response
    let jsonText = response.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const extracted = JSON.parse(jsonText);
    
    // Match card_id based on last_digits
    if (extracted.card_last_digits && !extracted.card_id) {
      const matchedCard = cards.find(card => {
        if (card.last_digits === extracted.card_last_digits) return true;
        if (card.last_digits_list && card.last_digits_list.includes(extracted.card_last_digits)) return true;
        return false;
      });
      
      if (matchedCard) {
        extracted.card_id = matchedCard.id;
      }
    }
    
    return {
      ...extracted,
      date: extracted.date || parseDate(null),
      amount: typeof extracted.amount === 'number' ? extracted.amount : parseAmount(String(extracted.amount)),
      confidence: extracted.confidence || 85,
      source: 'ai',
      rawText: smsText
    };
    
  } catch (error) {
    console.error('Erro ao extrair com IA:', error);
    // Fallback to basic extraction
    return extractFromSMSBasic(smsText, cards);
  }
};

/**
 * Basic SMS extraction without AI (fallback)
 * @param {string} smsText - SMS text
 * @param {Array} cards - User's credit cards
 * @returns {Object} Extracted transaction data
 */
const extractFromSMSBasic = (smsText, cards = []) => {
  const text = smsText.trim();
  
  // Extract bank name
  const bankMatch = text.match(/^(CAIXA|CEF|Nubank|Nu|Banco\s+do\s+Brasil|BB|Bradesco|Itau|Itaú|Santander|Inter)/i);
  const bankName = bankMatch ? bankMatch[1].toUpperCase() : null;
  
  // Extract amount
  const amountMatch = text.match(/R\$?\s*([\d.,\s]+?)(?:\s+em|\s+\d{1,2}\/|$)/);
  const amount = amountMatch ? parseAmount(amountMatch[1]) : 0;
  
  // Extract date (DD/MM format is standard in Brazil)
  const dateMatch = text.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
  const date = dateMatch ? parseDate(dateMatch[1]) : parseDate(null);
  
  // Extract description - improved patterns to better extract establishment names
  let description = 'Transação';
  const descPatterns = [
    // CAIXA format: "Compra aprovada LA BRASILERIE R$"
    /Compra\s+aprovada\s+(?:em\s+)?([A-Z][A-Z\s]+?)(?:\s+R\$|\s+\d{1,2}\/)/i,
    // Generic: "em ESTABELECIMENTO R$"
    /(?:em|no)\s+([A-Z][A-Z\s]+?)(?:\s+R\$|\s+\d{1,2}\/)/i,
    // PIX: "para NOME"
    /para\s+([A-Z][A-Za-z\s]+?)(?:\s+em|\s+R\$)/i,
    // PIX received: "de NOME"
    /de\s+([A-Z][A-Za-z\s]+?)(?:\s+em|\s+R\$)/i
  ];
  
  for (const pattern of descPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      description = match[1].trim();
      break;
    }
  }
  
  // Determine type
  let type = 'expense';
  if (/recebeu|recebido|cr[ée]dito|sal[aá]rio/i.test(text)) {
    type = 'income';
  } else if (/aplica[çc][aã]o|investimento|resgate/i.test(text)) {
    type = 'investment';
  }
  
  // Extract card digits
  const cardDigits = extractCardDigits(text);
  let cardId = null;
  
  if (cardDigits) {
    const matchedCard = cards.find(card => {
      if (card.last_digits === cardDigits) return true;
      if (card.last_digits_list && card.last_digits_list.includes(cardDigits)) return true;
      return false;
    });
    
    if (matchedCard) {
      cardId = matchedCard.id;
    }
  }
  
  // Extract installments
  const installmentsMatch = text.match(/em\s+(\d+)\s+vezes/i);
  const installments = installmentsMatch ? parseInt(installmentsMatch[1]) : 1;
  
  // Categorize based on description
  let category = 'outros';
  const descLower = description.toLowerCase();
  if (/(restaurante|lanchonete|padaria|brasilerie|pizzaria|bar|cafe|food)/i.test(descLower)) {
    category = 'alimentacao';
  } else if (/(uber|99|taxi|posto|gasolina)/i.test(descLower)) {
    category = 'transporte';
  } else if (/(farmacia|hospital|clinica|drogaria)/i.test(descLower)) {
    category = 'saude';
  }
  
  return {
    description,
    amount,
    date,
    type,
    category,
    card_last_digits: cardDigits,
    card_id: cardId,
    installments,
    confidence: 60,
    source: 'basic',
    rawText: text,
    bank_name: bankName
  };
};

/**
 * Call OpenAI API
 */
const callOpenAI = async (prompt, apiKey, model) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'Você é um assistente especializado em extrair dados estruturados de mensagens SMS bancárias.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 500
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
};

/**
 * Call Google Gemini API
 */
const callGemini = async (prompt, apiKey, model) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};

/**
 * Call Anthropic Claude API
 */
const callClaude = async (prompt, apiKey, model) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 500,
      temperature: 0.1,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
};

/**
 * Extract multiple transactions from text
 * @param {string} text - Text containing multiple SMS messages
 * @param {Object} aiConfig - AI configuration
 * @param {Array} cards - User's credit cards
 * @returns {Promise<Array>} Array of extracted transactions
 */
export const extractMultipleFromText = async (text, aiConfig, cards = []) => {
  // Split by common SMS separators
  const messages = text.split(/\n\n+|\r\n\r\n+/).filter(msg => msg.trim().length > 10);
  
  const transactions = [];
  
  for (const message of messages) {
    try {
      const extracted = await extractFromSMSWithAI(message, aiConfig, cards);
      if (extracted && extracted.amount > 0) {
        transactions.push(extracted);
      }
    } catch (error) {
      console.error('Erro ao extrair transação:', error);
    }
  }
  
  return transactions;
};

export default {
  extractFromSMSWithAI,
  extractMultipleFromText
};
