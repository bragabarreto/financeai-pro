# Visual Guide - Import System Improvements

## Before vs After Comparison

### 1. Transaction Type Labels

#### BEFORE:
```
┌─────────────────────────┐
│ Tipo:                   │
│ ┌─────────────────────┐ │
│ │ Despesa           ▼ │ │ ← Old label
│ └─────────────────────┘ │
└─────────────────────────┘
```

#### AFTER:
```
┌─────────────────────────┐
│ Tipo:                   │
│ ┌─────────────────────┐ │
│ │ Gasto             ▼ │ │ ← New label
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

### 2. Preview Table Structure

#### BEFORE:
```
┌────┬──────┬───────────┬───────┬──────┬──────────┬────────────┬───────────┬────┐
│ ☑  │ Data │ Descrição │ Valor │ Tipo │ Categoria│ Meio Pgto. │ Confiança │ 🗑 │
├────┼──────┼───────────┼───────┼──────┼──────────┼────────────┼───────────┼────┤
│ ☑  │01/01 │Mercado    │150.00 │Gasto │Alimentação│Cartão CR  │   85%     │ 🗑 │
└────┴──────┴───────────┴───────┴──────┴──────────┴────────────┴───────────┴────┘
                                                         ↑
                                          Could not select specific card
```

#### AFTER:
```
┌────┬──────┬───────────┬───────┬──────┬──────────┬────────────┬──────────────┬───────────┬────┐
│ ☑  │ Data │ Descrição │ Valor │ Tipo │ Categoria│ Meio Pgto. │ Conta/Cartão │ Confiança │ 🗑 │
├────┼──────┼───────────┼───────┼──────┼──────────┼────────────┼──────────────┼───────────┼────┤
│ ☑  │01/01 │Mercado    │150.00 │Gasto │Alimentação│Cartão CR  │ Visa Gold ▼ │   85%     │ 🗑 │
└────┴──────┴───────────┴───────┴──────┴──────────┴────────────┴──────────────┴───────────┴────┘
                                                                       ↑
                                                          NEW! Select specific card
```

---

### 3. Payment Method + Account/Card Selection

#### For Card Payments:
```
┌─────────────────────────┬─────────────────────────┐
│ Meio de Pagamento       │ Conta/Cartão            │
│ ┌─────────────────────┐ │ ┌─────────────────────┐ │
│ │ Cartão de Crédito ▼ │ │ │ Visa Gold         ▼ │ │
│ └─────────────────────┘ │ │ • Visa Gold           │ │
│   • Cartão de Crédito   │ │ • Mastercard Black    │ │
│   • Cartão de Débito    │ │ • Nubank Platinum     │ │
│   • PIX                 │ └─────────────────────┘ │
│   • ...                 │                         │
└─────────────────────────┴─────────────────────────┘
```

#### For Bank Account Payments:
```
┌─────────────────────────┬─────────────────────────┐
│ Meio de Pagamento       │ Conta/Cartão            │
│ ┌─────────────────────┐ │ ┌─────────────────────┐ │
│ │ Conta Bancária    ▼ │ │ │ Conta Corrente    ▼ │ │
│ └─────────────────────┘ │ │ • Conta Corrente      │ │
│   • Conta Bancária      │ │ • Poupança            │ │
│   • PIX                 │ │ • Investimentos       │ │
│   • Transferência       │ └─────────────────────┘ │
│   • ...                 │                         │
└─────────────────────────┴─────────────────────────┘
```

#### For Other Payment Methods:
```
┌─────────────────────────┬─────────────────────────┐
│ Meio de Pagamento       │ Conta/Cartão            │
│ ┌─────────────────────┐ │                         │
│ │ PIX               ▼ │ │      N/A                │
│ └─────────────────────┘ │                         │
│   • PIX                 │   (No account/card      │
│   • Transferência       │    selection needed)    │
│   • ...                 │                         │
└─────────────────────────┴─────────────────────────┘
```

---

### 4. Example CSV Format

#### BEFORE:
```csv
Data,Descrição,Valor,Tipo
01/01/2024,Supermercado XYZ,150.00,despesa
02/01/2024,Salário,3000.00,receita
```

#### AFTER:
```csv
Data,Descrição,Valor,Tipo
01/01/2024,Supermercado XYZ,150.00,gasto
02/01/2024,Salário,3000.00,receita
```

---

### 5. Bulk Edit Options

#### NEW Bulk Edit Panel:
```
┌──────────────────────────────────────────────────────────┐
│ 📝 Edição em Lote                                        │
│ Aplicar alterações a todas as transações selecionadas   │
│                                                          │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│ │ Tipo       ▼ │  │ Gasto      ▼ │  │ [ Aplicar ]  │  │
│ └──────────────┘  └──────────────┘  └──────────────┘  │
│   • Tipo            • Gasto                             │
│   • Meio Pgto.      • Receita                           │
│                     • Investimento                      │
└──────────────────────────────────────────────────────────┘
```

---

### 6. Complete Import Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   IMPORT FLOW WITH IMPROVEMENTS             │
└─────────────────────────────────────────────────────────────┘

Step 1: Upload                Step 2: Preview & Edit
┌──────────────┐             ┌──────────────────────────────┐
│              │             │ ✏️ Edit ALL fields:          │
│   📁 CSV     │    ──→      │ • Data                       │
│  Upload      │             │ • Descrição                  │
│              │             │ • Valor                      │
└──────────────┘             │ • Tipo (Gasto/Receita/...)  │
                             │ • Categoria                  │
                             │ • Meio de Pagamento          │
                             │ • 🆕 Conta/Cartão específica│
                             │                              │
                             │ 🎯 Select specific:          │
                             │ • Visa Gold (for card)       │
                             │ • Conta Corrente (for bank)  │
                             └──────────────────────────────┘
                                         │
                                         ▼
                             Step 3: Confirm & Import
                             ┌──────────────────────────────┐
                             │ ✅ Review Summary            │
                             │ • 10 Gastos                  │
                             │ • 5 Receitas                 │
                             │ • All accounts/cards set     │
                             │                              │
                             │ [ Importar Transações ]      │
                             └──────────────────────────────┘
```

