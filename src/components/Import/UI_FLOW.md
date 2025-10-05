# UI Flow Documentation - Import Feature

## Overview
The import feature provides a 4-step wizard interface for importing financial transactions from various file formats.

## Step-by-Step Flow

### Step 1: File Upload
```
┌─────────────────────────────────────────────────────────┐
│  Importar Transações                                 [X]│
│  Faça upload do arquivo                                 │
├─────────────────────────────────────────────────────────┤
│  Progress: [1] → 2 → 3 → 4                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         ↑                                      │    │
│  │      [Upload Icon]                             │    │
│  │                                                 │    │
│  │  Selecione um arquivo para importar            │    │
│  │  Formatos suportados: CSV, XLS, XLSX, PDF      │    │
│  │                                                 │    │
│  │        [Escolher Arquivo]                       │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Selected File: transactions.csv (25.4 KB)         [X] │
│                                                          │
│  💡 Dicas para melhor importação:                      │
│  • Use arquivos CSV ou Excel com cabeçalhos claros     │
│  • Certifique-se de que as colunas incluam: data,      │
│    descrição e valor                                    │
│  • Para PDFs, a extração pode exigir revisão manual    │
│  • Tamanho máximo do arquivo: 10MB                     │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [Cancelar]                    [Processar Arquivo] →   │
└─────────────────────────────────────────────────────────┘
```

### Step 2: Preview & Edit
```
┌─────────────────────────────────────────────────────────┐
│  Importar Transações                                 [X]│
│  Revise os dados extraídos                              │
├─────────────────────────────────────────────────────────┤
│  Progress: 1 → [2] → 3 → 4                             │
├─────────────────────────────────────────────────────────┤
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐             │
│  │ Total │ │Extract│ │ Valid │ │Select │             │
│  │  150  │ │  148  │ │  145  │ │  140  │             │
│  └───────┘ └───────┘ └───────┘ └───────┘             │
│                                                          │
│  ⚠ Avisos de Validação                                 │
│  • Linha 45: Baixa confiança na extração (45%)         │
│  • ... e mais 3 avisos                                  │
│                                                          │
│  [Desmarcar Todas]          140 de 148 selecionadas    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │☑│Data      │Descrição     │Valor│Tipo    │Conf.│  │
│  ├──┼──────────┼──────────────┼─────┼────────┼─────┤  │
│  │☑│2024-01-15│RESTAURANTE   │150.5│Despesa │ 95% │  │
│  │☑│2024-01-16│SUPERMERCADO  │450.0│Despesa │100% │  │
│  │☑│2024-01-18│SALARIO       │5000 │Receita │ 98% │  │
│  │☐│2024-01-20│CONTA LUZ     │180.0│Despesa │ 45% │  │
│  │☑│2024-01-22│CINEMA        │ 45.0│Despesa │ 92% │  │
│  └──────────────────────────────────────────────────┘  │
│  (Each row has inline editing capabilities)             │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [Cancelar]         [← Voltar]      [Continuar →]     │
└─────────────────────────────────────────────────────────┘
```

### Step 3: Confirm Import
```
┌─────────────────────────────────────────────────────────┐
│  Importar Transações                                 [X]│
│  Confirme a importação                                  │
├─────────────────────────────────────────────────────────┤
│  Progress: 1 → 2 → [3] → 4                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Selecione a conta de destino *                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ Conta Corrente BB - R$ 5,432.10          ▼    │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Resumo da Importação                          │    │
│  │                                                 │    │
│  │  Transações a importar:              140       │    │
│  │  Receitas:                            12       │    │
│  │  Despesas:                           128       │    │
│  │  ─────────────────────────────────────────     │    │
│  │  Valor total:                    R$ -3,250.00  │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [Cancelar]         [← Voltar]  [Importar Transações]→│
└─────────────────────────────────────────────────────────┘
```

### Step 4: Result
```
┌─────────────────────────────────────────────────────────┐
│  Importar Transações                                 [X]│
│  Resultado da importação                                │
├─────────────────────────────────────────────────────────┤
│  Progress: 1 → 2 → 3 → [4]                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                    ┌─────────┐                          │
│                    │    ✓    │                          │
│                    └─────────┘                          │
│                                                          │
│              Importação Concluída!                      │
│     Todas as transações foram importadas com sucesso    │
│                                                          │
│         ┌──────────┐         ┌──────────┐              │
│         │Importadas│         │ Falharam │              │
│         │   140    │         │    0     │              │
│         └──────────┘         └──────────┘              │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [Fechar]                                               │
└─────────────────────────────────────────────────────────┘
```

## UI Components

### Header Button
The import feature is accessible via a green "Importar" button in the main header:
```
┌─────────────────────────────────────────────────────────┐
│  [FinanceAI Pro Logo]    [Importar ↑]  user@email  [Sair]│
└─────────────────────────────────────────────────────────┘
```

### Color Scheme
- **Primary Action**: Green (#22C55E) - Import button, success states
- **Secondary Action**: Blue (#2563EB) - Continue, navigation
- **Warning**: Yellow (#EAB308) - Low confidence, warnings
- **Error**: Red (#DC2626) - Validation errors
- **Success**: Green (#16A34A) - Success indicators

### Confidence Indicators
- **80-100%**: Green badge - High confidence
- **50-79%**: Yellow badge - Medium confidence
- **0-49%**: Red badge - Low confidence (requires review)

### Progress Steps
1. **Upload** (Blue) - File selection
2. **Revisão** (Blue) - Data preview and editing
3. **Confirmar** (Blue) - Account selection and summary
4. **Concluído** (Blue/Green) - Import result

## Responsive Design
- **Desktop**: Full table view with all columns
- **Tablet**: Condensed table, scrollable
- **Mobile**: Card-based layout for transactions

## Accessibility Features
- Clear step indicators
- Color-coded confidence scores
- Validation messages with icons
- Keyboard navigation support
- Screen reader friendly labels

## Error States
- File too large: "Arquivo muito grande. Tamanho máximo: 10MB"
- Invalid format: "Formato não suportado. Use: csv, xls, xlsx, pdf"
- No file selected: "Selecione um arquivo"
- Parsing error: Detailed error message with line number
- Import failure: List of failed transactions with reasons
