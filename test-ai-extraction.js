/**
 * Test script for AI extraction with real Gemini API
 */

const fs = require('fs');

// AI Config
const aiConfig = {
  enabled: true,
  provider: 'gemini',
  model: 'gemini-2.0-flash-exp',
  apiKey: 'AIzaSyAnX690uDlhRfcSfmRrOl5z4CbFTI4RWl4'
};

// Mock cards
const mockCards = [
  {
    id: 'card-1',
    name: 'Cartão ELO Caixa',
    last_digits: '1527',
    last_digits_list: ['1527', '0405'],
    brand: 'elo'
  }
];

// Sample SMS messages
const sms1 = 'CAIXA: Compra aprovada em RAFAEL FERNANDES SALE R$       457,00 em   2 vezes, 06/10 as 19:55, ELO final 1527. Se desconhecer envie BL1527';
const sms2 = 'CAIXA: Compra aprovada SANTE EXPRESS R$ 17,00 07/10 as 20:17, ELO final 1527. Caso nao reconheca a transacao, envie BL1527 p/cancelar cartao';

/**
 * Call Gemini API for SMS extraction
 */
async function extractFromSMSWithGemini(smsText, cards) {
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

Cartões cadastrados (últimos 4 dígitos): ${cardDigitsList.join(', ')}

Retorne APENAS um objeto JSON válido com os seguintes campos:
{
  "description": "descrição do estabelecimento ou beneficiário",
  "amount": valor numérico da transação,
  "date": "data no formato YYYY-MM-DD",
  "type": "expense" ou "income" ou "investment",
  "category": "categoria sugerida (alimentacao, transporte, compras, saude, lazer, salario, outros)",
  "card_last_digits": "últimos 4 dígitos do cartão se mencionado, ou null",
  "card_id": "ID do cartão se os dígitos corresponderem a um cartão cadastrado, ou null",
  "installments": número de parcelas se mencionado ou 1,
  "confidence": score de confiança de 0 a 100
}

IMPORTANTE:
- Se os últimos 4 dígitos do cartão corresponderem a algum dos cartões cadastrados, use o card_id correspondente
- Para PIX recebido, type deve ser "income"
- Para PIX enviado ou compras, type deve ser "expense"
- Valores devem ser numéricos (sem R$ ou formatação)
- Datas devem estar no formato YYYY-MM-DD
- Se a data tiver apenas DD/MM, use o ano atual (2025)
- Retorne APENAS o JSON, sem texto adicional`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`,
      {
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
            maxOutputTokens: 1024,
            topP: 0.95
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('API não retornou candidatos. Possível bloqueio de segurança.');
    }
    
    if (!data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
      throw new Error(`API não retornou texto. Motivo: ${data.candidates[0].finishReason}`);
    }
    
    const responseText = data.candidates[0].content.parts[0].text;
    
    // Remove markdown code blocks if present
    let jsonText = responseText.trim();
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
      source: 'ai_gemini',
      rawText: smsText
    };
    
  } catch (error) {
    console.error('Erro ao extrair com IA:', error);
    throw error;
  }
}

/**
 * Call Gemini Vision API for image extraction
 */
