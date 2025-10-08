/**
 * Test script for SMS extraction
 * Tests the SMS extraction functionality with sample data
 */

// Sample SMS messages
const sms1 = 'CAIXA: Compra aprovada em RAFAEL FERNANDES SALE R$       457,00 em   2 vezes, 06/10 as 19:55, ELO final 1527. Se desconhecer envie BL1527';
const sms2 = 'CAIXA: Compra aprovada SANTE EXPRESS R$ 17,00 07/10 as 20:17, ELO final 1527. Caso nao reconheca a transacao, envie BL1527 p/cancelar cartao';

// Mock cards data
const mockCards = [
  {
    id: 'card-1',
    name: 'Cartão ELO Caixa',
    last_digits: '1527',
    last_digits_list: ['1527'],
    brand: 'elo'
  }
];

// Basic extraction function (fallback without AI)
function extractFromSMSBasic(smsText, cards = []) {
  const text = smsText.trim();
  
  // Extract amount
  const amountMatch = text.match(/R\$?\s*([\d.,\s]+?)(?:\s+em|\s+\d{1,2}\/|$)/);
  let amount = 0;
  if (amountMatch) {
    let cleaned = amountMatch[1].trim().replace(/\s+/g, '');
    // Check if Brazilian format (has comma as decimal)
    if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    amount = parseFloat(cleaned) || 0;
  }
  
  // Extract date
  const dateMatch = text.match(/(\d{1,2}\/\d{1,2})/);
  let date = new Date().toISOString().split('T')[0];
  if (dateMatch) {
    const [day, month] = dateMatch[1].split('/');
    date = `2025-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Extract description
  let description = 'Transação';
  const descPatterns = [
    /(?:em|no)\s+([A-Z][A-Z\s]+?)(?:\s+R\$|\s+\d{1,2}\/)/i,
    /aprovada\s+(?:em\s+)?([A-Z][A-Z\s]+?)(?:\s+R\$)/i
  ];
  
  for (const pattern of descPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      description = match[1].trim();
      break;
    }
  }
  
  // Extract card digits
  const cardDigitsMatch = text.match(/final\s+(\d{4})/i);
  let cardDigits = null;
  let cardId = null;
  
  if (cardDigitsMatch) {
    cardDigits = cardDigitsMatch[1];
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
  
  return {
    description,
    amount,
    date,
    type: 'expense',
    category: 'outros',
    card_last_digits: cardDigits,
    card_id: cardId,
    installments,
    confidence: 75,
    source: 'basic',
    rawText: text
  };
}

// Test extraction
console.log('=== Teste de Extração de SMS ===\n');

console.log('SMS 1:', sms1);
const result1 = extractFromSMSBasic(sms1, mockCards);
console.log('Resultado 1:', JSON.stringify(result1, null, 2));
console.log('\n---\n');

console.log('SMS 2:', sms2);
const result2 = extractFromSMSBasic(sms2, mockCards);
console.log('Resultado 2:', JSON.stringify(result2, null, 2));
console.log('\n---\n');

console.log('✅ Testes concluídos!');
console.log('\nResumo:');
console.log(`- SMS 1: R$ ${result1.amount.toFixed(2)} em ${result1.description}`);
console.log(`  Cartão: ${result1.card_last_digits} (ID: ${result1.card_id})`);
console.log(`  Parcelas: ${result1.installments}x`);
console.log(`- SMS 2: R$ ${result2.amount.toFixed(2)} em ${result2.description}`);
console.log(`  Cartão: ${result2.card_last_digits} (ID: ${result2.card_id})`);
