/**
 * Photo Transaction Extractor with AI
 * Extracts transaction data from photos/images using Vision AI
 * Enhanced with historical pattern learning and better OCR instructions
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
  
  let cleaned = String(amountStr).replace(/R?\$?\s*/g, '');
  
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
 * Parse date from various formats
 * @param {string} dateStr - Date string
 * @returns {string} ISO date string
 */
const parseDate = (dateStr) => {
  if (!dateStr) {
    const today = new Date();
    return getTodayLocalDate();
  }
  
  // Try DD/MM/YYYY
  const brMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try YYYY-MM-DD
  const isoMatch = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return getTodayLocalDate();
};

/**
 * Convert image file to base64
 * @param {File} file - Image file
 * @returns {Promise<string>} Base64 encoded image
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Build enhanced AI prompt with user context for vision
 * @param {Array} cardDigitsList - List of registered card digits
 * @param {string} categoryNames - Comma-separated category names
 * @param {Object} historicalContext - Historical transaction patterns
 * @returns {string} Enhanced prompt
 */
const buildEnhancedVisionPrompt = (cardDigitsList, categoryNames, historicalContext = {}) => {
  const currentYear = new Date().getFullYear();
  
  let contextSection = '';
  if (historicalContext.recentTransactions && historicalContext.recentTransactions.length > 0) {
    contextSection = `\n\nCONTEXTO HISTÓRICO DO USUÁRIO (use para melhorar precisão de categorização):
${historicalContext.recentTransactions.slice(0, 10).map(t => 
  `- "${t.description}" → ${t.category} (${t.type})`
).join('\n')}`;
  }
  
  return `Você é um assistente especializado em OCR e extração de dados de comprovantes, recibos e notificações bancárias brasileiras.

Sua tarefa é analisar a imagem fornecida e extrair TODAS as informações financeiras com MÁXIMA PRECISÃO.

TIPOS DE IMAGEM QUE VOCÊ PODE RECEBER:
1. Comprovante de PIX (enviado ou recebido)
2. Notificação de cartão de crédito (screenshot de celular)
3. Notificação de cartão de débito
4. Recibo de transferência
5. Comprovante de pagamento
6. Nota fiscal ou cupom fiscal
7. Boleto bancário

CARTÕES CADASTRADOS PELO USUÁRIO (últimos 4 dígitos):
${cardDigitsList.length > 0 ? cardDigitsList.join(', ') : 'Nenhum cartão cadastrado'}

CATEGORIAS REGISTRADAS PELO USUÁRIO:
${categoryNames || 'Nenhuma categoria registrada - use "outros"'}${contextSection}

INSTRUÇÕES DETALHADAS DE EXTRAÇÃO:

1. IDENTIFICAÇÃO DO TIPO:
   - Analise a imagem e identifique o tipo de comprovante
   - PIX: procure por "Comprovante PIX", chave PIX, ID da transação E2E
   - Cartão: procure por "aprovada", "últimos dígitos", "final 1234"
   - Transferência: procure por TED, DOC, transferência

2. DESCRIÇÃO/ESTABELECIMENTO (PRIORIDADE MÁXIMA):
   - **SEMPRE extraia o nome COMPLETO do estabelecimento, pagador ou beneficiário**
   - **NUNCA use abreviações ou siglas, sempre o nome completo e detalhado**
   - **PRESERVE todos os nomes, inclusive razão social completa e sufixos (Ltda, ME, SA, etc.)**
   - Para PIX: extraia o nome COMPLETO do PAGADOR (se recebeu) ou BENEFICIÁRIO (se enviou)
   - Para compra: extraia o nome COMPLETO do ESTABELECIMENTO
   - Remova APENAS prefixos desnecessários como "para", "de", "em"
   - **Este campo é CRÍTICO para categorização precisa - seja o mais completo e detalhado possível**
   - Se houver razão social E nome fantasia, prefira incluir ambos ou o mais completo
   - Exemplos:
     * "PIX para SUPERMERCADO BOM PREÇO LTDA" → "SUPERMERCADO BOM PREÇO LTDA" 
     * "Compra em RESTAURANTE LA BRASILERIE" → "RESTAURANTE LA BRASILERIE"
     * "Transferência para JOÃO SILVA SANTOS" → "JOÃO SILVA SANTOS"

3. VALOR:
   - Procure por "R$" seguido de números
   - Pode estar em diferentes formatos: R$ 1.234,56 ou 1234,56 ou 1.234,56
   - Converta para número decimal (ex: 1234.56)
   - ATENÇÃO: Não confunda data com valor!

4. DATA E HORA:
   - Procure pela data da transação (não a data de impressão do comprovante)
   - Formatos comuns: DD/MM/YYYY, DD/MM/AA, DD-MM-YYYY
   - Se aparecer apenas DD/MM, use o ano atual (${currentYear})
   - Extraia hora se disponível (HH:MM ou HH:MM:SS)
   - Formato de saída: data "YYYY-MM-DD", hora "HH:MM"

5. TIPO DE TRANSAÇÃO:
   - PIX RECEBIDO: type="income", preencha "payer" (quem pagou)
   - PIX ENVIADO: type="expense", preencha "beneficiary" (quem recebeu)
   - COMPRA/DÉBITO: type="expense"
   - DEPÓSITO/CRÉDITO: type="income"
   - INVESTIMENTO/APLICAÇÃO: type="investment"

6. MEIO DE PAGAMENTO (transaction_type):
   - "pix" = PIX
   - "credit_card" = Cartão de Crédito
   - "debit_card" = Cartão de Débito
   - "transfer" = Transferência (TED/DOC)
   - "boleto" = Boleto Bancário

7. CATEGORIA:
   - **Use a DESCRIÇÃO COMPLETA extraída no item 2 como contexto principal para categorização**
   - Escolha ESTRITAMENTE entre as categorias registradas pelo usuário
   - Use o contexto histórico se a descrição for similar
   - Analise o nome completo do estabelecimento/beneficiário para sugerir a melhor categoria
   - Se for compra em mercado/supermercado → "alimentacao" (se disponível)
   - Se for restaurante/lanchonete → "alimentacao" (se disponível)
   - Se for posto/combustivel → "transporte" (se disponível)
   - Se for farmácia/hospital → "saude" (se disponível)
   - Se NENHUMA categoria se encaixar, use "outros"
   - NUNCA invente categorias

8. CARTÃO (se aplicável):
   - Procure por: "final 1234", "últimos 4 dígitos", "****1234", "cartão 1234"
   - Extraia APENAS os 4 dígitos numéricos
   - Se os dígitos coincidirem com um cartão cadastrado, marque como identificado

9. INFORMAÇÕES PIX (se aplicável):
   - "beneficiary": Nome de quem recebeu (se você enviou)
   - "payer": Nome de quem enviou (se você recebeu)
   - "pix_key": Chave PIX usada (CPF, telefone, e-mail, chave aleatória)
   - "transaction_id": ID E2E da transação (começa com E)

10. PARCELAS:
   - Procure por: "em 3x", "parcelado", "3 vezes"
   - Se não houver menção, use 1

11. CONFIANÇA:
   - Alta (95-100): Imagem nítida, todos os campos claramente visíveis
   - Média (80-94): Imagem boa, alguns campos podem ter pequena incerteza
   - Baixa (60-79): Imagem com qualidade ruim, campos difíceis de ler

RETORNE APENAS UM OBJETO JSON VÁLIDO (sem texto adicional, sem markdown, sem explicações):

{
  "description": "Nome COMPLETO do estabelecimento/beneficiário/pagador (sem abreviações, preservando razão social e sufixos)",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "time": "HH:MM ou null",
  "type": "expense|income|investment",
  "transaction_type": "pix|credit_card|debit_card|transfer|boleto",
  "category": "categoria da lista do usuário ou 'outros'",
  "card_last_digits": "1234 ou null",
  "beneficiary": "nome ou null",
  "payer": "nome ou null",
  "pix_key": "chave ou null",
  "transaction_id": "ID ou null",
  "installments": 1,
  "confidence": 95
}

EXEMPLOS:

[Imagem: Comprovante PIX enviado]
{
  "description": "Maria Silva Santos",
  "amount": 150.00,
  "date": "${currentYear}-10-15",
  "time": "14:30",
  "type": "expense",
  "transaction_type": "pix",
  "category": "outros",
  "card_last_digits": null,
  "beneficiary": "Maria Silva Santos",
  "payer": null,
  "pix_key": "maria@email.com",
  "transaction_id": "E12345678901234567890123456789012345",
  "installments": 1,
  "confidence": 98
}

[Imagem: Notificação cartão]
{
  "description": "SUPERMERCADO BOM PRECO LTDA",
  "amount": 287.50,
  "date": "${currentYear}-10-20",
  "time": "18:45",
  "type": "expense",
  "transaction_type": "credit_card",
  "category": "alimentacao",
  "card_last_digits": "4521",
  "beneficiary": null,
  "payer": null,
  "pix_key": null,
  "transaction_id": null,
  "installments": 1,
  "confidence": 95
}

AGORA ANALISE A IMAGEM E RETORNE APENAS O JSON:`;
};

