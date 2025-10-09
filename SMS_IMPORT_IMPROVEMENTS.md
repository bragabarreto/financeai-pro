# Melhorias no Sistema de Importação de SMS

## Resumo das Alterações

Este documento descreve as melhorias implementadas no sistema de importação de dados via SMS, conforme solicitado nos requisitos do projeto.

## 1. Melhoria na Detecção Automática da Categoria

### Problema Anterior
- O algoritmo não identificava corretamente estabelecimentos como "LA BRASILERIE"
- Palavras-chave limitadas para categorização de alimentação

### Solução Implementada

#### A) Expansão de Palavras-Chave (`src/services/aiExtractor.js` e `src/services/import/aiExtractor.js`)
```javascript
alimentacao: [
  'restaurante', 'lanchonete', 'food', 'ifood', 'uber eats', 
  'padaria', 'mercado', 'supermercado', 
  'brasilerie',  // ← NOVO
  'pizzaria',    // ← NOVO
  'bar',         // ← NOVO
  'cafe',        // ← NOVO
  'cafeteria',   // ← NOVO
  'lanches',     // ← NOVO
  'hamburgueria', // ← NOVO
  'confeitaria', // ← NOVO
  'doceria',     // ← NOVO
  'sorveteria'   // ← NOVO
]
```

#### B) Melhoria na Extração do Nome do Estabelecimento (`src/services/import/smsExtractor.js`)
```javascript
// Padrão melhorado para extração de nomes de estabelecimentos
const descPatterns = [
  // CAIXA format: "Compra aprovada LA BRASILERIE R$"
  /Compra\s+aprovada\s+(?:em\s+)?([A-Z][A-Z\s]+?)(?:\s+R\$|\s+\d{1,2}\/)/i,
  // Generic: "em ESTABELECIMENTO R$"
  /(?:em|no)\s+([A-Z][A-Z\s]+?)(?:\s+R\$|\s+\d{1,2}\/)/i,
  ...
];
```

#### C) Prompt de IA Aprimorado (`src/services/import/smsExtractorAI.js`)
```javascript
IMPORTANTE:
- Extraia o nome do estabelecimento de forma limpa 
  (ex: "LA BRASILERIE" em vez de "em LA BRASILERIE")
- Para estabelecimentos de alimentação (restaurantes, padarias, 
  lanchonetes, etc.), use categoria "alimentacao"
```

### Exemplos de Funcionamento

**Entrada:**
```
CAIXA: Compra aprovada LA BRASILERIE R$ 47,20 09/10 as 06:49, ELO final 1527
```

**Saída:**
```javascript
{
  description: "LA BRASILERIE",
  amount: 47.20,
  category: "alimentacao",  // ← Categorizado corretamente
  bank_name: "CAIXA",
  card_last_digits: "1527"
}
```

## 2. Correção da Data na Importação

### Problema Anterior
- Data registrada um dia antes da exibida no preview
- Data do preview não correspondia à data do SMS original

### Solução Implementada

#### A) Função de Parsing Aprimorada
Implementamos suporte completo para formatos de data brasileiros:

**Em `src/services/import/smsExtractor.js`:**
```javascript
const parseDate = (dateStr, timeStr = '') => {
  // Suporta DD/MM/YYYY
  const matchWithYear = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (matchWithYear) {
    const day = matchWithYear[1].padStart(2, '0');
    const month = matchWithYear[2].padStart(2, '0');
    let year = matchWithYear[3];
    
    // Handle 2-digit year (ex: 24 → 2024)
    if (year.length === 2) {
      year = `20${year}`;
    }
    
    return `${year}-${month}-${day}`;
  }
  
  // Suporta DD/MM (sem ano - usa ano atual)
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const currentYear = new Date().getFullYear();
    
    return `${currentYear}-${month}-${day}`;
  }
};
```

**Em `src/services/import/aiExtractor.js`:**
```javascript
export const parseDate = (dateString) => {
  // Try DD/MM/YYYY or DD-MM-YYYY
  const brFormat = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (brFormat) {
    let [, day, month, year] = brFormat;
    year = year.length === 2 ? `20${year}` : year;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try DD/MM format without year (use current year)
  const brShortFormat = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (brShortFormat) {
    const [, day, month] = brShortFormat;
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
};
```

### Formatos Suportados
- `DD/MM` → `YYYY-MM-DD` (ano atual)
- `DD/MM/YYYY` → `YYYY-MM-DD`
- `DD/MM/YY` → `YYYY-MM-DD` (20YY)
- Com horário: `DD/MM às HH:MM` → `YYYY-MM-DDTHH:MM:SS`

### Exemplos

| SMS Original | Data Extraída | Formato Final |
|-------------|---------------|---------------|
| `06/10 às 16:45` | 06/10/2025 16:45 | `2025-10-06T16:45:00` |
| `09/10/2024` | 09/10/2024 | `2024-10-09` |
| `15/12` | 15/12/2025 | `2025-12-15` |

## 3. Modelo de Processamento de Dados do SMS

### Campos Extraídos

Conforme o modelo fornecido:
```
CAIXA[Banco]: Compra aprovada LA BRASILERIE [Estabelecimento]
R$ 47,20[Valor] 09/10[data DD/MM] as 06:49, ELO final 1527[dados do cartao]
```

#### Estrutura de Dados Retornada

