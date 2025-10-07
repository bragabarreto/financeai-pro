# Visual Guide: New SMS Import & AI Features

## UI Screenshots and Walkthrough

### 1. Import Modal - Mode Selection

**What you'll see:**

```
┌─────────────────────────────────────────────────────────────┐
│  Importar Transações                                    [X] │
│  Faça upload do arquivo                                     │
├─────────────────────────────────────────────────────────────┤
│  [1]──────[2]──────[3]──────[4]                            │
│  Upload   Revisão  Confirmar Concluído                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │   📄 Arquivo        │  │   💬 SMS/Texto      │         │
│  │   CSV, Excel, PDF   │  │   Notificações      │         │
│  │                     │  │   bancárias         │         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Description:**
- Two large buttons for mode selection
- File icon for traditional file upload
- Message icon for SMS/text input
- Clean, modern design with clear labels

---

### 2. SMS Input Mode (Selected)

**What you'll see:**

```
┌─────────────────────────────────────────────────────────────┐
│  Importar Transações                                    [X] │
│  Faça upload do arquivo                                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │   📄 Arquivo        │  │ ✓ 💬 SMS/Texto      │ ✓ Selected│
│  └─────────────────────┘  └─────────────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  💬 Cole o texto de SMS ou notificação bancária             │
│                                                              │
│  Suporta notificações de CAIXA, Nubank, PIX e outros       │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Exemplo:                                              │ │
│  │ CAIXA: Compra aprovada COLSANTACECIL R$ 450,00       │ │
│  │ 06/10 às 16:45, ELO VIRTUAL final 6539               │ │
│  │                                                       │ │
│  │ Você pode colar múltiplas notificações, uma por      │ │
│  │ linha...                                              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ✓ ✨ Usar IA avançada para melhor categorização     │  │
│  │   APIs configuradas: Gemini                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  💡 Exemplos de SMS suportados:                             │
│  • CAIXA: Compra aprovada LOJA R$ 450,00 06/10 às 16:45   │
│  • PIX: Você recebeu um Pix de R$ 250,00 de João Silva    │
│  • Nubank: Compra aprovada: R$ 150,00 em RESTAURANTE XYZ  │
│                                                              │
│                            [Processar SMS]                   │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
1. **Large text area** - Easy to paste multiple SMS
2. **AI toggle** - Purple gradient box with sparkle icon
3. **API status** - Shows which AI providers are configured
4. **Helpful examples** - Real SMS format examples
5. **Process button** - Clear call-to-action

---

### 3. Preview with Extracted Data

**What you'll see:**

```
┌─────────────────────────────────────────────────────────────┐
│  Importar Transações                                    [X] │
│  Revise os dados extraídos                                  │
├─────────────────────────────────────────────────────────────┤
│  [✓]──────[2]──────[3]──────[4]                            │
│  Upload   Revisão  Confirmar Concluído                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │
│  │  3   │ │  3   │ │  3   │ │  3   │                      │
│  │Total │ │Extra-│ │Váli- │ │Sele- │                      │
│  │Linhas│ │ídas  │ │das   │ │cion. │                      │
│  └──────┘ └──────┘ └──────┘ └──────┘                      │
│                                                              │
│  ℹ️ Atenção: Revise as categorias sugeridas                │
│  As categorias foram automaticamente classificadas.         │
│  Campos com fundo amarelo são sugestões automáticas.        │
│                                                              │
│  [Selecionar Todas] [Edição em Lote]                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ Data     │ Descrição          │ Valor    │ Cat...│   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ☑ 06/10/24 │ COLSANTACECIL     │ R$ 450,00│ 🟡Alim│   │
│  │            │ Cartão de Crédito  │ Despesa  │ [95%] │   │
│  │            │ ✨ AI: "Restaurante, alto conf..."    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ☑ 11/03/24 │ Maria Silva       │ R$ 500,00│ 🟡Salá│   │
│  │            │ PIX                │ Receita  │ [98%] │   │
│  │            │ ✨ AI: "Salário via PIX"              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ☑ 12/03/24 │ UBER              │ R$ 45,00 │ 🟡Tran│   │
│  │            │ Cartão de Crédito  │ Despesa  │ [92%] │   │
│  │            │ ✨ AI: "Transporte urbano"            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│                                      [Continuar]            │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
1. **Statistics cards** - Shows counts at a glance
2. **Color-coded confidence** - Green (high), Yellow (medium), Red (low)
3. **AI indicators** - Sparkle icon shows AI-enhanced transactions
4. **Editable fields** - Click to modify any field
5. **Bulk operations** - Select and edit multiple at once

---

### 4. AI Enhancement Indicator

**Detail View:**

```
┌──────────────────────────────────────────────────────────┐
│ Transaction Details:                                      │
├──────────────────────────────────────────────────────────┤
│ Description: SUPERMERCADO ABC                            │
│ Amount: R$ 145,80                                        │
│ Date: 2024-03-15                                         │
│ Type: Despesa                                            │
│ Payment: Cartão de Crédito                               │
│                                                           │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ✨ AI Suggestion                                   │  │
│ │ Category: Alimentação                              │  │
│ │ Confidence: 95%                                    │  │
│ │ Reasoning: "Grocery store purchase commonly       │  │
│ │            categorized as food/alimentação"        │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

### 5. Comparison: With vs Without AI

**Without AI (Pattern-based):**
```
Description: "UBER 123"
→ Category: Transporte (keyword match)
→ Confidence: 60%
```

**With AI (Context-aware):**
```
Description: "UBER 123"
→ Category: Transporte
→ Confidence: 92%
→ Reasoning: "Ride-sharing service, transportation category"
```

```
Description: "UBER EATS ABC"
→ Category: Alimentação
→ Confidence: 94%
→ Reasoning: "Food delivery service, not transportation"
```

**The Difference:**
- AI understands "UBER" for transport vs "UBER EATS" for food
- Higher confidence scores
- Provides reasoning for transparency

---

## Color Scheme

### Confidence Indicators
- **Green (80-100%)**: High confidence - Safe to auto-import
- **Yellow (50-79%)**: Medium confidence - Review recommended
- **Red (0-49%)**: Low confidence - Manual review required

### UI Elements
- **Blue**: Primary actions (Process, Continue, Import)
- **Purple**: AI-related features (gradient backgrounds)
- **Yellow**: Auto-suggestions (highlighted fields)
- **Gray**: Disabled or inactive states

---

## Mobile Responsive

The UI adapts to smaller screens:
- Mode buttons stack vertically
- Table becomes scrollable
- Touch-friendly buttons (larger tap targets)
- Optimized for iOS and Android browsers

---

## Accessibility

- ✅ Keyboard navigation support
- ✅ Screen reader compatible
- ✅ High contrast mode
- ✅ Clear focus indicators
- ✅ Semantic HTML structure

---

## Performance

Visual feedback during operations:

1. **Processing**: Spinner animation
2. **Success**: Green checkmark
3. **Error**: Red alert with message
4. **Loading**: Progress indicator

All animations are smooth (60fps) and don't block the UI.

---

## Next Steps

After reviewing the extracted data:

1. **Edit** any incorrect fields
2. **Deselect** transactions you don't want to import
3. **Bulk edit** to apply changes to multiple transactions
4. **Continue** to confirmation step
5. **Import** to save to your account

The entire process takes less than 30 seconds! 🚀
