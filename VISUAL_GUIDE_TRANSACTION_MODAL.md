# Visual Guide - Updated Transaction Modal

## Before vs After Comparison

### BEFORE: TransactionModal - Limited Fields

```
┌────────────────────────────────────────┐
│  Nova Transação                    [X] │
├────────────────────────────────────────┤
│                                        │
│  Tipo                                  │
│  [Despesa ▼]                          │
│                                        │
│  Descrição *                          │
│  [_________________________]          │
│                                        │
│  Valor *                              │
│  [_________________________]          │
│                                        │
│  Categoria *                          │
│  [Selecione... ▼]                     │
│                                        │
│  Conta *                              │
│  [Selecione... ▼]                     │
│    ❌ SEM OPÇÃO DE CARTÃO!            │
│                                        │
│  Data *                               │
│  [2024-01-15]                         │
│                                        │
│  ☐ Marcar como Pensão Alimentícia     │
│                                        │
│  [Criar Transação]  [Cancelar]        │
│                                        │
└────────────────────────────────────────┘

❌ Problemas:
- Não permite selecionar meio de pagamento
- Não permite vincular a cartões de crédito
- Sempre vincula a uma conta, mesmo para cartão
- Usa "Despesa" em vez de "Gasto"
```

### AFTER: TransactionModal - Complete Fields

```
┌────────────────────────────────────────┐
│  Nova Transação                    [X] │
├────────────────────────────────────────┤
│                                        │
│  Tipo                                  │
│  [Gasto ▼]  ✅ Nomenclatura corrigida │
│                                        │
│  Descrição *                          │
│  [_________________________]          │
│                                        │
│  Valor *                              │
│  [_________________________]          │
│                                        │
│  Categoria *                          │
│  [Selecione... ▼]                     │
│                                        │
│  Meio de Pagamento * ✅ NOVO!         │
│  [Cartão de Crédito ▼]                │
│    - Cartão de Crédito                │
│    - Cartão de Débito                 │
│    - PIX                              │
│    - Transferência                    │
│    - Contracheque                     │
│                                        │
│  Cartão de Crédito * ✅ NOVO!         │
│  [Nubank - Mastercard ▼]              │
│    (Aparece quando meio = Cartão)     │
│                                        │
│  Data *                               │
│  [2024-01-15]                         │
│                                        │
│  ☐ Marcar como Pensão Alimentícia     │
│                                        │
│  [Criar Transação]  [Cancelar]        │
│                                        │
└────────────────────────────────────────┘

✅ Melhorias:
- Campo de meio de pagamento
- Vinculação a cartões de crédito
- Seleção condicional (cartão OU conta)
- Validações apropriadas
- Nomenclatura consistente
```

## Flow Examples

### Example 1: Creating an Expense with Credit Card

```
Passo 1: Selecionar Tipo
┌─────────────────────┐
│ Tipo                │
│ [Gasto ▼]          │
│  - Gasto            │
│  - Receita          │
│  - Investimento     │
└─────────────────────┘

Passo 2: Preencher Dados Básicos
Descrição: "Supermercado Extra"
Valor: R$ 245,80
Categoria: "Alimentação"

Passo 3: Selecionar Meio de Pagamento
┌─────────────────────────────┐
│ Meio de Pagamento *         │
│ [Cartão de Crédito ▼]      │
│  - Cartão de Crédito ✅     │
│  - Cartão de Débito         │
│  - PIX                      │
│  - Transferência            │
│  - Contracheque             │
└─────────────────────────────┘

Passo 4: Sistema Mostra Seletor de Cartões
┌─────────────────────────────┐
│ Cartão de Crédito *         │
│ [Nubank - Mastercard ▼]    │
│  - Nubank - Mastercard      │
│  - Itaú - Visa              │
│  - C6 Bank - Elo            │
└─────────────────────────────┘

Passo 5: Salvar
✅ Transação criada com:
   - payment_method: 'credit_card'
   - card_id: [ID do Nubank]
   - account_id: null
```

### Example 2: Creating an Income with PIX

```
Passo 1: Selecionar Tipo
┌─────────────────────┐
│ Tipo                │
│ [Receita ▼]        │
└─────────────────────┘

Passo 2: Preencher Dados Básicos
Descrição: "Freelance - Design Logo"
Valor: R$ 800,00
Categoria: "Freelance"

Passo 3: Selecionar Meio de Pagamento
┌─────────────────────────────┐
│ Meio de Pagamento *         │
│ [PIX ▼]                     │
│  - Transferência            │
│  - PIX ✅                   │
│  - Crédito em Cartão        │
│  - Contracheque             │
└─────────────────────────────┘

Passo 4: Sistema Mostra Seletor de Contas
┌─────────────────────────────┐
│ Conta Bancária *            │
│ [Nubank ⭐ (Principal) ▼]  │
│  - Nubank ⭐ (Principal)    │
│  - Itaú                     │
│  - C6 Bank                  │
└─────────────────────────────┘

Passo 5: Salvar
✅ Transação criada com:
   - payment_method: 'pix'
   - card_id: null
   - account_id: [ID do Nubank]
```

