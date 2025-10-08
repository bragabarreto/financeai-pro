/**
 * Teste das Funções de Conversão
 * Valida conversão de valores e datas brasileiras
 */

// Importar funções de conversão
const parseBrazilianCurrency = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  let cleaned = value.toString()
    .replace(/["']/g, '')
    .replace(/R\$/g, '')
    .trim();
  
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } 
  else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  const number = parseFloat(cleaned);
  return isNaN(number) ? 0 : number;
};

const parseBrazilianDate = (date) => {
  if (!date) return null;
  
  const cleaned = date.toString().replace(/["']/g, '').trim();
  
  if (cleaned.match(/^\d{4}-\d{2}-\d{2}/)) {
    return cleaned.split('T')[0];
  }
  
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  
  return null;
};

console.log('═══════════════════════════════════════════════════════');
console.log('🧪 TESTE DE FUNÇÕES DE CONVERSÃO');
console.log('═══════════════════════════════════════════════════════\n');

// ============================================================================
// TESTE 1: CONVERSÃO DE VALORES
// ============================================================================

console.log('💰 TESTE 1: CONVERSÃO DE VALORES BRASILEIROS');
console.log('─────────────────────────────────────────────────────────\n');

const currencyTests = [
  { input: '"R$ 1,09"', expected: 1.09 },
  { input: 'R$ 21,90', expected: 21.90 },
  { input: '"R$ 457,00"', expected: 457.00 },
  { input: 'R$ 1.234,56', expected: 1234.56 },
  { input: '"R$ 2.003,77"', expected: 2003.77 },
  { input: 'R$ 10.000,00', expected: 10000.00 },
  { input: '1,09', expected: 1.09 },
  { input: '1234.56', expected: 1234.56 },
  { input: 100, expected: 100 }
];

let currencyPassed = 0;
let currencyFailed = 0;

currencyTests.forEach((test, idx) => {
  const result = parseBrazilianCurrency(test.input);
  const passed = Math.abs(result - test.expected) < 0.01;
  
  if (passed) {
    console.log(`✓ Teste ${idx + 1}: ${test.input} → ${result} ✅`);
    currencyPassed++;
  } else {
    console.log(`✗ Teste ${idx + 1}: ${test.input} → ${result} (esperado: ${test.expected}) ❌`);
    currencyFailed++;
  }
});

console.log(`\nResultado: ${currencyPassed}/${currencyTests.length} testes passaram\n`);

// ============================================================================
// TESTE 2: CONVERSÃO DE DATAS
// ============================================================================

console.log('📅 TESTE 2: CONVERSÃO DE DATAS BRASILEIRAS');
console.log('─────────────────────────────────────────────────────────\n');

const dateTests = [
  { input: '01/02/2023', expected: '2023-02-01' },
  { input: '"01/02/2023"', expected: '2023-02-01' },
  { input: '06/10/2025', expected: '2025-10-06' },
  { input: '31/12/2024', expected: '2024-12-31' },
  { input: '1/1/2023', expected: '2023-01-01' },
  { input: '2023-02-01', expected: '2023-02-01' },
  { input: '2023-02-01T10:30:00', expected: '2023-02-01' }
];

let datePassed = 0;
let dateFailed = 0;

dateTests.forEach((test, idx) => {
  const result = parseBrazilianDate(test.input);
  const passed = result === test.expected;
  
  if (passed) {
    console.log(`✓ Teste ${idx + 1}: ${test.input} → ${result} ✅`);
    datePassed++;
  } else {
    console.log(`✗ Teste ${idx + 1}: ${test.input} → ${result} (esperado: ${test.expected}) ❌`);
    dateFailed++;
  }
});

console.log(`\nResultado: ${datePassed}/${dateTests.length} testes passaram\n`);

// ============================================================================
// TESTE 3: PARSING DE CSV COM ASPAS
// ============================================================================

console.log('📄 TESTE 3: PARSING DE CSV COM ASPAS');
console.log('─────────────────────────────────────────────────────────\n');

const parseCSVProperly = (csvText) => {
  const lines = csvText.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = [];
    let currentField = '';
    let insideQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];
      
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          j++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    row.push(currentField.trim());
    result.push(row);
  }
  
  return result;
};

