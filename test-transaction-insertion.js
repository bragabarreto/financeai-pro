/**
 * Script de Diagnóstico: Teste de Inserção de Transações
 * Testa as funcionalidades de inserção manual e importação
 */

// Simular dados de teste
const testManualTransaction = {
  type: 'expense',
  description: 'Teste de Compra Manual',
  amount: 100.50,
  category: 'test-category-id',
  account_id: 'test-account-id',
  card_id: null,
  payment_method: 'pix',
  date: '2025-10-12',
  origin: 'manual',
  is_alimony: false,
  is_installment: false,
  installment_count: null,
  installment_due_dates: [],
  last_installment_date: null
};

const testCreditCardTransaction = {
  type: 'expense',
  description: 'Teste de Compra com Cartão',
  amount: 250.00,
  category: 'test-category-id',
  account_id: null,
  card_id: 'test-card-id',
  payment_method: 'credit_card',
  date: '2025-10-12',
  origin: 'manual',
  is_alimony: false,
  is_installment: false,
  installment_count: null,
  installment_due_dates: [],
  last_installment_date: null
};

const testImportTransaction = {
  type: 'expense',
  description: 'Teste de Importação',
  amount: 75.30,
  category: 'Alimentação',
  payment_method: 'debit_card',
  date: '10/10/2025',
  origin: 'import',
  is_alimony: false
};

console.log('=== TESTE DE DIAGNÓSTICO: INSERÇÃO DE TRANSAÇÕES ===\n');

// Teste 1: Validação de campos obrigatórios
console.log('Teste 1: Validação de Campos Obrigatórios');
console.log('------------------------------------------');

function validateManualTransaction(transaction) {
  const errors = [];
  
  if (!transaction.description || !transaction.description.trim()) {
    errors.push('❌ Descrição é obrigatória');
  } else {
    console.log('✅ Descrição válida:', transaction.description);
  }
  
  if (!transaction.category) {
    errors.push('❌ Categoria é obrigatória');
  } else {
    console.log('✅ Categoria válida:', transaction.category);
  }
  
  if (!transaction.payment_method) {
    errors.push('❌ Meio de pagamento é obrigatório');
  } else {
    console.log('✅ Meio de pagamento válido:', transaction.payment_method);
  }
  
  if (transaction.payment_method === 'credit_card' && !transaction.card_id) {
    errors.push('❌ Cartão de crédito é obrigatório para pagamento com cartão');
  } else if (transaction.payment_method === 'credit_card') {
    console.log('✅ Cartão de crédito selecionado:', transaction.card_id);
  }
  
  if (['debit_card', 'pix', 'transfer', 'application', 'redemption', 'paycheck'].includes(transaction.payment_method) && !transaction.account_id) {
    errors.push('❌ Conta bancária é obrigatória para este meio de pagamento');
  } else if (transaction.account_id) {
    console.log('✅ Conta bancária selecionada:', transaction.account_id);
  }
  
  if (!transaction.amount || transaction.amount <= 0) {
    errors.push('❌ Valor deve ser maior que zero');
  } else {
    console.log('✅ Valor válido:', transaction.amount);
  }
  
  if (!transaction.date) {
    errors.push('❌ Data é obrigatória');
  } else {
    console.log('✅ Data válida:', transaction.date);
  }
  
  return errors;
}

console.log('\n📝 Testando transação manual com PIX:');
const errors1 = validateManualTransaction(testManualTransaction);
if (errors1.length > 0) {
  console.log('\n❌ ERROS ENCONTRADOS:');
  errors1.forEach(err => console.log('  ', err));
} else {
  console.log('\n✅ Transação manual válida!');
}

console.log('\n📝 Testando transação com cartão de crédito:');
const errors2 = validateManualTransaction(testCreditCardTransaction);
if (errors2.length > 0) {
  console.log('\n❌ ERROS ENCONTRADOS:');
  errors2.forEach(err => console.log('  ', err));
} else {
  console.log('\n✅ Transação com cartão válida!');
}

// Teste 2: Preparação de dados para salvar
console.log('\n\nTeste 2: Preparação de Dados para Salvar');
console.log('------------------------------------------');

function prepareDataToSave(formData, userId) {
  const dataToSave = {
    ...formData,
    user_id: userId,
    amount: parseFloat(formData.amount) || 0,
    is_alimony: formData.is_alimony || false,
    // Set card_id or account_id to null based on payment method
    card_id: formData.payment_method === 'credit_card' ? formData.card_id : null,
    account_id: formData.payment_method === 'credit_card' ? null : formData.account_id
  };
  
  return dataToSave;
}

