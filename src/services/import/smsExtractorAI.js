/**
 * SMS/Text Transaction Extractor with AI Enhancement
 * Extracts transaction data from SMS notifications using AI
 */

import { getTodayLocalDate } from '../../utils/dateUtils';

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
    return getTodayLocalDate();
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
  
  return getTodayLocalDate();
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
  "amount": valor numérico da transação POR PARCELA (se houver parcelamento, divida o valor total pelo número de parcelas),
  "date": "data no formato YYYY-MM-DD",
  "type": "expense" ou "income" ou "investment",
  "category": "categoria sugerida (alimentacao, transporte, compras, saude, lazer, contas, educacao, salario, outros)",
  "payment_method": "meio de pagamento (credit_card, debit_card, pix, transfer, boleto_bancario)",
  "card_last_digits": "últimos 4 dígitos do cartão se mencionado, ou null",
  "card_id": "ID do cartão se os dígitos corresponderem a um cartão cadastrado, ou null",
  "installments": número de parcelas se mencionado ou 1,
  "confidence": score de confiança de 0 a 100,
  "bank_name": "nome do banco remetente do SMS (CAIXA, Nubank, etc.) ou null"
}

REGRAS IMPORTANTES:
1. ESTABELECIMENTO/DESCRIÇÃO:
   - Extraia o nome do estabelecimento de forma limpa, removendo prefixos como "em", "no", "na"
   - Exemplo: "em LA BRASILERIE" → "LA BRASILERIE"
   - Exemplo: "no RESTAURANTE XYZ" → "RESTAURANTE XYZ"

2. CATEGORIZAÇÃO:
   - Restaurantes, padarias, lanchonetes, brasilerie, pizzaria, bar, café, food, açaí → "alimentacao"
   - Uber, taxi, posto, gasolina, estacionamento, pedágio → "transporte"
   - Farmácia, hospital, clínica, drogaria, plano de saúde → "saude"
   - Shopping, loja, magazine, Mercado Livre, Amazon → "compras"
   - Cinema, teatro, Netflix, Spotify, show, academia → "lazer"
   - Luz, energia, água, internet, telefone, celular → "contas"
   - Escola, faculdade, curso, livro → "educacao"
   - Salário, pagamento, vencimento, folha → "salario"

3. MEIO DE PAGAMENTO (payment_method):
   - Se o SMS contém "PIX" → "pix"
   - Se o SMS contém "débito" ou "debit" → "debit_card"
   - Se o SMS contém "transferência", "TED", "DOC" → "transfer"
   - Se o SMS contém "boleto" → "boleto_bancario"
   - PADRÃO (se nada acima for encontrado) → "credit_card"

4. PARCELAMENTO:
   - Se o SMS menciona "em 3 vezes" ou "3x", installments = 3
   - Se o valor individual da parcela está explícito (ex: "3x de R$ 100"), use esse valor em "amount"
   - Se apenas o número de parcelas está mencionado (ex: "R$ 300 em 3 vezes"), divida o valor total pelo número de parcelas
   - Exemplo: "R$ 457,00 em 2 vezes" → amount = 228.50, installments = 2

5. FORMATO DOS DADOS:
   - Valores devem ser numéricos (sem R$ ou formatação)
   - Datas devem estar no formato YYYY-MM-DD
   - Se a data tiver apenas DD/MM, use o ano atual (${new Date().getFullYear()})
   - Datas no formato DD/MM significam dia/mês (ex: 09/10 = 9 de outubro, não 10 de setembro)

6. TIPO DE TRANSAÇÃO:
   - PIX recebido → type = "income"
   - PIX enviado ou compras → type = "expense"
   - Salário → type = "income"

Retorne APENAS o JSON, sem texto adicional ou markdown.`;

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
  let amount = 0;
  if (amountMatch) {
    amount = parseAmount(amountMatch[1]);
  }
  
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
  
  // Extract installments and adjust amount
  const installmentsMatch = text.match(/em\s+(\d+)\s+vezes/i);
  const installments = installmentsMatch ? parseInt(installmentsMatch[1]) : 1;
  
  // If installments detected, divide the total amount
  if (installments > 1) {
    amount = amount / installments;
  }
  
  // Detect payment method with default to credit_card
  let paymentMethod = 'credit_card'; // Default
  if (/\bpix\b/i.test(text)) {
    paymentMethod = 'pix';
  } else if (/d[eé]bito|debit/i.test(text)) {
    paymentMethod = 'debit_card';
  } else if (/transfer[êe]ncia|ted|doc/i.test(text)) {
    paymentMethod = 'transfer';
  } else if (/boleto/i.test(text)) {
    paymentMethod = 'boleto_bancario';
  }
  
  // Categorize based on description
  let category = 'outros';
  const descLower = description.toLowerCase();
  if (/(restaurante|lanchonete|padaria|brasilerie|pizzaria|bar|cafe|food|acai|açai|churrascaria|cantina|sushi)/i.test(descLower)) {
    category = 'alimentacao';
  } else if (/(uber|99|taxi|posto|gasolina|estacionamento|pedagio|pedágio)/i.test(descLower)) {
    category = 'transporte';
  } else if (/(farmacia|farmácia|hospital|clinica|clínica|drogaria)/i.test(descLower)) {
    category = 'saude';
  } else if (/(shopping|loja|magazine)/i.test(descLower)) {
    category = 'compras';
  } else if (/(cinema|teatro|netflix|spotify|lazer|academia)/i.test(descLower)) {
    category = 'lazer';
  } else if (/(luz|energia|agua|água|internet|telefone|celular|conta)/i.test(descLower)) {
    category = 'contas';
  }
  
  return {
    description,
    amount,
    date,
    type,
    category,
    payment_method: paymentMethod,
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
