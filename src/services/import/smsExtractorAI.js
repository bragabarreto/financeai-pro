/**
 * SMS/Text Transaction Extractor with AI Enhancement
 * Extracts transaction data from SMS notifications using AI
 * Enhanced with historical pattern learning and better Brazilian format support
 */

import { getTodayLocalDate } from '../../utils/dateUtils';
import { suggestCategoryFromHistory } from './patternLearning';

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
 * Build enhanced AI prompt with user context
 * @param {string} smsText - SMS text to analyze
 * @param {Array} cardDigitsList - List of registered card digits
 * @param {string} categoryNames - Comma-separated category names
 * @param {Object} historicalContext - Historical transaction patterns
 * @returns {string} Enhanced prompt
 */
const buildEnhancedPrompt = (smsText, cardDigitsList, categoryNames, historicalContext = {}) => {
  const currentYear = new Date().getFullYear();
  
  let contextSection = '';
  if (historicalContext.recentTransactions && historicalContext.recentTransactions.length > 0) {
    contextSection = `\n\nCONTEXTO HISTÓRICO DO USUÁRIO (use para melhorar precisão):
${historicalContext.recentTransactions.map(t => 
  `- "${t.description}" → Categoria: ${t.category} (${t.type})`
).join('\n')}`;
  }
  
  return `Você é um assistente especializado em extrair dados de transações financeiras de mensagens SMS bancárias brasileiras.

Sua tarefa é analisar SMS de bancos brasileiros e extrair informações financeiras com MÁXIMA PRECISÃO.

ANALISE O SEGUINTE SMS:
"""
${smsText}
"""

CARTÕES CADASTRADOS PELO USUÁRIO (últimos 4 dígitos):
${cardDigitsList.length > 0 ? cardDigitsList.join(', ') : 'Nenhum cartão cadastrado'}

CATEGORIAS REGISTRADAS PELO USUÁRIO:
${categoryNames || 'Nenhuma categoria registrada - use "outros"'}${contextSection}

INSTRUÇÕES DETALHADAS:

1. DESCRIÇÃO/ESTABELECIMENTO (PRIORIDADE MÁXIMA):
   - **SEMPRE extraia o nome COMPLETO do estabelecimento ou beneficiário**
   - **NUNCA use abreviações ou siglas, sempre o nome completo**
   - **PRESERVE todos os nomes, inclusive razão social completa**
   - Remova APENAS prefixos como "em", "no", "na", "para", "de"
   - **Este campo é CRÍTICO para categorização precisa - seja o mais detalhado possível**
   - Exemplos:
     * "Compra aprovada em LA BRASILERIE" → "LA BRASILERIE" (nome completo)
     * "Compra no cartao PADARIA SAO JOSE" → "PADARIA SAO JOSE" (nome completo)
     * "PIX para MARIA SILVA" → "MARIA SILVA" (nome completo)
     * "Mercado ABC Ltda" → "Mercado ABC Ltda" (preserve Ltda)
     * "Restaurante Bom Sabor ME" → "Restaurante Bom Sabor ME" (preserve ME)

2. VALOR:
   - Converta para número decimal (sem R$, sem formatação)
   - Exemplos: "R$ 1.234,56" → 1234.56 | "450,00" → 450.00

3. DATA:
   - Formato: YYYY-MM-DD
   - Se apenas DD/MM, use o ano atual (${currentYear})
   - IMPORTANTE: DD/MM = dia/mês (ex: 09/10 = 9 de outubro, NÃO 10 de setembro)
   - Exemplos:
     * "06/10" → "${currentYear}-10-06"
     * "15/12/2024" → "2024-12-15"

4. TIPO DE TRANSAÇÃO:
   - "expense" = Compras, pagamentos, PIX enviado, saques
   - "income" = Salário, PIX recebido, depósitos, transferências recebidas
   - "investment" = Aplicações, investimentos

5. CATEGORIA:
   - **Use a DESCRIÇÃO COMPLETA extraída no item 1 como contexto principal**
   - Escolha APENAS entre as categorias registradas pelo usuário
   - Use o contexto histórico para categorias similares
   - Analise o nome completo do estabelecimento para sugerir a melhor categoria
   - Se nenhuma categoria se encaixar perfeitamente, escolha a mais próxima
   - Se não houver categorias ou nenhuma se encaixar, use "outros"
   - NUNCA invente categorias que não estão na lista

6. CARTÃO:
   - Extraia os últimos 4 dígitos do cartão se mencionado
   - Se os dígitos corresponderem a um cartão cadastrado, retorne o match
   - Padrões comuns: "final 1234", "cartão 1234", "****1234"

7. PARCELAS:
   - Extraia número de parcelas se mencionado
   - Padrões: "em 3 vezes", "3x", "parcelado em 12x"
   - Se não houver menção, use 1

8. BANCO REMETENTE:
   - Identifique o banco: CAIXA, Nubank, Santander, Itaú, Bradesco, Inter, etc.

RETORNE APENAS UM OBJETO JSON VÁLIDO (sem texto adicional, sem markdown):

{
  "description": "Nome COMPLETO do estabelecimento/beneficiário (sem abreviações, nome completo preservado)",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "type": "expense|income|investment",
  "category": "categoria da lista do usuário ou 'outros'",
  "card_last_digits": "1234 ou null",
  "installments": 1,
  "confidence": 95,
  "bank_name": "Nome do banco ou null"
}

EXEMPLOS DE EXTRAÇÃO:

Entrada: "CAIXA: Compra aprovada em RAFAEL FERNANDES SALE R$ 457,00 em 2 vezes, 06/10 as 19:55, ELO final 1527"
Saída:
{
  "description": "RAFAEL FERNANDES SALE",
  "amount": 457.00,
  "date": "${currentYear}-10-06",
  "type": "expense",
  "category": "compras",
  "card_last_digits": "1527",
  "installments": 2,
  "confidence": 98,
  "bank_name": "CAIXA"
}

Entrada: "Santander: Compra no cartao final 0405, de R$ 66,00, em 17/10/25, às 18:53, em COMERCIAL CASA LTDA, aprovada."
Saída:
{
  "description": "COMERCIAL CASA LTDA",
  "amount": 66.00,
  "date": "2025-10-17",
  "type": "expense",
  "category": "compras",
  "card_last_digits": "0405",
  "installments": 1,
  "confidence": 98,
  "bank_name": "Santander"
}

Entrada: "Você recebeu um Pix de R$ 250,00 de João Silva Santos em 15/10"
Saída:
{
  "description": "João Silva Santos",
  "amount": 250.00,
  "date": "${currentYear}-10-15",
  "type": "income",
  "category": "outros",
  "card_last_digits": null,
  "installments": 1,
  "confidence": 95,
  "bank_name": null
}

AGORA ANALISE O SMS E RETORNE APENAS O JSON:`;
};