async function extractFromPhotoWithGemini(imagePath, cards) {
  const cardDigitsList = cards.flatMap(card => {
    const digits = [card.last_digits];
    if (card.last_digits_list && Array.isArray(card.last_digits_list)) {
      digits.push(...card.last_digits_list);
    }
    return digits.filter(d => d);
  });

  const prompt = `Você é um assistente especializado em extrair dados de transações financeiras de imagens de comprovantes, notificações e recibos bancários brasileiros.

Analise a imagem e extraia as informações da transação financeira.

Cartões cadastrados (últimos 4 dígitos): ${cardDigitsList.join(', ')}

Retorne APENAS um objeto JSON válido com os seguintes campos:
{
  "description": "descrição do estabelecimento, beneficiário ou pagador",
  "amount": valor numérico da transação,
  "date": "data no formato YYYY-MM-DD",
  "time": "hora no formato HH:MM se disponível, ou null",
  "type": "expense" ou "income" ou "investment",
  "transaction_type": "tipo específico: pix, credit_card, debit_card, transfer, boleto",
  "category": "categoria sugerida (alimentacao, transporte, compras, saude, lazer, salario, outros)",
  "card_last_digits": "últimos 4 dígitos do cartão se visível, ou null",
  "card_id": "ID do cartão se os dígitos corresponderem a um cartão cadastrado, ou null",
  "beneficiary": "nome do beneficiário/recebedor se for PIX ou transferência, ou null",
  "payer": "nome do pagador se for PIX recebido, ou null",
  "installments": número de parcelas se mencionado ou 1,
  "confidence": score de confiança de 0 a 100
}

IMPORTANTE:
- Para PIX recebido (você recebeu), type deve ser "income" e preencha "payer"
- Para PIX enviado (você pagou), type deve ser "expense" e preencha "beneficiary"
- Para compras com cartão, type deve ser "expense"
- Se os últimos 4 dígitos do cartão corresponderem a algum dos cartões cadastrados, use o card_id correspondente
- Valores devem ser numéricos (sem R$ ou formatação)
- Datas devem estar no formato YYYY-MM-DD
- Se a data tiver apenas DD/MM, use o ano atual (2025)
- Retorne APENAS o JSON, sem texto adicional`;

  try {
    // Read image and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`,
      {
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
            maxOutputTokens: 1024
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('API não retornou candidatos. Possível bloqueio de segurança.');
    }
    
    if (!data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
      throw new Error(`API não retornou texto. Motivo: ${data.candidates[0].finishReason}`);
    }
    
    const responseText = data.candidates[0].content.parts[0].text;
    
    // Remove markdown code blocks if present
    let jsonText = responseText.trim();
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
      source: 'ai_vision_gemini',
      imageFile: imagePath
    };
    
  } catch (error) {
    console.error('Erro ao extrair com IA Vision:', error);
    throw error;
  }
}

// Run tests
async function runTests() {
  console.log('=== TESTE DE EXTRAÇÃO COM IA (Google Gemini) ===\n');
  
  // Test SMS extraction
  console.log('📱 TESTE 1: Extração de SMS\n');
  console.log('SMS 1:', sms1);
  try {
    const result1 = await extractFromSMSWithGemini(sms1, mockCards);
    console.log('✅ Resultado 1:', JSON.stringify(result1, null, 2));
  } catch (error) {
    console.error('❌ Erro no SMS 1:', error.message);
  }
  
  console.log('\n---\n');
  
  console.log('SMS 2:', sms2);
  try {
    const result2 = await extractFromSMSWithGemini(sms2, mockCards);
    console.log('✅ Resultado 2:', JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error('❌ Erro no SMS 2:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test photo extraction
  console.log('📸 TESTE 2: Extração de Foto (Notificação de Cartão)\n');
  const photoPath1 = './ImagemdoWhatsAppde2025-10-08à(s)08.48.30_b7058934.jpg';
  if (fs.existsSync(photoPath1)) {
    try {
      const result3 = await extractFromPhotoWithGemini(photoPath1, mockCards);
      console.log('✅ Resultado 3 (Notificação Cartão):', JSON.stringify(result3, null, 2));
    } catch (error) {
      console.error('❌ Erro na foto 1:', error.message);
    }
  } else {
    console.log('⚠️  Foto não encontrada:', photoPath1);
  }
  
  console.log('\n---\n');
  
  console.log('📸 TESTE 3: Extração de Foto (Comprovante PIX)\n');
  const photoPath2 = './ImagemdoWhatsAppde2025-10-08à(s)08.51.23_fa49b518.jpg';
  if (fs.existsSync(photoPath2)) {
    try {
      const result4 = await extractFromPhotoWithGemini(photoPath2, mockCards);
      console.log('✅ Resultado 4 (Comprovante PIX):', JSON.stringify(result4, null, 2));
    } catch (error) {
      console.error('❌ Erro na foto 2:', error.message);
    }
  } else {
    console.log('⚠️  Foto não encontrada:', photoPath2);
  }
  
  console.log('\n=== TESTES CONCLUÍDOS ===');
}

runTests().catch(console.error);