### Example 3: Creating an Investment

```
Passo 1: Selecionar Tipo
┌─────────────────────┐
│ Tipo                │
│ [Investimento ▼]   │
└─────────────────────┘

Passo 2: Preencher Dados Básicos
Descrição: "CDB Banco XYZ"
Valor: R$ 1000,00
Categoria: "Renda Fixa"

Passo 3: Selecionar Meio de Pagamento
┌─────────────────────────────┐
│ Meio de Pagamento *         │
│ [Aplicação ▼]              │
│  - Aplicação ✅             │
│  - Resgate                  │
└─────────────────────────────┘
(Apenas 2 opções para investimentos)

Passo 4: Sistema Mostra Seletor de Contas
┌─────────────────────────────┐
│ Conta Bancária *            │
│ [Nubank ⭐ (Principal) ▼]  │
└─────────────────────────────┘

Passo 5: Salvar
✅ Transação criada com:
   - payment_method: 'application'
   - card_id: null
   - account_id: [ID do Nubank]
```

## Import Modal - New Column

### BEFORE: Import Preview Table

```
┌──────────────────────────────────────────────────────────────────────┐
│ [ ] │ Data       │ Descrição        │ Valor   │ Tipo  │ ... │ Conf. │
├──────────────────────────────────────────────────────────────────────┤
│ [✓] │ 2024-01-15 │ Supermercado     │ 245.80  │ Gasto │ ... │ 95%   │
│ [✓] │ 2024-01-16 │ Freelance        │ 800.00  │ Rec.  │ ... │ 88%   │
└──────────────────────────────────────────────────────────────────────┘
                          ❌ SEM COLUNA DE PENSÃO
```

### AFTER: Import Preview Table with Alimony Column

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [ ] │ Data       │ Descrição   │ Valor  │ Tipo  │ ... │ Pensão │ Conf. │
├────────────────────────────────────────────────────────────────────────────┤
│ [✓] │ 2024-01-15 │ Supermercado│ 245.80 │ Gasto │ ... │  [ ]   │ 95%   │
│ [✓] │ 2024-01-16 │ Freelance   │ 800.00 │ Rec.  │ ... │   -    │ 88%   │
│ [✓] │ 2024-01-20 │ Pensão João │ 500.00 │ Gasto │ ... │  [✓]   │ 92%   │
└────────────────────────────────────────────────────────────────────────────┘
                          ✅ NOVA COLUNA DE PENSÃO
                          (Checkbox editável apenas para Gastos)
```

## Validation Messages

### Before (Limited Validation):
```
❌ "Preencha todos os campos obrigatórios"
❌ "Valor deve ser maior que zero"
```

### After (Complete Validation):
```
✅ "Preencha todos os campos obrigatórios"
✅ "Valor deve ser maior que zero"
✅ "Selecione o meio de pagamento"
✅ "Selecione um cartão de crédito"
✅ "Selecione uma conta bancária"
```

## Payment Method Options by Type

### For Expenses (Gastos):
```
- Cartão de Crédito    → Shows: Card Selector
- Cartão de Débito     → Shows: Account Selector
- PIX                  → Shows: Account Selector
- Transferência        → Shows: Account Selector
- Contracheque         → Shows: Account Selector
```

### For Income (Receitas):
```
- Transferência        → Shows: Account Selector
- PIX                  → Shows: Account Selector
- Crédito em Cartão    → Shows: Card Selector
- Contracheque         → Shows: Account Selector
```

### For Investments (Investimentos):
```
- Aplicação           → Shows: Account Selector
- Resgate             → Shows: Account Selector
```

## Key Features

✅ **Dynamic Form Fields**: Payment form changes based on selected payment method
✅ **Type-Specific Options**: Each transaction type has appropriate payment methods
✅ **Smart Defaults**: Primary account pre-selected when applicable
✅ **Helpful Messages**: Shows warning if no cards/accounts are available
✅ **Validation**: Ensures all required fields are filled before saving
✅ **Consistent UX**: Same experience as import preview
✅ **Alimony Support**: Can mark expenses as alimony in both manual entry and import

## Technical Implementation

### State Management:
```javascript
const [formData, setFormData] = useState({
  type: 'expense',
  description: '',
  amount: 0,
  category: '',
  account_id: '',
  card_id: '',           // ✅ NEW
  payment_method: '',    // ✅ NEW
  date: new Date().toISOString().split('T')[0],
  origin: '',
  is_alimony: false
});
```

### Conditional Rendering Logic:
```javascript
{formData.payment_method === 'credit_card' ? (
  <CardSelector cards={cards} />
) : formData.payment_method !== '' ? (
  <AccountSelector accounts={accounts} />
) : null}
```

### Data Cleanup on Save:
```javascript
const dataToSave = {
  ...formData,
  card_id: formData.payment_method === 'credit_card' ? formData.card_id : null,
  account_id: formData.payment_method === 'credit_card' ? null : formData.account_id
};
```