/**
 * Extract transaction data from photo using AI Vision with historical context
 * @param {File} imageFile - Image file containing transaction receipt/notification
 * @param {Object} aiConfig - AI configuration with provider and apiKey
 * @param {Array} cards - User's credit cards for matching
 * @param {Array} availableCategories - List of user's registered categories
 * @param {string} userId - User ID for historical pattern learning
 * @returns {Promise<Object>} Extracted transaction data
 */
export const extractFromPhotoWithAI = async (imageFile, aiConfig, cards = [], availableCategories = [], userId = null) => {
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

  // Build category list by type
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

  const prompt = buildEnhancedVisionPrompt(cardDigitsList, categoryNames, historicalContext);

  try {
    const base64Image = await fileToBase64(imageFile);
    let response;
    
    if (aiConfig.provider === 'openai' || aiConfig.provider === 'chatgpt') {
      response = await callOpenAIVision(prompt, base64Image, aiConfig.apiKey, aiConfig.model || 'gpt-4o-mini');
    } else if (aiConfig.provider === 'gemini') {
      response = await callGeminiVision(prompt, base64Image, aiConfig.apiKey, aiConfig.model || 'gemini-2.5-flash');
    } else if (aiConfig.provider === 'claude') {
      response = await callClaudeVision(prompt, base64Image, aiConfig.apiKey, aiConfig.model || 'claude-3-5-sonnet-20241022');
    } else {
      throw new Error(`Provedor de IA não suportado: ${aiConfig.provider}`);
    }

    // Parse JSON response
    let jsonText = response.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const extracted = JSON.parse(jsonText);
    
    // Validate required fields
    if (!extracted.description || !extracted.amount || !extracted.type) {
      throw new Error('A IA não conseguiu extrair todas as informações necessárias da foto. Tente uma imagem mais clara ou com melhor qualidade');
    }
    
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
    
    // Map transaction_type to payment_method for consistency
    const payment_method = extracted.transaction_type || null;
    
    return {
      ...extracted,
      categoryId: categoryId,
      payment_method: payment_method,
      date: extracted.date || parseDate(null),
      amount: typeof extracted.amount === 'number' ? extracted.amount : parseAmount(String(extracted.amount)),
      confidence: extracted.confidence || 85,
      source: 'ai_vision',
      imageFile: imageFile.name
    };
    
  } catch (error) {
    console.error('Erro ao extrair com IA Vision:', error);
    
    // Provide more specific error messages
    if (error.message.includes('JSON')) {
      throw new Error('A IA não conseguiu extrair dados válidos da imagem. Certifique-se de que a foto contém um comprovante, recibo ou notificação de transação financeira clara e legível');
    }
    
    throw error;
  }
};