const preparedData1 = prepareDataToSave(testManualTransaction, 'test-user-id');
console.log('\n📦 Dados preparados para PIX:');
console.log('  user_id:', preparedData1.user_id);
console.log('  account_id:', preparedData1.account_id);
console.log('  card_id:', preparedData1.card_id);
console.log('  payment_method:', preparedData1.payment_method);
console.log('  amount:', preparedData1.amount);

const preparedData2 = prepareDataToSave(testCreditCardTransaction, 'test-user-id');
console.log('\n📦 Dados preparados para Cartão de Crédito:');
console.log('  user_id:', preparedData2.user_id);
console.log('  account_id:', preparedData2.account_id);
console.log('  card_id:', preparedData2.card_id);
console.log('  payment_method:', preparedData2.payment_method);
console.log('  amount:', preparedData2.amount);

// Teste 3: Conversão de formatos brasileiros
console.log('\n\nTeste 3: Conversão de Formatos Brasileiros');
console.log('------------------------------------------');

function parseBrazilianCurrency(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  let cleaned = value.toString()
    .replace(/["']/g, '')
    .replace(/R\$/g, '')
    .trim();
  
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  const number = parseFloat(cleaned);
  return isNaN(number) ? 0 : number;
}

function parseBrazilianDate(date) {
  if (!date) return null;
  
  const cleaned = date.toString().replace(/["']/g, '').trim();
  
  if (cleaned.match(/^\d{4}-\d{2}-\d{2}/)) {
    return cleaned.split('T')[0];
  }
  
  const matchFull = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (matchFull) {
    const day = matchFull[1].padStart(2, '0');
    const month = matchFull[2].padStart(2, '0');
    let year = matchFull[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

const testCurrencies = [
  'R$ 1.234,56',
  'R$ 1,09',
  '250.00',
  '75,30',
  '1.500,00'
];

console.log('\n💰 Testando conversão de moeda:');
testCurrencies.forEach(curr => {
  const converted = parseBrazilianCurrency(curr);
  console.log(`  ${curr} → ${converted}`);
});

const testDates = [
  '10/10/2025',
  '01/01/2025',
  '31-12-2024',
  '2025-10-12'
];

console.log('\n📅 Testando conversão de data:');
testDates.forEach(date => {
  const converted = parseBrazilianDate(date);
  console.log(`  ${date} → ${converted}`);
});

// Teste 4: Verificação de campos na importação
console.log('\n\nTeste 4: Campos Preservados na Importação');
console.log('------------------------------------------');

const importedTransaction = {
  ...testImportTransaction,
  date: parseBrazilianDate(testImportTransaction.date),
  amount: parseBrazilianCurrency(testImportTransaction.amount.toString().replace('.', ',')),
  account_id: 'test-account-id',
  user_id: 'test-user-id'
};

console.log('\n📥 Transação importada:');
Object.keys(importedTransaction).forEach(key => {
  console.log(`  ${key}:`, importedTransaction[key]);
});

// Verificar campos obrigatórios
const requiredFields = ['description', 'amount', 'date', 'type', 'payment_method'];
const missingFields = requiredFields.filter(field => !importedTransaction[field]);

if (missingFields.length > 0) {
  console.log('\n❌ CAMPOS FALTANDO:', missingFields.join(', '));
} else {
  console.log('\n✅ Todos os campos obrigatórios presentes!');
}

// Teste 5: Validação de vinculação (account_id ou card_id)
console.log('\n\nTeste 5: Validação de Vinculação');
console.log('------------------------------------------');

function validateLinkage(transactions) {
  const missingLinkage = transactions.filter(t => !t.account_id && !t.card_id);
  return missingLinkage;
}

const testTransactions = [
  { description: 'Compra 1', account_id: 'acc-1', card_id: null },
  { description: 'Compra 2', account_id: null, card_id: 'card-1' },
  { description: 'Compra 3', account_id: null, card_id: null }, // Inválida
];

console.log('\n🔗 Testando vinculação de transações:');
testTransactions.forEach((t, i) => {
  const hasLinkage = t.account_id || t.card_id;
  console.log(`  Transação ${i + 1}: ${t.description}`);
  console.log(`    account_id: ${t.account_id || 'null'}`);
  console.log(`    card_id: ${t.card_id || 'null'}`);
  console.log(`    Status: ${hasLinkage ? '✅ Válida' : '❌ Sem vinculação'}`);
});

const invalidTransactions = validateLinkage(testTransactions);
if (invalidTransactions.length > 0) {
  console.log(`\n❌ ${invalidTransactions.length} transação(ões) sem conta ou cartão vinculado`);
} else {
  console.log('\n✅ Todas as transações têm vinculação válida!');
}

console.log('\n\n=== FIM DO TESTE DE DIAGNÓSTICO ===\n');

