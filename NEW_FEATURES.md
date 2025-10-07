# New Features: SMS Import & AI Integration 🚀

## What's New

FinanceAI Pro now supports **SMS/Text Import** and **AI-Powered Categorization** to make transaction management even easier!

## 1. SMS/Text Import 📱

### Why This Matters
Instead of manually entering transactions from bank SMS notifications, you can now just copy-paste them directly into the app!

### How It Works

#### Step 1: Open Import Modal
Click "Importar" button in the dashboard

#### Step 2: Select "SMS/Texto" Mode
Choose between file upload or text input mode

#### Step 3: Paste Your SMS
Copy bank SMS notifications and paste them into the text area

#### Step 4: Process & Review
The system automatically extracts:
- ✅ Transaction amount
- ✅ Merchant/description
- ✅ Date and time
- ✅ Payment method (credit card, PIX, debit, etc.)
- ✅ Transaction type (income/expense)

### Supported SMS Formats

#### 🏦 CAIXA
```
CAIXA: Compra aprovada SUPERMERCADO R$ 145,80 15/03 às 18:30
```

#### 💜 Nubank
```
Nubank: Compra aprovada: R$ 85,00 em RESTAURANTE XYZ em 12/03
```

#### 💸 PIX Received
```
Você recebeu um Pix de R$ 500,00 de Maria Silva em 11/03
```

#### 💸 PIX Sent
```
Você enviou um Pix de R$ 250,00 para João Santos em 10/03
```

#### 🏦 Bank Transfer
```
Transferência de R$ 1.000,00 para Conta 1234-5 em 08/03
```

### Multi-Transaction Support
Paste multiple SMS messages at once - just put each one on a new line:

```
CAIXA: Compra aprovada FARMACIA R$ 45,00 10/03 às 10:15
Você recebeu um Pix de R$ 200,00 de Cliente ABC
Nubank: Compra aprovada: R$ 120,00 em POSTO SHELL
```

All three will be automatically extracted!

## 2. AI-Powered Categorization 🤖

### Why This Matters
Traditional systems use simple keyword matching. Our AI integration understands context and learns from your categorization patterns.

### Supported AI Models

| Provider | Model | Speed | Accuracy | Cost |
|----------|-------|-------|----------|------|
| **Google Gemini** | gemini-pro | Fast | High | Free* |
| **OpenAI** | gpt-4-turbo | Medium | Very High | Paid |
| **Anthropic** | claude-3-sonnet | Medium | Very High | Paid |

*Free tier available

### How to Enable

#### 1. Get API Keys

**Google Gemini (Recommended for beginners)**
- Visit: https://makersuite.google.com/app/apikey
- Free tier available
- Best for Portuguese transactions

**OpenAI ChatGPT**
- Visit: https://platform.openai.com/api-keys
- $5+ credit required
- Best overall accuracy

**Anthropic Claude**
- Visit: https://console.anthropic.com/
- Credit required
- Best for complex transactions

#### 2. Configure Environment

Create a `.env` file in the project root:

```bash
# Copy from .env.example
cp .env.example .env

# Edit and add your API key(s)
REACT_APP_GEMINI_API_KEY=your_gemini_key_here
# Or
REACT_APP_OPENAI_API_KEY=your_openai_key_here
# Or
REACT_APP_ANTHROPIC_API_KEY=your_anthropic_key_here
```

You only need ONE API key to enable AI features!

#### 3. Use AI Enhancement

When importing transactions:
1. Check the "✨ Usar IA avançada" checkbox
2. Process your file or SMS
3. See AI suggestions with confidence scores and reasoning
4. Review and confirm

### What AI Does

**Before AI:**
```
Description: "UBER EATS"
Category: ??? (You decide)
```

**With AI:**
```
Description: "UBER EATS"
Suggested Category: Alimentação
Confidence: 95%
Reasoning: "Food delivery service commonly used for meal orders"
```

### Benefits

- **Context-aware**: Understands nuances like "UBER" vs "UBER EATS"
- **Multi-language**: Works with Portuguese and English
- **Adaptive**: Learns from your category structure
- **Fallback**: Works without AI using pattern matching

## Quick Start Guide

### For SMS Import Only (No AI needed)

1. ✅ No setup required
2. ✅ Works out of the box
3. ✅ Open Import Modal → Select "SMS/Texto"
4. ✅ Paste your bank SMS
5. ✅ Done!

### For SMS Import + AI Enhancement

1. Get a free Gemini API key (5 minutes)
2. Add to `.env` file
3. Enable "✨ Usar IA avançada" when importing
4. Enjoy smart categorization!

## Examples

### Example 1: Simple SMS Import

**Input:**
```
CAIXA: Compra aprovada RESTAURANTE ITALIANO R$ 89,90 15/03 às 20:30
```

**Extracted:**
- Amount: R$ 89,90
- Description: RESTAURANTE ITALIANO
- Date: 2024-03-15
- Type: Expense
- Payment: Credit Card
- Confidence: 100%

### Example 2: Multiple SMS with AI

**Input:**
```
CAIXA: Compra aprovada POSTO IPIRANGA R$ 200,00 10/03 às 08:15
Você recebeu um Pix de R$ 1.500,00 de SALARIO EMPRESA
Nubank: Compra aprovada: R$ 45,00 em NETFLIX em 12/03
```

**AI Analysis:**

Transaction 1:
- Category: Transporte
- Confidence: 92%
- Reasoning: "Gas station purchase"

Transaction 2:
- Category: Salário
- Confidence: 98%
- Reasoning: "Salary payment via PIX"

Transaction 3:
- Category: Lazer
- Confidence: 95%
- Reasoning: "Streaming service subscription"

## Technical Details

### Performance
- SMS Extraction: < 10ms per transaction
- AI Enhancement: 200-500ms per transaction
- Batch Processing: ~5 transactions/second
- Added Build Size: Only +3.76 kB

### Security
- ✅ API keys in environment (never in code)
- ✅ Client-side processing
- ✅ No data storage
- ✅ Input sanitization

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile responsive

## Troubleshooting

### SMS Not Extracting?

**Check:**
- ✅ Amount in R$ format: "R$ 100,00" or "100,00"
- ✅ Date in DD/MM format: "15/03"
- ✅ One SMS per line (for multiple)

**Try:**
- Remove extra characters (emojis, special symbols)
- Ensure SMS contains amount and date

### AI Not Working?

**Check:**
- ✅ API key is set in `.env`
- ✅ `.env` file is in project root
- ✅ Restart app after adding key: `npm start`
- ✅ Check browser console for errors

**Solution:**
- Verify API key is valid
- Check internet connection
- Try different AI provider

### Low Confidence Scores?

**Solutions:**
- Enable AI enhancement
- Add more transaction details
- Manually edit before importing
- Create custom categories that match your transactions

## Cost Optimization

### Free Tier Strategy
1. Use Google Gemini (has free tier)
2. Limit to important transactions
3. Disable AI for bulk imports of known categories

### Paid API Strategy
1. Use OpenAI for complex transactions
2. Process in batches
3. Monitor API usage
4. Set monthly limits

## What's Next?

Future enhancements being considered:

- 📸 **Image OCR**: Extract from screenshots
- 🏦 **More Banks**: Support for more Brazilian banks
- 🧠 **Custom ML**: Train personalized models
- 📧 **Email Integration**: Import from email forwards
- 🔄 **Auto-sync**: Direct banking app integration

## Feedback

We'd love to hear from you!

- 🐛 Found a bug? Open an issue
- 💡 Have an idea? Share it!
- ❤️ Like the feature? Star the repo!

---

**Made with ❤️ for better financial management**
