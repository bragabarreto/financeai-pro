/**
 * Photo Transaction Extractor with AI
 * Extracts transaction data from photos/images using Vision AI
 */

import { getTodayLocalDate } from '../../utils/dateUtils';

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
 * Extract transaction data from photo using AI Vision
 * @param {File} imageFile - Image file containing transaction receipt/notification
 * @param {Object} aiConfig - AI configuration with provider and apiKey
 * @param {Array} cards - User's credit cards for matching
 * @param {Array} availableCategories - List of user's registered categories
 * @returns {Promise<Object>} Extracted transaction data
 */
export const extractFromPhotoWithAI = async (imageFile, aiConfig, cards = [], availableCategories = []) => {
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
  const categoryInstruction = categoryNames 
    ? `categoria sugerida (escolha APENAS entre as categorias cadastradas: ${categoryNames})`
    : `categoria sugerida (use "outros" se não houver categorias cadastradas)`;

  const prompt = `Você é um assistente especializado em extrair dados de transações financeiras de imagens de comprovantes, notificações e recibos bancários brasileiros.

Analise a imagem e extraia as informações da transação financeira.

Cartões cadastrados (últimos 4 dígitos): ${cardDigitsList.length > 0 ? cardDigitsList.join(', ') : 'Nenhum'}

Retorne APENAS um objeto JSON válido com os seguintes campos:
{
  "description": "descrição do estabelecimento, beneficiário ou pagador",
  "amount": valor numérico da transação,
  "date": "data no formato YYYY-MM-DD",
  "time": "hora no formato HH:MM se disponível, ou null",
  "type": "expense" ou "income" ou "investment",
  "transaction_type": "tipo específico: pix, credit_card, debit_card, transfer, boleto",
  "category": "${categoryInstruction}",
  "card_last_digits": "últimos 4 dígitos do cartão se visível, ou null",
  "card_id": "ID do cartão se os dígitos corresponderem a um cartão cadastrado, ou null",
  "beneficiary": "nome do beneficiário/recebedor se for PIX ou transferência, ou null",
  "payer": "nome do pagador se for PIX recebido, ou null",
  "pix_key": "chave PIX se visível, ou null",
  "transaction_id": "ID da transação se visível, ou null",
  "installments": número de parcelas se mencionado ou 1,
  "confidence": score de confiança de 0 a 100
}

IMPORTANTE:
- Para PIX recebido (você recebeu), type deve ser "income" e preencha "payer"
- Para PIX enviado (você pagou), type deve ser "expense" e preencha "beneficiary"
- Para compras com cartão, type deve ser "expense"
- Se os últimos 4 dígitos do cartão corresponderem a algum dos cartões cadastrados, use o card_id correspondente
- A categoria DEVE ser escolhida SOMENTE entre as categorias cadastradas pelo usuário: ${categoryNames || 'outros'}
- Se nenhuma categoria registrada se encaixar perfeitamente, escolha a mais próxima ou use "outros" se disponível
- Valores devem ser numéricos (sem R$ ou formatação)
- Datas devem estar no formato YYYY-MM-DD
- Se a data tiver apenas DD/MM, use o ano atual (2025)
- Retorne APENAS o JSON, sem texto adicional`;

  try {
    const base64Image = await fileToBase64(imageFile);
    let response;
    
    if (aiConfig.provider === 'openai' || aiConfig.provider === 'chatgpt') {
      response = await callOpenAIVision(prompt, base64Image, aiConfig.apiKey, aiConfig.model || 'gpt-4.1-mini');
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
      source: 'ai_vision',
      imageFile: imageFile.name
    };
    
  } catch (error) {
    console.error('Erro ao extrair com IA Vision:', error);
    
    // Provide more specific error messages
    if (error.message.includes('JSON')) {
      throw new Error('A IA não conseguiu extrair dados válidos da imagem. Certifique-se de que a foto contém um comprovante, recibo ou notificação de transação financeira');
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
      model: model.includes('vision') ? model : 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
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
        maxOutputTokens: 1000
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
 * Call Anthropic Claude Vision API
 */
const callClaudeVision = async (prompt, base64Image, apiKey, model) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 1000,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
};

/**
 * Extract multiple transactions from multiple photos
 * @param {Array<File>} imageFiles - Array of image files
 * @param {Object} aiConfig - AI configuration
 * @param {Array} cards - User's credit cards
 * @param {Array} availableCategories - List of user's registered categories
 * @returns {Promise<Array>} Array of extracted transactions
 */
export const extractMultipleFromPhotos = async (imageFiles, aiConfig, cards = [], availableCategories = []) => {
  const transactions = [];
  
  for (const file of imageFiles) {
    try {
      const extracted = await extractFromPhotoWithAI(file, aiConfig, cards, availableCategories);
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