/**
 * Call OpenAI Vision API
 */
const callOpenAIVision = async (prompt, base64Image, apiKey, model) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model.includes('vision') || model.includes('4o') ? model : 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1500
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
};

/**
 * Call Google Gemini Vision API
 */
const callGeminiVision = async (prompt, base64Image, apiKey, model) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1500
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};

/**
 * Call Anthropic Claude Vision API via proxy
 */
const callClaudeVision = async (prompt, base64Image, apiKey, model) => {
  // Use proxy server to avoid CORS issues with Anthropic API
  const proxyUrl = process.env.REACT_APP_ANTHROPIC_PROXY_URL || 'http://localhost:3001/anthropic-proxy';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for image processing
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: apiKey,
        model: model,
        prompt: prompt,
        maxTokens: 1500,
        image: base64Image
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Claude API error: ${result.error || 'Unknown error'}`);
    }
    
    return result.data.content[0].text;
  } catch (error) {
    // Provide helpful error if proxy is not available
    if (error.name === 'AbortError') {
      throw new Error('Timeout ao processar imagem. A imagem pode ser muito grande ou o servidor está sobrecarregado.');
    }
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error(`Não foi possível conectar ao servidor proxy em ${proxyUrl}. Execute "npm run dev" para iniciar o servidor.`);
    }
    throw error;
  }
};

/**
 * Extract multiple transactions from multiple photos
 * @param {Array<File>} imageFiles - Array of image files
 * @param {Object} aiConfig - AI configuration
 * @param {Array} cards - User's credit cards
 * @param {Array} availableCategories - List of user's registered categories
 * @param {string} userId - User ID for historical context
 * @returns {Promise<Array>} Array of extracted transactions
 */
export const extractMultipleFromPhotos = async (imageFiles, aiConfig, cards = [], availableCategories = [], userId = null) => {
  const transactions = [];
  
  for (const file of imageFiles) {
    try {
      const extracted = await extractFromPhotoWithAI(file, aiConfig, cards, availableCategories, userId);
      if (extracted && extracted.amount > 0) {
        transactions.push(extracted);
      }
    } catch (error) {
      console.error(`Erro ao extrair transação de ${file.name}:`, error);
      transactions.push({
        error: error.message,
        imageFile: file.name,
        success: false
      });
    }
  }
  
  return transactions;
};

// Export with alias for compatibility
export const extractFromPhoto = extractFromPhotoWithAI;

export default {
  extractFromPhoto,
  extractFromPhotoWithAI,
  extractMultipleFromPhotos
};