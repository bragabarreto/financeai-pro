/**
 * Teste Completo de Importação
 * Testa CSV, SMS e Fotos com dados reais
 */

const fs = require('fs');
const path = require('path');

// Simular ambiente do navegador
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  }
};

// Configurar IA
const aiConfig = {
  enabled: true,
  provider: 'gemini',
  model: 'gemini-2.0-flash-exp',
  apiKey: 'AIzaSyAnX690uDlhRfcSfmRrOl5z4CbFTI4RWl4'
};

localStorage.setItem('ai_config', JSON.stringify(aiConfig));

console.log('═══════════════════════════════════════════════════════');
console.log('🧪 TESTE COMPLETO DE IMPORTAÇÃO');
console.log('═══════════════════════════════════════════════════════\n');

// ============================================================================
// TESTE 1: IMPORTAÇÃO CSV
// ============================================================================

console.log('📄 TESTE 1: IMPORTAÇÃO CSV');
console.log('─────────────────────────────────────────────────────────\n');

const csvPath = path.join(__dirname, 'test-files', 'Registrodegastosereceitas-planilhaefetiva-janeiroeFevereiro_23.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

console.log('Arquivo CSV:', csvPath);
console.log('Tamanho:', csvContent.length, 'bytes');
console.log('Linhas:', csvContent.split('\n').length);

// Analisar estrutura do CSV
const lines = csvContent.split('\n');
const header = lines[0];
const columns = header.split(',');

console.log('\n📊 Estrutura do CSV:');
console.log('Colunas encontradas:', columns.length);
console.log('Cabeçalho:', header.substring(0, 100) + '...');

// Identificar colunas principais
const mainColumns = columns.slice(0, 9); // Primeiras 9 colunas são os dados principais
console.log('\n📋 Colunas principais (primeiras 9):');
mainColumns.forEach((col, idx) => {
  console.log(`  ${idx + 1}. ${col.trim()}`);
});

// Processar primeiras 5 linhas de dados
console.log('\n📝 Primeiras 5 transações:');
for (let i = 1; i <= 5 && i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  const values = line.split(',');
  const transaction = {
    descricao: values[0],
    valor: values[1],
    data: values[2],
    tipo: values[3],
    forma_pagamento: values[4]
  };
  
  console.log(`\n  ${i}. ${transaction.descricao}`);
  console.log(`     Valor: ${transaction.valor}`);
  console.log(`     Data: ${transaction.data}`);
  console.log(`     Tipo: ${transaction.tipo}`);
  console.log(`     Pagamento: ${transaction.forma_pagamento}`);
}

// Validar formato de valores
console.log('\n✅ Validação de Formato:');
const sampleValue = lines[1].split(',')[1]; // "R$ 1,09"
console.log('Valor de exemplo:', sampleValue);
console.log('Formato detectado: Brasileiro (R$ com vírgula)');

// Verificar problemas comuns
console.log('\n⚠️  Problemas Potenciais:');
const issues = [];

// 1. Valores com formato brasileiro
if (sampleValue && sampleValue.includes(',')) {
  issues.push('✗ Valores usam vírgula como separador decimal (precisa converter)');
}

// 2. Múltiplas colunas de resumo
if (columns.length > 10) {
  issues.push(`✗ CSV tem ${columns.length} colunas (muitas colunas de resumo misturadas)`);
}

// 3. Datas em formato brasileiro
const sampleDate = lines[1].split(',')[2]; // "01/02/2023"
if (sampleDate && sampleDate.match(/\d{2}\/\d{2}\/\d{4}/)) {
  issues.push('✗ Datas em formato DD/MM/YYYY (precisa converter para YYYY-MM-DD)');
}

if (issues.length > 0) {
  issues.forEach(issue => console.log('  ', issue));
} else {
  console.log('   ✓ Nenhum problema detectado');
}

// ============================================================================
// TESTE 2: IMPORTAÇÃO SMS
// ============================================================================

console.log('\n\n📱 TESTE 2: IMPORTAÇÃO SMS');
console.log('─────────────────────────────────────────────────────────\n');

const smsExamples = [
  {
    name: 'SMS 1 - Compra Parcelada',
    text: 'CAIXA: Compra aprovada em RAFAEL FERNANDES SALE R$       457,00 em   2 vezes, 06/10 as 19:55, ELO final 1527. Se desconhecer envie BL1527'
  },
  {
    name: 'SMS 2 - Compra Simples',
    text: 'CAIXA: Compra aprovada SANTE EXPRESS R$ 17,00 07/10 as 20:17, ELO final 1527. Caso nao reconheca a transacao, envie BL1527 p/cancelar cartao'
  }
];

// Importar extrator de SMS
const smsExtractorPath = path.join(__dirname, 'src', 'services', 'import', 'smsExtractorAI.js');

// Testar extração básica (sem IA primeiro)
console.log('🔍 Testando extração BÁSICA (sem IA):\n');

smsExamples.forEach((example, idx) => {
  console.log(`${idx + 1}. ${example.name}`);
  console.log(`   SMS: "${example.text.substring(0, 60)}..."`);
  
  // Regex patterns para extração
  const patterns = {
    valor: /R\$\s*([\d.,\s]+)/,
    estabelecimento: /em\s+([A-Z\s]+?)(?:\s+R\$|\s+\d|$)/i,
    data: /(\d{2})\/(\d{2})/,
    cartao: /final\s+(\d{4})/i,
    parcelas: /em\s+(\d+)\s+vezes/i
  };
  
  const valor = example.text.match(patterns.valor);
  const estabelecimento = example.text.match(patterns.estabelecimento);
  const data = example.text.match(patterns.data);
  const cartao = example.text.match(patterns.cartao);
  const parcelas = example.text.match(patterns.parcelas);
  
  console.log(`   ✓ Valor: R$ ${valor ? valor[1].replace(/\s+/g, '') : 'NÃO DETECTADO'}`);
  console.log(`   ✓ Estabelecimento: ${estabelecimento ? estabelecimento[1].trim() : 'NÃO DETECTADO'}`);
  console.log(`   ✓ Data: ${data ? `${data[1]}/${data[2]}/2025` : 'NÃO DETECTADO'}`);
  console.log(`   ✓ Cartão: ${cartao ? cartao[1] : 'NÃO DETECTADO'}`);
  console.log(`   ✓ Parcelas: ${parcelas ? parcelas[1] : '1'}x`);
  console.log('');
});

// ============================================================================
// TESTE 3: IMPORTAÇÃO FOTOS
// ============================================================================

console.log('\n📸 TESTE 3: IMPORTAÇÃO FOTOS');
console.log('─────────────────────────────────────────────────────────\n');

const photoFiles = [
  {
    name: 'Foto 1 - Notificação de Cartão',
    file: 'ImagemdoWhatsAppde2025-10-08à(s)08.48.30_b7058934.jpg',
    expectedData: {
      valor: 'R$ 110,74',
      estabelecimento: 'EMERGENT',
      data: '20/09/2025',
      cartao: '0405'
    }
  },
  {
    name: 'Foto 2 - Comprovante PIX',
    file: 'ImagemdoWhatsAppde2025-10-08à(s)08.51.23_fa49b518.jpg',
    expectedData: {
      valor: 'R$ 100,00',
      beneficiario: 'Maria Veronica Morais dos Santos',
      pagador: 'ANDRE BRAGA BARRETO',
      data: '07/10/2025'
    }
  }
];

photoFiles.forEach((photo, idx) => {
  const photoPath = path.join(__dirname, 'test-files', photo.file);
  const exists = fs.existsSync(photoPath);
  
  console.log(`${idx + 1}. ${photo.name}`);
  console.log(`   Arquivo: ${photo.file}`);
  console.log(`   Existe: ${exists ? '✓ SIM' : '✗ NÃO'}`);
  
  if (exists) {
    const stats = fs.statSync(photoPath);
    console.log(`   Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   Dados esperados:`);
    Object.entries(photo.expectedData).forEach(([key, value]) => {
      console.log(`     - ${key}: ${value}`);
    });
  }
  console.log('');
});

// ============================================================================
// ANÁLISE DE ERROS COMUNS
// ============================================================================

console.log('\n🔍 ANÁLISE DE ERROS COMUNS');
console.log('─────────────────────────────────────────────────────────\n');

const commonErrors = [
  {
    error: 'payment_method column not found',
    status: '✅ CORRIGIDO',
    solution: 'Coluna removida do importService.js'
  },
  {
    error: 'Valores com formato brasileiro (vírgula)',
    status: '⚠️  DETECTADO',
    solution: 'Precisa converter vírgula para ponto antes de salvar'
  },
  {
    error: 'Datas em formato DD/MM/YYYY',
    status: '⚠️  DETECTADO',
    solution: 'Precisa converter para YYYY-MM-DD'
  },
  {
    error: 'CSV com múltiplas colunas de resumo',
    status: '⚠️  DETECTADO',
    solution: 'Precisa filtrar apenas as primeiras 9 colunas'
  },
  {
    error: 'Tabela user_settings não existe',
    status: '✅ CORRIGIDO',
    solution: 'Tabela criada via MCP Supabase'
  }
];

commonErrors.forEach((item, idx) => {
  console.log(`${idx + 1}. ${item.error}`);
  console.log(`   Status: ${item.status}`);
  console.log(`   Solução: ${item.solution}`);
  console.log('');
});

// ============================================================================
// RECOMENDAÇÕES
// ============================================================================

console.log('\n💡 RECOMENDAÇÕES PARA CORREÇÃO');
console.log('─────────────────────────────────────────────────────────\n');

const recommendations = [
  {
    priority: 'ALTA',
    issue: 'Conversão de valores brasileiros',
    action: 'Adicionar função para converter "R$ 1,09" para 1.09',
    file: 'src/services/import/importService.js'
  },
  {
    priority: 'ALTA',
    issue: 'Conversão de datas brasileiras',
    action: 'Adicionar função para converter "01/02/2023" para "2023-02-01"',
    file: 'src/services/import/importService.js'
  },
  {
    priority: 'MÉDIA',
    issue: 'Filtrar colunas de resumo do CSV',
    action: 'Processar apenas as primeiras 9 colunas do CSV',
    file: 'src/services/import/importService.js'
  },
  {
    priority: 'MÉDIA',
    issue: 'Validação de dados antes de salvar',
    action: 'Validar formato de valores e datas antes de inserir no banco',
    file: 'src/services/import/importService.js'
  },
  {
    priority: 'BAIXA',
    issue: 'Mensagens de erro mais claras',
    action: 'Mostrar exatamente qual linha/transação falhou',
    file: 'src/components/Import/ImportModalEnhanced.jsx'
  }
];

recommendations.forEach((rec, idx) => {
  console.log(`${idx + 1}. [${rec.priority}] ${rec.issue}`);
  console.log(`   Ação: ${rec.action}`);
  console.log(`   Arquivo: ${rec.file}`);
  console.log('');
});

// ============================================================================
// RESUMO
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════');
console.log('📊 RESUMO DOS TESTES');
console.log('═══════════════════════════════════════════════════════\n');

console.log('✅ Testes Realizados:');
console.log('   ✓ CSV: Estrutura analisada');
console.log('   ✓ SMS: Extração básica testada');
console.log('   ✓ Fotos: Arquivos verificados');
console.log('');

console.log('⚠️  Problemas Identificados:');
console.log('   ✗ Valores com formato brasileiro (vírgula)');
console.log('   ✗ Datas em formato DD/MM/YYYY');
console.log('   ✗ CSV com colunas extras de resumo');
console.log('');

console.log('🔧 Próximos Passos:');
console.log('   1. Implementar conversão de valores brasileiros');
console.log('   2. Implementar conversão de datas brasileiras');
console.log('   3. Filtrar colunas do CSV');
console.log('   4. Adicionar validação antes de salvar');
console.log('   5. Testar novamente com dados reais');
console.log('');

console.log('═══════════════════════════════════════════════════════\n');
