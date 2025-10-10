# 🚀 Guia Rápido - Validação de Transações

## Para Desenvolvedores

### ✅ Executar Testes
```bash
# Todos os testes
npm test -- --watchAll=false

# Apenas testes de validação
npm test -- --watchAll=false TransactionRegistrationValidation

# Com cobertura
npm test -- --watchAll=false --coverage
```

### ✅ Status Esperado
```
Test Suites: 10 passed, 10 total
Tests:       167 passed, 1 skipped, 168 total
```

---

## Campos Obrigatórios

### Todo registro DEVE ter:
```javascript
{
  type: 'expense' | 'income' | 'investment',  // Obrigatório
  description: string,                         // Não-vazio
  amount: number,                              // > 0
  date: 'YYYY-MM-DD',                          // Formato ISO
  category: string,                            // ID da categoria
  payment_method: string,                      // Ver métodos abaixo
  user_id: string                              // ID do usuário
}
```

### Métodos de Pagamento Válidos:
```javascript
const validPaymentMethods = [
  'credit_card',      // Exige card_id
  'debit_card',       // Exige account_id
  'pix',              // Exige account_id
  'transfer',         // Exige account_id
  'cash',             // Não exige linkage
  'boleto_bancario',  // Não exige linkage
  'application',      // Exige account_id
  'redemption',       // Exige account_id
  'paycheck'          // Exige account_id
];
```

### Validação Condicional:
```javascript
// Se payment_method === 'credit_card'
→ DEVE ter: card_id
→ NÃO DEVE ter: account_id (ou null)

// Se payment_method in ['debit_card', 'pix', 'transfer', 'paycheck', ...]
→ DEVE ter: account_id
→ NÃO DEVE ter: card_id (ou null)
```

---

## Campos Opcionais (Mas Preservados!)

```javascript
{
  // Campos opcionais importantes
  is_alimony: boolean,              // Default: false (não undefined!)
  origin: string,                   // Ex: 'csv_import', 'manual'
  source: string,                   // Ex: 'csv', 'sms', 'photo'
  confidence: number,               // 0-100 (para imports)
  
  // Parcelamento
  is_installment: boolean,
  installment_count: number,
  installment_due_dates: string[],
  last_installment_date: string,
  
  // Metadados de IA
  aiEnhanced: boolean,
  aiSuggestedCategory: string,
  card_last_digits: string,
  imageFile: string,
  
  // Outros
  beneficiary: string,
  depositor: string
}
```

---

## ⚠️ Armadilhas Comuns

### 1. Não confundir `false` com campo faltante
```javascript
// ❌ ERRADO
if (!transaction.is_alimony) {
  // Vai executar tanto para false quanto para undefined!
}

// ✅ CORRETO
if (transaction.is_alimony === undefined) {
  transaction.is_alimony = false;
}
```

### 2. Não usar métodos locais de Date (timezone!)
```javascript
// ❌ ERRADO - Pode mudar 1 dia dependendo do timezone
const date = new Date('2025-10-10T00:00:00Z');
const day = date.getDate();  // Método LOCAL

// ✅ CORRETO - Usa UTC
const date = new Date('2025-10-10T00:00:00Z');
const day = date.getUTCDate();  // Método UTC
```

### 3. Não remover campos durante mapping
```javascript
// ❌ ERRADO - Remove campos importantes
const dataToSave = {
  type: transaction.type,
  description: transaction.description,
  amount: transaction.amount
  // Onde estão payment_method, is_alimony, origin???
};

// ✅ CORRETO - Preserva todos os campos
const dataToSave = {
  ...transaction,  // Spread mantém tudo
  user_id: user.id,
  amount: parseFloat(transaction.amount) || 0
};
```

### 4. Validar antes de salvar
```javascript
// ✅ SEMPRE validar campos obrigatórios
if (!transaction.description?.trim()) {
  throw new Error('Descrição obrigatória');
}

if (!transaction.payment_method) {
  throw new Error('Selecione método de pagamento');
}

if (transaction.payment_method === 'credit_card' && !transaction.card_id) {
  throw new Error('Selecione um cartão');
}
```

---

## 📝 Padrões de Código

