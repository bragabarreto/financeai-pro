# Data Import Feature - Technical Summary

## Overview
A comprehensive data import system with AI-powered extraction for FinanceAI Pro, enabling users to import financial transactions from multiple file formats with intelligent categorization and validation.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    ImportModal.jsx                       │
│              (User Interface Component)                  │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌─────────────────┐      ┌─────────────────┐
│  fileParser.js  │      │ aiExtractor.js  │
│  - parseCSV     │      │  - detectFields │
│  - parseExcel   │      │  - parseDate    │
│  - parsePDF     │      │  - parseAmount  │
│  - validateFile │      │  - categorize   │
└────────┬────────┘      └────────┬────────┘
         │                        │
         └────────┬───────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ importService.js│
         │  - processFile  │
         │  - importTrans  │
         │  - saveHistory  │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │   Supabase DB   │
         │  - transactions │
         │  - accounts     │
         └─────────────────┘
```

### File Processing Pipeline

```
1. File Upload
   └→ validateFile() → Check size, format

2. Parse File
   └→ parseCSV/Excel/PDF() → Extract raw data

3. AI Extraction
   ├→ detectFieldMapping() → Map columns
   ├→ parseDate() → Normalize dates
   ├→ parseAmount() → Normalize amounts
   ├→ detectTransactionType() → Income/Expense
   ├→ categorizeTransaction() → Auto-categorize
   └→ calculateConfidence() → Score 0-100%

4. Validation
   └→ validateTransactions() → Check required fields

5. User Review
   └→ Manual editing and selection

6. Import
   ├→ Insert to database
   └→ Update account balance
```

## Implementation Details

### 1. File Parser Service (`fileParser.js`)

**Purpose:** Parse multiple file formats into a uniform data structure.

**Key Functions:**
- `parseCSV(file)` - Uses PapaParse library
- `parseExcel(file)` - Uses XLSX library
- `parsePDF(file)` - Basic text extraction (placeholder for future enhancement)
- `parseFile(file)` - Auto-detects format and routes to appropriate parser
- `validateFile(file)` - Pre-parsing validation

**Supported Formats:**
- CSV (text/csv)
- Excel (.xls, .xlsx)
- PDF (.pdf) - basic support

**Dependencies:**
```json
{
  "papaparse": "^5.5.3",
  "xlsx": "^0.18.5",
  "pdf-parse": "^2.1.7"
}
```

### 2. AI Extractor Service (`aiExtractor.js`)

**Purpose:** Intelligently extract and normalize financial data using pattern matching and heuristics.

**Key Algorithms:**

#### Field Detection
```javascript
FIELD_PATTERNS = {
  date: {
    keywords: ['data', 'date', 'dt', 'dia', ...],
    patterns: [/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/, ...]
  },
  amount: {
    keywords: ['valor', 'amount', 'quantia', ...],
    patterns: [/R?\$?\s*[\d.,]+/, ...]
  },
  // ... more patterns
}
```

#### Date Normalization
- Supports DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
- Handles 2-digit and 4-digit years
- Converts all to ISO format (YYYY-MM-DD)

#### Amount Normalization
- Brazilian format: `1.234,56` → `1234.56`
- US format: `1,234.56` → `1234.56`
- Handles currency symbols (R$, $)
- Extracts absolute values

#### Auto-Categorization
Pattern-based categorization using regular expressions:
- **Alimentação:** restaurante, supermercado, ifood, etc.
- **Transporte:** uber, taxi, gasolina, etc.
- **Compras:** shopping, magazine, mercado livre, etc.
- **Contas:** luz, água, internet, etc.
- **Saúde:** farmácia, hospital, plano de saúde, etc.
- **Lazer:** cinema, netflix, spotify, etc.
- **Salário:** salário, pagamento, etc.

#### Confidence Scoring
```javascript
Confidence = 
  (has_valid_date ? 30 : 0) +
  (has_valid_amount ? 30 : 0) +
  (has_description ? 20 : 0) +
  (has_type ? 10 : 0) +
  (has_category ? 10 : 0)
