# Quick Reference: Payment Method Changes

## What Changed

### Payment Method Options

#### For EXPENSE Transactions

**BEFORE:**
```
✓ Cartão de Crédito
✓ Cartão de Débito  
✓ PIX
✓ Transferência
✓ Conta Bancária       ← REMOVED
✓ Contracheque
```

**AFTER:**
```
✓ Cartão de Crédito
✓ Cartão de Débito  
✓ PIX
✓ Transferência
✓ Contracheque
```

#### For INCOME Transactions

**BEFORE:**
```
✓ Crédito em Conta     ← REMOVED
✓ Crédito em Cartão
✓ Contracheque
✓ PIX
✓ Transferência
```

**AFTER:**
```
✓ Transferência
✓ PIX
✓ Crédito em Cartão
✓ Contracheque
```

### Account/Card Selection Logic

| Payment Method | BEFORE | AFTER |
|---------------|---------|--------|
| Cartão de Crédito | 💳 Card dropdown | 💳 Card dropdown ✓ |
| Cartão de Débito | 💳 Card dropdown ❌ | 🏦 Account dropdown ✓ |
| PIX | N/A | 🏦 Account dropdown ✓ |
| Transferência | N/A | 🏦 Account dropdown ✓ |
| Aplicação | 🏦 Account dropdown | 🏦 Account dropdown ✓ |
| Resgate | 🏦 Account dropdown | 🏦 Account dropdown ✓ |
| Contracheque | N/A | N/A ✓ |

### Key Points

1. **"Conta Bancária" removed** - Use PIX, Transferência, or Cartão de Débito instead
2. **Debit cards now show account dropdown** - Previously showed card dropdown (incorrect)
3. **PIX and Transfer now show account dropdown** - For selecting which bank account
4. **Investment logic unchanged** - Aplicação and Resgate still work the same way
5. **Backward compatible** - Old transactions with bank_account still work

## Code Examples

### Before
```javascript
// Debit card incorrectly showed card dropdown
if (payment_method === 'credit_card' || payment_method === 'debit_card') {
  return <CardDropdown />
}
```

### After  
```javascript
// Only credit card shows card dropdown
if (payment_method === 'credit_card') {
  return <CardDropdown />
}

// Debit, PIX, Transfer show account dropdown
if (payment_method === 'debit_card' || 
    payment_method === 'pix' || 
    payment_method === 'transfer') {
  return <AccountDropdown />
}
```

## Migration Guide

### What You Need to Do

**Nothing!** The system is backward compatible.

### What You Can Do (Optional)

Update existing transactions from:
- "Conta Bancária" → "PIX" or "Transferência" or "Cartão de Débito"

This provides better categorization for reports.

## Files Changed

- `src/components/Import/ImportModal.jsx` (UI logic)
- `src/services/import/aiExtractor.js` (AI detection)
- Documentation files (guides and examples)

## Questions?

See full documentation in:
- `PAYMENT_METHOD_UPDATE.md` - Detailed migration guide
- `IMPORT_IMPROVEMENTS.md` - Technical implementation
- `VISUAL_CHANGES.md` - Visual before/after examples