const csvTests = [
  {
    name: 'CSV simples',
    input: 'agua mineral,"R$ 1,09",01/02/2023,Supermercado',
    expected: ['agua mineral', 'R$ 1,09', '01/02/2023', 'Supermercado']
  },
  {
    name: 'CSV com vírgula dentro de aspas',
    input: '"Bares, restaurantes","R$ 85,25",01/02/2023,Lazer',
    expected: ['Bares, restaurantes', 'R$ 85,25', '01/02/2023', 'Lazer']
  },
  {
    name: 'CSV com aspas escapadas',
    input: 'produto,""R$ 10,00"",01/01/2023',
    expected: ['produto', '"R$ 10,00"', '01/01/2023']
  }
];

let csvPassed = 0;
let csvFailed = 0;

csvTests.forEach((test, idx) => {
  const result = parseCSVProperly(test.input)[0];
  const passed = JSON.stringify(result) === JSON.stringify(test.expected);
  
  console.log(`Teste ${idx + 1}: ${test.name}`);
  console.log(`  Input: ${test.input}`);
  console.log(`  Output: [${result.map(f => `"${f}"`).join(', ')}]`);
  console.log(`  Expected: [${test.expected.map(f => `"${f}"`).join(', ')}]`);
  
  if (passed) {
    console.log(`  ✅ PASSOU\n`);
    csvPassed++;
  } else {
    console.log(`  ❌ FALHOU\n`);
    csvFailed++;
  }
});

console.log(`Resultado: ${csvPassed}/${csvTests.length} testes passaram\n`);

// ============================================================================
// TESTE 4: PROCESSAMENTO COMPLETO
// ============================================================================

console.log('🔄 TESTE 4: PROCESSAMENTO COMPLETO DE TRANSAÇÃO');
console.log('─────────────────────────────────────────────────────────\n');

const sampleCSVLine = 'agua mineral,"R$ 1,09",01/02/2023,"Bares, restaurantes e supérfluos",Crédito Santander';
const parsed = parseCSVProperly(sampleCSVLine)[0];

console.log('Linha CSV original:');
console.log(`  ${sampleCSVLine}\n`);

console.log('Campos parseados:');
parsed.forEach((field, idx) => {
  console.log(`  ${idx + 1}. "${field}"`);
});

console.log('\nTransação processada:');
const transaction = {
  description: parsed[0],
  amount: parseBrazilianCurrency(parsed[1]),
  date: parseBrazilianDate(parsed[2]),
  category: parsed[3],
  payment_method: parsed[4]
};

console.log(`  Descrição: ${transaction.description}`);
console.log(`  Valor: R$ ${transaction.amount.toFixed(2)}`);
console.log(`  Data: ${transaction.date}`);
console.log(`  Categoria: ${transaction.category}`);
console.log(`  Pagamento: ${transaction.payment_method}`);

const isValid = transaction.description && transaction.amount > 0 && transaction.date;
console.log(`\n  Status: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}\n`);

// ============================================================================
// RESUMO FINAL
// ============================================================================

console.log('═══════════════════════════════════════════════════════');
console.log('📊 RESUMO DOS TESTES');
console.log('═══════════════════════════════════════════════════════\n');

const totalTests = currencyTests.length + dateTests.length + csvTests.length;
const totalPassed = currencyPassed + datePassed + csvPassed;
const totalFailed = currencyFailed + dateFailed + csvFailed;
const successRate = ((totalPassed / totalTests) * 100).toFixed(1);

console.log(`Total de testes: ${totalTests}`);
console.log(`✅ Passaram: ${totalPassed}`);
console.log(`❌ Falharam: ${totalFailed}`);
console.log(`📈 Taxa de sucesso: ${successRate}%\n`);

if (totalFailed === 0) {
  console.log('🎉 TODOS OS TESTES PASSARAM! Sistema pronto para uso.\n');
} else {
  console.log('⚠️  Alguns testes falharam. Revisar implementação.\n');
}

console.log('═══════════════════════════════════════════════════════\n');
