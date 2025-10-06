# Example Usage - New Import Features

## Example 1: Importing Mixed Transactions

### Input CSV File
```csv
Data,Descrição,Valor,Beneficiário,Depositante
15/01/2024,RESTAURANTE XYZ,150.00,,João Silva
20/01/2024,PAGAMENTO SALARIO,5000.00,João Silva,Empresa ABC
25/01/2024,APLICACAO CDB,2000.00,João Silva,João Silva
30/01/2024,Compra PIX Supermercado,250.00,,João Silva
```

### AI Detection Results
```javascript
[
  {
    date: "2024-01-15",
    description: "RESTAURANTE XYZ",
    amount: 150.00,
    type: "expense",              // ✅ Auto-detected (no beneficiary match)
    category: "alimentacao",      // ✅ Auto-detected from description
    payment_method: null,         // ⚠️ Needs manual selection
    confidence: 80
  },
  {
    date: "2024-01-20",
    description: "PAGAMENTO SALARIO",
    amount: 5000.00,
    type: "income",               // ✅ Auto-detected (user is beneficiary)
    category: "salario",          // ✅ Auto-detected from description
    payment_method: "paycheck",   // ✅ Auto-detected from description
    confidence: 100
  },
  {
    date: "2024-01-25",
    description: "APLICACAO CDB",
    amount: 2000.00,
    type: "investment",           // ✅ Auto-detected (user is both)
    category: "outros",
    payment_method: null,         // ⚠️ Needs manual selection
    confidence: 70
  },
  {
    date: "2024-01-30",
    description: "Compra PIX Supermercado",
    amount: 250.00,
    type: "expense",              // ✅ Auto-detected
    category: "alimentacao",      // ✅ Auto-detected
    payment_method: "pix",        // ✅ Auto-detected from description
    confidence: 100
  }
]
```

## Example 2: Bulk Editing in Preview

### Scenario
You imported 20 supermarket transactions but forgot to set the payment method.

### Steps
1. **Select Transactions**
   - Check the boxes for all supermarket transactions
   - Or use "Selecionar Todas" if all are supermarket

2. **Open Bulk Edit**
   - Click "Edição em Lote" button
   - Purple panel appears

3. **Apply Changes**
   - Campo: Select "Meio de Pagamento"
   - Valor: Select "Cartão de Débito"
   - Click "Aplicar"

4. **Result**
   - All 20 selected transactions now have payment_method = "debit_card"
   - Individual editing still possible if needed

## Example 3: Context-Aware Payment Methods

### When Transaction Type = "Despesa"
```
Available options:
├── Cartão de Crédito
├── Cartão de Débito
├── PIX
├── Transferência
├── Conta Bancária
└── Contracheque
```

### When Transaction Type = "Receita"
```
Available options:
├── Crédito em Conta
├── Crédito em Cartão
├── Contracheque
├── PIX
└── Transferência
```

### When Transaction Type = "Investimento"
```
Available options:
├── Aplicação
└── Resgate
```

## Example 4: Smart Type Detection

### Case 1: Investment Detection
```javascript
// Input
{
  beneficiario: "João Silva",
  depositante: "João Silva",
  descricao: "Aplicação Tesouro Direto"
}

// Detection Logic
userIdentifier = "João Silva"
beneficiary matches user → true
depositor matches user → true
→ type = "investment" ✅
```

### Case 2: Income Detection
```javascript
// Input
{
  beneficiario: "João Silva",
  depositante: "Empresa XYZ",
  descricao: "Pagamento de Serviços"
}

// Detection Logic
userIdentifier = "João Silva"
beneficiary matches user → true
depositor matches user → false
→ type = "income" ✅
```

### Case 3: Expense Detection
```javascript
// Input
{
  beneficiario: "Loja ABC",
  depositante: "João Silva",
  descricao: "Compra de produtos"
}

// Detection Logic
userIdentifier = "João Silva"
beneficiary matches user → false
→ type = "expense" ✅
```

## Example 5: Confidence Score Calculation

### High Confidence Transaction (100%)
```javascript
{
  date: "2024-01-15",           // +25 points ✅
  amount: 150.00,               // +25 points ✅
  description: "RESTAURANTE",   // +20 points ✅
  type: "expense",              // +15 points ✅
  category: "alimentacao",      // +10 points ✅
  payment_method: "credit_card" // +5 points ✅
}
// Total: 100 points
```