### Salvamento Manual (TransactionModal)
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // 1. Validar campos obrigatórios
  if (!formData.description.trim() || !formData.category) {
    setError('Preencha todos os campos obrigatórios');
    return;
  }
  
  // 2. Validar payment_method
  if (!formData.payment_method) {
    setError('Selecione o meio de pagamento');
    return;
  }
  
  // 3. Validar linkage
  if (formData.payment_method === 'credit_card' && !formData.card_id) {
    setError('Selecione um cartão de crédito');
    return;
  }
  
  // 4. Preparar dados
  const dataToSave = {
    ...formData,
    card_id: formData.payment_method === 'credit_card' ? formData.card_id : null,
    account_id: formData.payment_method === 'credit_card' ? null : formData.account_id
  };
  
  // 5. Salvar
  await onSave(dataToSave);
};
```

### Salvamento de Importação (App.jsx)
```javascript
const handleBulkImportTransactions = async (transactions) => {
  // 1. Mapear dados preservando campos
  const dataToSave = transactions.map(t => ({
    ...t,  // ⭐ IMPORTANTE: Preserva TODOS os campos
    user_id: user.id,
    amount: parseFloat(t.amount) || 0,
    // Remove apenas campos de UI
    suggestedCategory: undefined,
    categoryConfidence: undefined,
    isSuggestion: undefined
  }));
  
  // 2. Salvar no banco
  const { error } = await supabase
    .from('transactions')
    .insert(dataToSave);
    
  if (error) throw error;
};
```

### Parse de Datas Brasileiras
```javascript
const parseBrazilianDate = (dateStr) => {
  if (!dateStr) return null;
  
  // DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Já está em ISO (YYYY-MM-DD)
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return dateStr.split('T')[0];
  }
  
  return null;
};
```

### Parse de Valores Brasileiros
```javascript
const parseBrazilianCurrency = (amountStr) => {
  if (typeof amountStr === 'number') return amountStr;
  if (!amountStr) return 0;
  
  let cleaned = String(amountStr).replace(/R?\$?\s*/g, '');
  
  // Formato brasileiro: 1.234,56
  const hasCommaDecimal = /\d+\.\d{3},\d{2}/.test(cleaned);
  if (hasCommaDecimal) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } 
  // Formato americano: 1,234.56
  else if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/,/g, '');
  }
  // Apenas vírgula: 100,50
  else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  return parseFloat(cleaned) || 0;
};
```

---

## 🧪 Como Adicionar Novos Testes

### 1. Localização
```
src/__tests__/TransactionRegistrationValidation.test.js
```

### 2. Estrutura
```javascript
describe('Sua Nova Feature', () => {
  it('should validate something important', () => {
    // Arrange
    const transaction = {
      type: 'expense',
      amount: 100,
      // ... outros campos
    };
    
    // Act
    const result = validateTransaction(transaction);
    
    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

### 3. Executar
```bash
npm test -- --watchAll=false TransactionRegistrationValidation
```

---

## 🔍 Debug de Problemas

### Problema: Campos sendo perdidos
```javascript
// 1. Adicionar console.log ANTES de salvar
console.log('Dados antes de salvar:', transaction);

// 2. Verificar no banco de dados
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 1;

// 3. Comparar: O que foi enviado vs o que foi salvo
```

### Problema: Data mudando
```javascript
// Verificar se está usando UTC
const date = new Date('2025-10-10T00:00:00Z');
console.log('UTC:', date.toISOString());  // Deve ter 'Z' no final
console.log('Local:', date.toString());   // Mostra timezone local

// Se data mudar 1 dia, trocar para UTC
const utcDate = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
```

### Problema: Validação falhando
```javascript
// 1. Verificar se campo está presente
console.log('payment_method:', transaction.payment_method);

// 2. Verificar tipo
console.log('Tipo:', typeof transaction.payment_method);

// 3. Verificar valor
console.log('Valor:', transaction.payment_method === 'credit_card');
```

---

## 📚 Documentação Completa

Para informações detalhadas, consulte:

- 📄 **TRANSACTION_REGISTRATION_VERIFICATION.md** - Relatório completo de verificação
- 📄 **RESUMO_VISUAL_VERIFICACAO.md** - Resumo visual e estatísticas
- 🧪 **src/__tests__/TransactionRegistrationValidation.test.js** - Código dos testes
- 📄 **FIX_IMPORT_AND_MANUAL_TRANSACTION.md** - Correções anteriores

---

## ✅ Checklist Pré-Commit

```
[ ] npm test passou (167 testes)
[ ] Nenhum console.error no código de produção
[ ] Validações de campos obrigatórios presentes
[ ] Campos opcionais são preservados
[ ] Parse de datas usa UTC
[ ] Parse de valores trata formato brasileiro
[ ] Error handling implementado
[ ] Mensagens de erro são claras
```

---

**Atualizado:** 2025-10-10  
**Mantido por:** GitHub Copilot Agent
