# Quick Start Guide - Data Import Feature

## Example: Importing Bank Statement

This guide shows you how to import a bank statement CSV file into FinanceAI Pro.

### Prerequisites
- You are logged into FinanceAI Pro
- You have at least one account created
- You have a CSV, XLS, XLSX, or PDF file with transaction data

### Example CSV File

Create a file named `bank-statement.csv` with this content:

```csv
Data,Descricao,Valor,Tipo
15/01/2024,RESTAURANTE PRIMO,150.50,Débito
16/01/2024,SUPERMERCADO PAGUE MENOS,450.00,Débito
17/01/2024,UBER TRIP,35.00,Débito
18/01/2024,SALARIO JANEIRO,5000.00,Crédito
19/01/2024,FARMACIA DROGASIL,85.90,Débito
20/01/2024,CONTA DE LUZ CEMIG,180.00,Débito
```

### Step-by-Step Instructions

#### 1. Open Import Modal
1. Look for the green **"Importar"** button in the top-right of the screen (next to your email)
2. Click the button to open the import wizard

#### 2. Upload Your File
1. Click **"Escolher Arquivo"** button
2. Select your `bank-statement.csv` file
3. You'll see the file name and size displayed
4. Click **"Processar Arquivo"** to continue

**What Happens:**
- The system reads your CSV file
- AI analyzes the column headers
- Data is extracted and categorized automatically
- Each transaction gets a confidence score

#### 3. Review Extracted Data
1. Check the summary cards at the top:
   - **Total de Linhas**: How many rows were in your file
   - **Extraídas**: How many transactions were found
   - **Válidas**: How many passed validation
   - **Selecionadas**: How many are selected for import

2. Review the transaction table:
   - ✅ Check/uncheck transactions to include/exclude
   - ✏️ Edit any field by clicking on it
   - 🎯 Check confidence scores (aim for >80%)
   - 🗑️ Delete unwanted transactions

3. Use **"Selecionar Todas"** or **"Desmarcar Todas"** as needed

4. Click **"Continuar"** when satisfied

**Example Output:**
```
Date        Description              Amount    Type     Confidence
2024-01-15  RESTAURANTE PRIMO        R$ 150.50 Despesa  95%
2024-01-16  SUPERMERCADO PAGUE MENOS R$ 450.00 Despesa  100%
2024-01-17  UBER TRIP                R$ 35.00  Despesa  92%
2024-01-18  SALARIO JANEIRO          R$ 5000.00 Receita 98%
```

#### 4. Select Account & Confirm
1. Choose the account where these transactions belong
   - Example: "Conta Corrente BB - R$ 5,432.10"

2. Review the summary:
   - **Transações a importar**: 6
   - **Receitas**: 1
   - **Despesas**: 5
   - **Valor total**: R$ -315.40

3. Click **"Importar Transações"**

#### 5. View Results
1. Success screen shows:
   - ✅ Number of transactions imported
   - ❌ Number of failures (if any)

2. Click **"Fechar"** to return to the app

3. Your transactions are now in the system!
   - Account balance is updated
   - Transactions appear in your dashboard
   - Categories are automatically assigned

### Tips for Best Results

#### File Format Tips
✅ **Good CSV Structure:**
```csv
Data,Descricao,Valor,Tipo
15/01/2024,SUPERMERCADO ABC,150.50,Débito
```

❌ **Bad CSV Structure:**
```csv
sem cabeçalho,dados confusos,,,
15-Jan,Compra,R$ 150,50,Saída
```

#### Column Name Variations
The AI recognizes these column names:

| English | Portuguese | Alternative |
|---------|------------|-------------|
| Date | Data | Dia, Vencimento |
| Description | Descrição | Histórico, Memo |
| Amount | Valor | Quantia, Total, Preço |
| Type | Tipo | Operação, Natureza |

#### Date Formats Supported
- ✅ DD/MM/YYYY (Brazilian): `15/01/2024`
- ✅ DD-MM-YYYY: `15-01-2024`
- ✅ YYYY-MM-DD (ISO): `2024-01-15`
- ✅ DD/MM/YY: `15/01/24`

#### Amount Formats Supported
- ✅ Brazilian: `1.234,56` or `R$ 1.234,56`
- ✅ US: `1,234.56` or `$ 1,234.56`
- ✅ Simple: `1234.56` or `1234,56`
- ✅ Negative: `-150.50` or `(150.50)`

### Automatic Categorization

The system automatically categorizes transactions based on keywords:

| Transaction | Auto Category |
|-------------|---------------|
| RESTAURANTE PRIMO | Alimentação |
| SUPERMERCADO PAGUE MENOS | Alimentação |
| UBER TRIP | Transporte |
| FARMACIA DROGASIL | Saúde |
| CONTA DE LUZ | Contas |
| SALARIO JANEIRO | Salário |
| MERCADO LIVRE | Compras |
| NETFLIX | Lazer |

You can edit the category before importing if needed.

### Common Issues & Solutions

#### Issue: "Formato não suportado"
**Solution:** Make sure your file is .csv, .xls, .xlsx, or .pdf

#### Issue: "Arquivo muito grande"
**Solution:** Files must be under 10MB. Split large files into smaller ones.

#### Issue: Low confidence scores (<50%)
**Cause:** AI couldn't reliably extract data
**Solution:**
1. Review the extracted fields
2. Edit incorrect values manually
3. Consider reformatting your source file

#### Issue: No transactions extracted
**Cause:** File format not recognized
**Solution:**
1. Check that your file has proper headers
2. Make sure data is in rows, not merged cells
3. Remove summary rows and totals

#### Issue: Wrong dates
**Cause:** Ambiguous date format
**Solution:** Edit dates manually in preview screen

### Advanced Usage

#### Excel Files with Multiple Sheets
- Only the first sheet is imported
- Make sure transaction data is on the first sheet

#### PDF Bank Statements
- PDF support is basic (text extraction only)
- Works best with digital PDFs, not scanned images
- Review all extracted data carefully
- Consider converting PDF to CSV for better results

#### Large Imports
For files with 100+ transactions:
1. Import in batches of 50-100 at a time
2. Use the confidence filter to prioritize high-quality data
3. Review low-confidence transactions separately

### After Import

1. **Check Your Dashboard:**
   - New transactions appear immediately
   - Account balance is updated
   - Categories show new totals

2. **Review Imported Data:**
   - Go to respective category tabs (Gastos, Receitas, etc.)
   - Verify transactions are correct
   - Edit any that need adjustment

3. **Track Your Import:**
   - Import history is saved
   - You can view past imports
   - Rollback is possible if needed (future feature)

### Support

If you encounter issues:
1. Check the validation warnings in step 2
2. Review the error messages
3. Try reformatting your source file
4. Import a smaller sample first to test

### Sample Files

Sample CSV files are available in:
`src/services/import/__tests__/sample-transactions.csv`

Use this as a template for your own files!