### Medium Confidence Transaction (70%)
```javascript
{
  date: "2024-01-15",           // +25 points ✅
  amount: 150.00,               // +25 points ✅
  description: "Compra",        // +20 points ✅
  type: null,                   // +0 points ❌
  category: null,               // +0 points ❌
  payment_method: null          // +0 points ❌
}
// Total: 70 points
```

### Low Confidence Transaction (50%)
```javascript
{
  date: "2024-01-15",           // +25 points ✅
  amount: 150.00,               // +25 points ✅
  description: "",              // +0 points ❌
  type: null,                   // +0 points ❌
  category: null,               // +0 points ❌
  payment_method: null          // +0 points ❌
}
// Total: 50 points
```

## Example 6: Import Summary

### Before Import
```
Transações a importar: 25
Receitas: 5
Despesas: 18
Investimentos: 2
Valor total: R$ -2.450,00
```

### Summary Breakdown
- **Receitas**: 5 transactions adding R$ 8.500,00
- **Despesas**: 18 transactions subtracting R$ 6.950,00
- **Investimentos**: 2 transactions subtracting R$ 4.000,00 (moved to investments)
- **Saldo Final**: R$ 8.500,00 - R$ 6.950,00 - R$ 4.000,00 = -R$ 2.450,00

## Example 7: Payment Method Detection Patterns

### Pattern 1: From Field
```javascript
detectPaymentMethod("PIX", "", "expense")
// → "pix" ✅

detectPaymentMethod("Cartão de Crédito", "", "expense")
// → "credit_card" ✅

detectPaymentMethod("TED", "", "expense")
// → "transfer" ✅
```

### Pattern 2: From Description
```javascript
detectPaymentMethod("", "Pagamento via PIX para mercado", "expense")
// → "pix" ✅

detectPaymentMethod("", "Compra no cartão", "expense")
// → "credit_card" ✅

detectPaymentMethod("", "TED para fornecedor", "expense")
// → "transfer" ✅
```

### Pattern 3: Unable to Detect
```javascript
detectPaymentMethod("", "Compra no estabelecimento", "expense")
// → null ⚠️ (needs manual selection)

detectPaymentMethod("", "", "investment")
// → null ⚠️ (investments always need manual selection)
```

## Tips for Best Results

1. **Include Headers**: Name your CSV columns clearly (Data, Descrição, Valor, etc.)
2. **Provide Context**: Include beneficiary and depositor columns when possible
3. **Use Descriptions**: Clear descriptions help with categorization
4. **Review Preview**: Always check the preview before importing
5. **Use Bulk Edit**: Save time by editing multiple transactions at once
6. **Check Confidence**: Low confidence (<50%) requires review
7. **Payment Methods**: AI can detect common patterns, but manual selection may be needed

## Common Import Scenarios

### Scenario A: Bank Statement (Best Case)
```csv
Data,Histórico,Valor,Beneficiário,Origem,Meio de Pagamento
15/01/2024,Pagamento Salário,5000.00,João Silva,Empresa ABC,Contracheque
20/01/2024,Compra Supermercado,-250.00,Mercado XYZ,João Silva,PIX
```
→ High confidence, all fields detected ✅

### Scenario B: Credit Card Invoice
```csv
Data,Estabelecimento,Valor
15/01/2024,RESTAURANTE ABC,150.00
16/01/2024,POSTO GASOLINA,200.00
```
→ Medium confidence, need to set payment_method to "credit_card" manually ⚠️

### Scenario C: Investment Report
```csv
Data,Operação,Valor,Tipo
05/01/2024,CDB BANCO XYZ,2000.00,Aplicação
15/02/2024,TESOURO DIRETO,1500.00,Resgate
```
→ Type detected as investment, payment_method needs manual selection ⚠️

## Validation Checklist

Before importing, verify:
- ✅ All dates are valid
- ✅ All amounts are positive numbers
- ✅ Descriptions are meaningful
- ✅ Transaction types are correct
- ✅ Payment methods are selected
- ✅ Confidence scores are acceptable (>50%)
- ✅ Selected correct account for import

Happy importing! 🎉