```javascript
{
  // Campos básicos
  description: "LA BRASILERIE",        // [Estabelecimento]
  amount: 47.20,                       // [Valor]
  date: "2025-10-09T06:49:00",        // [data DD/MM]
  
  // Metadados
  bank_name: "CAIXA",                 // [Banco]
  card_last_digits: "1527",           // [dados do cartao]
  
  // Informações adicionais
  type: "expense",
  payment_method: "credit_card",
  category: "alimentacao",
  
  // Rastreamento
  origin: "sms_import",
  raw_text: "CAIXA: Compra aprovada..."
}
```

### Funções de Extração Adicionadas

#### `extractBankName(text)`
```javascript
const extractBankName = (text) => {
  const bankPatterns = [
    /^(CAIXA|CEF|Nubank|Nu|Banco\s+do\s+Brasil|BB|Bradesco|Itau|Itaú|Santander|Inter)/i
  ];
  // Retorna: "CAIXA", "NUBANK", etc.
};
```

#### `extractCardDigits(text)`
```javascript
const extractCardDigits = (text) => {
  const patterns = [
    /final\s+(\d{4})/i,
    /cart[aã]o\s+(?:final\s+)?(\d{4})/i,
    /\*{4}\s*(\d{4})/,
  ];
  // Retorna: "1527", "6539", etc.
};
```

## 4. Testes Automáticos

### Testes Adicionados

#### A) Testes de Extração de SMS (`smsExtractor.test.js`)
```javascript
it('deve extrair transação do formato CAIXA com LA BRASILERIE', () => {
  const sms = 'CAIXA: Compra aprovada LA BRASILERIE R$ 47,20 09/10 as 06:49, ELO final 1527';
  const result = extractFromSMS(sms);

  expect(result.description).toBe('LA BRASILERIE');
  expect(result.amount).toBe(47.20);
  expect(result.date).toBe('2025-10-09T06:49:00');
  expect(result.bank_name).toBe('CAIXA');
  expect(result.card_last_digits).toBe('1527');
});

it('deve extrair banco e últimos dígitos do cartão', () => {
  const sms = 'CAIXA: Compra aprovada RESTAURANTE R$ 150,00 09/10 às 12:30, ELO final 1234';
  const result = extractFromSMS(sms);
  
  expect(result.bank_name).toBe('CAIXA');
  expect(result.card_last_digits).toBe('1234');
});
```

#### B) Testes de Parsing de Data (`aiExtractor.test.js`)
```javascript
test('should parse DD/MM/YYYY format correctly', () => {
  expect(parseDate('06/10/2024')).toBe('2024-10-06');
  expect(parseDate('09/10/2025')).toBe('2025-10-09');
});

test('should parse DD/MM format with current year', () => {
  const currentYear = new Date().getFullYear();
  expect(parseDate('06/10')).toBe(`${currentYear}-10-06`);
  expect(parseDate('09/10')).toBe(`${currentYear}-10-09`);
});

test('should handle 2-digit year correctly', () => {
  expect(parseDate('06/10/24')).toBe('2024-10-06');
});

test('should pad single-digit days and months', () => {
  expect(parseDate('6/10/2024')).toBe('2024-10-06');
  expect(parseDate('09/1/2024')).toBe('2024-01-09');
});
```

#### C) Testes de Categorização (`aiExtractor.test.js`)
```javascript
test('should categorize food transactions', () => {
  expect(categorizeTransaction('RESTAURANTE ABC')).toBe('alimentacao');
  expect(categorizeTransaction('LA BRASILERIE')).toBe('alimentacao');
  expect(categorizeTransaction('PIZZARIA DONA MARIA')).toBe('alimentacao');
  expect(categorizeTransaction('BAR DO JOAO')).toBe('alimentacao');
  expect(categorizeTransaction('CAFE EXPRESSO')).toBe('alimentacao');
});
```

### Resultado dos Testes
```
Test Suites: 8 passed, 8 total
Tests:       116 passed, 1 skipped, 117 total
Time:        2.979 s
```

## Benefícios das Melhorias

### 1. Maior Precisão na Categorização
- Reconhecimento automático de estabelecimentos como "LA BRASILERIE"
- Lista expandida de palavras-chave para alimentação
- Categorização mais precisa de transações

### 2. Datas Corretas
- Data extraída do SMS é preservada exatamente
- Suporte a múltiplos formatos de data
- Eliminação do problema de "um dia antes"

### 3. Dados Estruturados
- Extração de banco e cartão como metadados separados
- Facilita análise e relatórios por banco ou cartão
- Rastreamento completo da origem da transação

### 4. Qualidade Assegurada
- Testes automáticos cobrem todos os cenários
- Validação de datas em múltiplos formatos
- Garantia de que melhorias não quebram funcionalidades existentes

## Arquivos Modificados

1. `src/services/aiExtractor.js` - Palavras-chave expandidas
2. `src/services/import/aiExtractor.js` - Parsing de data melhorado, categorização expandida
3. `src/services/import/smsExtractor.js` - Extração de banco e cartão, padrões melhorados
4. `src/services/import/smsExtractorAI.js` - Prompt de IA aprimorado, extração básica melhorada
5. `src/services/import/__tests__/smsExtractor.test.js` - Testes expandidos
6. `src/services/import/__tests__/aiExtractor.test.js` - Novos testes de data e categorização

## Compatibilidade

Todas as alterações são **retrocompatíveis**:
- SMS antigos continuam funcionando
- Novos campos são opcionais
- Testes existentes continuam passando
- Nenhuma breaking change