/**
 * Extract transaction data from SMS using AI with historical context
 * @param {string} smsText - SMS text
 * @param {Object} aiConfig - AI configuration with provider and apiKey
 * @param {Array} cards - User's credit cards for matching
 * @param {Array} availableCategories - List of user's registered categories
 * @param {string} userId - User ID for historical pattern learning
 * @returns {Promise<Object>} Extracted transaction data
 */
export const extractFromSMSWithAI = async (smsText, aiConfig, cards = [], availableCategories = [], userId = null) => {
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

  // Build category list
  const categoryNames = availableCategories.map(c => c.name).join(', ');
  
  // Fetch historical context for better categorization
  let historicalContext = {};
  if (userId) {
    try {
      const { supabase } = await import('../../supabaseClient');
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('description, category, type')
        .eq('user_id', userId)
        .not('category', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (recentTransactions && recentTransactions.length > 0) {
        // Map category IDs to names
        const transactionsWithNames = recentTransactions.map(t => {
          const cat = availableCategories.find(c => c.id === t.category);
          return {
            ...t,
            category: cat ? cat.name : 'outros'
          };
        });
        historicalContext.recentTransactions = transactionsWithNames;
      }
    } catch (error) {
      console.warn('Não foi possível carregar contexto histórico:', error);
    }
  }

  const prompt = buildEnhancedPrompt(smsText, cardDigitsList, categoryNames, historicalContext);

  try {
    let response;
    
    if (aiConfig.provider === 'openai' || aiConfig.provider === 'chatgpt') {
      response = await callOpenAI(prompt, aiConfig.apiKey, aiConfig.model || 'gpt-4o-mini');
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
    
    // Match category name to ID (strict matching with user's categories only)
    let categoryId = null;
    if (extracted.category) {
      const matchedCategory = availableCategories.find(c => 
        c.name.toLowerCase() === extracted.category.toLowerCase() ||
        c.name.toLowerCase().includes(extracted.category.toLowerCase()) ||
        extracted.category.toLowerCase().includes(c.name.toLowerCase())
      );
      if (matchedCategory) {
        categoryId = matchedCategory.id;
      }
    }
    
    // If no category matched and we have historical context, try pattern learning
    if (!categoryId && userId && extracted.description) {
      const historyMatch = await suggestCategoryFromHistory(userId, extracted.description);
      if (historyMatch && historyMatch.confidence > 0.5) {
        const matchedCategory = availableCategories.find(c => c.id === historyMatch.categoryId);
        if (matchedCategory) {
          categoryId = matchedCategory.id;
          extracted.category = matchedCategory.name;
          extracted.confidence = Math.min(extracted.confidence || 85, historyMatch.confidence * 100);
        }
      }
    }
    
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
      categoryId: categoryId,
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
    categoryId: null,
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
  const useResponsesEndpoint = model.startsWith('gpt-4.1') || model.startsWith('o1');
  const endpoint = useResponsesEndpoint
    ? 'https://api.openai.com/v1/responses'
    : 'https://api.openai.com/v1/chat/completions';
  
  const payload = useResponsesEndpoint
    ? {
        model,
        input: [
          {
            role: 'system',
            content: [
              { type: 'text', text: 'Você é um assistente especializado em extrair dados estruturados de SMS bancários. Retorne APENAS JSON válido, sem texto adicional.' }
            ]
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt }
            ]
          }
        ],
        max_output_tokens: 800,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }
    : {
        model,
        messages: [
          { role: 'system', content: 'Você é um assistente especializado em extrair dados estruturados de mensagens SMS bancárias. Retorne APENAS JSON válido, sem texto adicional.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 800
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (useResponsesEndpoint) {
    const outputPart = data.output?.[0]?.content?.find(
      (part) => part.type === 'output_text' || part.type === 'text'
    );
    return outputPart?.text || '';
  }
  
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
        maxOutputTokens: 800
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
 * Call Anthropic Claude API via proxy
 */
const callClaude = async (prompt, apiKey, model) => {
  // Use proxy server to avoid CORS issues with Anthropic API
  const proxyUrl = process.env.REACT_APP_ANTHROPIC_PROXY_URL || 'http://localhost:3001/anthropic-proxy';
  
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: apiKey,
        model: model,
        prompt: prompt,
        maxTokens: 800
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Claude API error: ${result.error || 'Unknown error'}`);
    }
    
    return result.data.content[0].text;
  } catch (error) {
    // Provide helpful error if proxy is not available
    if (error.message.includes('fetch')) {
      throw new Error('Não foi possível conectar ao servidor proxy. Certifique-se de que o servidor está rodando em http://localhost:3001');
    }
    throw error;
  }
};

/**
 * Extract multiple transactions from text
 * @param {string} text - Text containing multiple SMS messages
 * @param {Object} aiConfig - AI configuration
 * @param {Array} cards - User's credit cards
 * @param {Array} availableCategories - List of user's registered categories
 * @param {string} userId - User ID for historical context
 * @returns {Promise<Array>} Array of extracted transactions
 */
export const extractMultipleFromText = async (text, aiConfig, cards = [], availableCategories = [], userId = null) => {
  // Split by common SMS separators
  const messages = text.split(/\n\n+|\r\n\r\n+/).filter(msg => msg.trim().length > 10);
  
  const transactions = [];
  
  for (const message of messages) {
    try {
      const extracted = await extractFromSMSWithAI(message, aiConfig, cards, availableCategories, userId);
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