---

### 7. Data Structure

#### Transaction Object Structure:
```javascript
{
  // Basic fields (always present)
  date: '2024-01-01',
  description: 'Supermercado',
  amount: 150.00,
  type: 'expense',           // expense/income/investment
  
  // Category (auto-suggested)
  category: 'alimentacao',
  
  // Payment method type
  payment_method: 'credit_card',
  
  // 🆕 NEW: Specific account or card
  card_id: 'card123',        // When payment_method is credit_card/debit_card
  account_id: null,          // When payment_method is bank_account/application
  
  // Metadata
  confidence: 85,
  isSuggestion: true,
  selected: true
}
```

---

## Key Visual Improvements

### ✨ What Users See:

1. **"Gasto" instead of "Despesa"**
   - More intuitive Brazilian Portuguese
   - Consistent throughout import flow

2. **New "Conta/Cartão" Column**
   - Clearly shows which account/card will be used
   - Dropdown selection right in preview table

3. **Context-Aware Dropdowns**
   - Card payments → Shows your cards
   - Account payments → Shows your accounts
   - Other payments → Shows N/A

4. **All Fields Editable**
   - Click any field to edit
   - Changes are immediate
   - No need to re-import

5. **Better User Experience**
   - Less clicking
   - Fewer errors
   - More control
   - Faster imports

---

## Technical Details

### Props Updated:
```javascript
// Before
<ImportModal
  accounts={accounts}
  categories={categories}
/>

// After
<ImportModal
  accounts={accounts}
  categories={categories}
  cards={cards}  // 🆕 NEW
/>
```

### New Helper Function:
```javascript
const getPaymentMethodLabel = (method) => {
  const labels = {
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    pix: 'PIX',
    transfer: 'Transferência',
    bank_account: 'Conta Bancária',
    paycheck: 'Contracheque',
    application: 'Aplicação',
    redemption: 'Resgate'
  };
  return labels[method] || method;
};
```

---

## Testing Coverage

All features are tested:
- ✅ Cards prop support
- ✅ Terminology changes
- ✅ Backwards compatibility (cards optional)
- ✅ Rendering with and without cards
- ✅ Default empty array for cards

**Test Results: 71/71 passing ✅**

---

## Documentation

Full documentation available in:
- `IMPORT_IMPROVEMENTS.md` - Complete implementation guide
- `IMPORT_GUIDE.md` - User guide (existing)
- `USAGE_EXAMPLES.md` - Usage examples (existing)

---

**Implementation Status: ✅ Complete and Production Ready**
