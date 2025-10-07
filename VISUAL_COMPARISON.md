# Comparação Visual - Antes vs Depois

## 1. Coluna "Forma de Pagamento"

### ANTES:
```
┌─────────────────────────────────────────────────────────────┐
│ ... │ Meio Pgto.        │ Conta/Cartão          │ ...      │
├─────────────────────────────────────────────────────────────┤
│ ... │ Cartão de Crédito │ [Select: Visa Gold]   │ ...      │
│ ... │ Conta Bancária    │ [Select: Conta Cor.]  │ ...      │
└─────────────────────────────────────────────────────────────┘
```

### DEPOIS:
```
┌─────────────────────────────────────────────────────────────┐
│ ... │ Meio Pgto.        │ Forma de Pagamento    │ ...      │
├─────────────────────────────────────────────────────────────┤
│ ... │ Cartão de Crédito │ [Select: Visa Gold]   │ ...      │
│ ... │ Boleto Bancário   │ [Select: Conta/Cart.] │ ...      │
└─────────────────────────────────────────────────────────────┘
```

## 2. Opções de Meio de Pagamento para Gastos

### ANTES:
```
Meio de Pagamento (Gastos):
├─ Cartão de Crédito
├─ Cartão de Débito
├─ PIX
├─ Transferência
├─ Conta Bancária  ← Removido
└─ Contracheque
```

### DEPOIS:
```
Meio de Pagamento (Gastos):
├─ Cartão de Crédito
├─ Cartão de Débito
├─ PIX
├─ Transferência
├─ Boleto Bancário  ← Adicionado
└─ Contracheque
```

## 3. Lógica de Forma de Pagamento - Cartão de Crédito

### ANTES:
```
Meio: Cartão de Crédito
Forma: [Selecione cartão...]
       ├─ Visa Gold       ← Mostra cartões E débito
       ├─ Mastercard
       └─ Cartão de Débito (incorreto)
```

### DEPOIS:
```
Meio: Cartão de Crédito
Forma: [Selecione cartão...]
       ├─ Visa Gold       ← Mostra APENAS cartões
       └─ Mastercard
```

## 4. Lógica de Forma de Pagamento - PIX/Débito/Transferência

### ANTES:
```
Meio: PIX
Forma: N/A (não tinha opção específica)
```

### DEPOIS:
```
Meio: PIX
Forma: [Selecione conta...]
       ├─ Conta Corrente  ← Mostra APENAS contas
       ├─ Poupança
       └─ Conta Investimentos
```

## 5. Lógica de Forma de Pagamento - Boleto Bancário (NOVO)

### ANTES:
```
Meio: Conta Bancária
Forma: [Selecione conta...]
       ├─ Conta Corrente
       └─ Poupança
```

### DEPOIS:
```
Meio: Boleto Bancário
Forma: [Selecione...]
       ┌─ Cartões ────────┐  ← Optgroup para cartões
       │  Visa Gold       │
       │  Mastercard      │
       └──────────────────┘
       ┌─ Contas ─────────┐  ← Optgroup para contas
       │  Conta Corrente  │
       │  Poupança        │
       └──────────────────┘
```

## 6. Detecção Automática - Arquivo CSV

### ANTES:
```csv
Data,Descrição,Valor
15/01/2024,PAGAMENTO BOLETO LUZ,150.00

Sistema detecta:
✓ Data: 2024-01-15
✓ Descrição: PAGAMENTO BOLETO LUZ
✓ Valor: 150.00
? Meio: (não detectado)
```

### DEPOIS:
```csv
Data,Descrição,Valor
15/01/2024,PAGAMENTO BOLETO LUZ,150.00

Sistema detecta:
✓ Data: 2024-01-15
✓ Descrição: PAGAMENTO BOLETO LUZ
✓ Valor: 150.00
✓ Meio: boleto_bancario (detectado automaticamente!)
✓ Forma: [Usuário escolhe cartão ou conta]
```

## 7. Opções de Receita

### ANTES:
```
Meio de Pagamento (Receitas):
├─ Crédito em Conta  ← Removido
├─ Crédito em Cartão
├─ Contracheque
├─ PIX
└─ Transferência
```

### DEPOIS:
```
Meio de Pagamento (Receitas):
├─ PIX               ← Reorganizado
├─ Transferência
├─ Crédito em Cartão
└─ Contracheque
```

## 8. Matriz de Associação Completa

| Meio de Pagamento | Forma de Pagamento Permitida |
|-------------------|------------------------------|
| Cartão de Crédito | ✓ Apenas Cartões             |
| Cartão de Débito  | ✓ Apenas Contas              |
| PIX               | ✓ Apenas Contas              |
| Transferência     | ✓ Apenas Contas              |
| **Boleto Bancário**   | **✓ Cartões OU Contas**      |
| Contracheque      | ✗ N/A                        |
| Aplicação         | ✓ Apenas Contas              |
| Resgate           | ✓ Apenas Contas              |