// Range: 0-100%
```

### 3. Import Service (`importService.js`)

**Purpose:** Orchestrate the import process and database operations.

**Key Functions:**

#### `processImportFile(file, options)`
- Validates file
- Parses file
- Extracts transactions
- Returns processing result with metadata

#### `importTransactions(transactions, userId, accountId, categoryMapping)`
- Batch inserts transactions
- Maps categories by name/ID
- Updates account balances
- Handles errors gracefully
- Returns success/failure count

#### `saveImportHistory(userId, importResult)`
- Saves import metadata
- Tracks success/failure rates
- Enables future auditing

#### `rollbackImport(importId, userId)`
- Deletes imported transactions
- Restores account balances
- Marks import as rolled back

### 4. Import Modal Component (`ImportModal.jsx`)

**Purpose:** Provide user interface for the import workflow.

**Features:**
- 4-step wizard interface
- File upload with drag-and-drop support
- Data preview table with inline editing
- Real-time validation
- Progress indicators
- Responsive design

**State Management:**
```javascript
useState({
  step: 1,              // Current step (1-4)
  file: null,           // Selected file
  processResult: null,  // Parsed data
  editingTransactions: [], // Editable transactions
  selectedAccount: '',  // Target account
  importResult: null    // Final result
})
```

**Steps:**
1. **Upload:** File selection and validation
2. **Preview:** Review and edit extracted data
3. **Confirm:** Select account and review summary
4. **Result:** View import results

## Testing

### Test Coverage

**File Parser Tests** (`fileParser.test.js`):
- ✅ parseAmount: Brazilian/US formats, currency symbols, negatives
- ✅ parseDate: Multiple date formats, invalid inputs
- ✅ validateFile: File size, type validation

**AI Extractor Tests** (`aiExtractor.test.js`):
- ✅ detectFieldMapping: Column header detection
- ✅ detectTransactionType: Income/expense classification
- ✅ categorizeTransaction: Auto-categorization
- ✅ calculateConfidence: Score calculation
- ✅ extractTransactions: End-to-end extraction
- ✅ validateTransactions: Validation rules

**Test Results:**
```
Test Suites: 2 passed, 2 total
Tests:       40 passed, 40 total
Time:        1.874s
```

### Sample Test Data

File: `sample-transactions.csv`
```csv
Data,Descricao,Valor,Tipo
15/01/2024,RESTAURANTE PRIMO,150.50,Débito
16/01/2024,SUPERMERCADO PAGUE MENOS,450.00,Débito
18/01/2024,SALARIO JANEIRO,5000.00,Crédito
...
```

## Database Schema

### Transactions Table
```sql
transactions {
  id: uuid,
  user_id: uuid,
  account_id: uuid,
  type: text,         -- 'income' | 'expense' | 'investment'
  description: text,
  amount: numeric,
  category: uuid,
  date: date,
  created_at: timestamp,
  metadata: jsonb     -- { imported: true, confidence: 95, ... }
}
```

### Import History Table (Future)
```sql
import_history {
  id: uuid,
  user_id: uuid,
  file_name: text,
  file_size: integer,
  total_rows: integer,
  extracted_transactions: integer,
  imported_transactions: integer,
  failed_transactions: integer,
  import_date: timestamp,
  status: text,       -- 'completed' | 'partial' | 'rolled_back'
  metadata: jsonb
}
```

## Performance Considerations

### File Size Limits
- **Maximum:** 10MB per file
- **Recommended:** <5MB for best performance
- **Large files:** Consider batch processing

### Processing Time
- **CSV (1000 rows):** ~500ms
- **Excel (1000 rows):** ~800ms
- **PDF:** Varies significantly

### Memory Usage
- Files are processed in-memory
- Large files may require chunking (future enhancement)

### Database Operations
- Batch inserts for better performance
- Single account balance update per import
- Transaction in progress (error handling)

## Error Handling

### Validation Errors
- Missing required fields
- Invalid date formats
- Invalid amount values
- File size exceeded
- Unsupported file format

### Import Errors
- Database connection failures
- Constraint violations
- Account not found
- Category mapping failures

### User Feedback
- Inline error messages
- Warning badges for low confidence
- Success/failure counts
- Detailed error logs

## Security Considerations

1. **File Upload:**
   - Size limits enforced
   - Format validation
   - No executable files

2. **Data Validation:**
   - Input sanitization
   - SQL injection prevention (via Supabase)
   - User isolation (user_id checks)

3. **Privacy:**
   - Files processed client-side
   - No file storage on server
   - User data segregation

## Future Enhancements

### Planned Features
- [ ] OCR for scanned PDFs
- [ ] Machine learning categorization
- [ ] Bank-specific templates
- [ ] Multi-file import
- [ ] Import scheduling
- [ ] Export functionality
- [ ] Duplicate detection
- [ ] Automatic reconciliation

### Technical Improvements
- [ ] Web Workers for large file processing
- [ ] Streaming for large files
- [ ] Progressive import (chunks)
- [ ] Better PDF extraction (pdf.js)
- [ ] Import preview before processing
- [ ] Custom field mapping UI
- [ ] Import templates (save mappings)

## Deployment

### Production Build
```bash
npm run build
# Build size: 336.89 kB (gzipped)
```

### Environment Variables
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Maintenance

### Code Quality
- ES6+ JavaScript
- React 18 hooks
- Functional components
- Modular architecture
- Comprehensive comments

### Documentation
- ✅ README.md - Feature overview
- ✅ USAGE_GUIDE.md - User guide
- ✅ UI_FLOW.md - UI documentation
- ✅ TECHNICAL_SUMMARY.md - This document

### Testing Strategy
- Unit tests for core functions
- Integration tests for services
- Manual testing for UI
- Sample data for testing

## Metrics & Analytics

### Success Metrics
- Import success rate: Target >95%
- Average confidence score: Target >80%
- Processing time: Target <2s for 100 rows
- User satisfaction: Collect feedback

### Error Tracking
- Failed imports by reason
- Low confidence transactions
- File format distribution
- Processing time by format

## Support & Troubleshooting

### Common Issues
1. **Low confidence scores**
   - Solution: Improve source file formatting
   
2. **Wrong categorization**
   - Solution: Manual edit or add new patterns

3. **Date parsing errors**
   - Solution: Standardize date format in source

4. **Large file timeout**
   - Solution: Split into smaller batches

### Debug Mode
Enable debug logging:
```javascript
// In importService.js
const DEBUG = true;
```

## License & Credits

**Dependencies:**
- PapaParse (MIT License)
- XLSX (Apache-2.0 License)
- pdf-parse (MIT License)

**Built for:** FinanceAI Pro
**Version:** 2.1.0
**Last Updated:** October 2024

---

**End of Technical Summary**
