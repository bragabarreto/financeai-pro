# Migration: Comprehensive Installment Transaction Fix

## Overview

This migration adds new fields to installment transactions and fixes existing records to ensure data consistency.

## New Fields

- **`total_amount`**: Stores the total purchase amount for all installment records
- **`last_installment_date`**: Stores the date of the last installment for all installment records

## What This Migration Does

1. **Adds New Fields**: Ensures all installment transactions have `total_amount` and `last_installment_date`
2. **Fixes Amounts**: Corrects any transactions that have the total amount instead of divided amount
3. **Fixes Dates**: Ensures monthly spacing between installments
4. **Fixes Numbers**: Ensures all installments have correct `installment_number`
5. **Fixes Descriptions**: Ensures proper format with "(X/Y)" notation

## Prerequisites

1. Node.js installed
2. Supabase credentials in `.env` file:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key
   ```

## Usage

### Step 1: Add Database Field

Run in Supabase SQL Editor:
```sql
-- Run the contents of migrations/add_total_amount_field.sql
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2);
```

### Step 2: Dry Run (Recommended First)

```bash
npm run migrate:installments:comprehensive
```

This shows what would be changed without making any modifications.

### Step 3: Execute Migration

After reviewing the dry run output:
```bash
npm run migrate:installments:comprehensive:execute
```

### Advanced Options

```bash
# Limit to 10 groups
node migrations/fix-existing-installments-comprehensive.js --execute --limit=10

# Fix only one user's transactions
node migrations/fix-existing-installments-comprehensive.js --execute --user=USER_ID
```

## Example Output

### Dry Run
```
╔════════════════════════════════════════════════════════════════════╗
║     COMPREHENSIVE INSTALLMENT TRANSACTIONS MIGRATION               ║
╚════════════════════════════════════════════════════════════════════╝

⚠️  Running in DRY RUN mode - no changes will be made

🔍 Identifying installment transaction groups...

📊 Found 145 total installment transactions

📋 Found 8 installment groups

================================================================================
📝 [DRY RUN] Fixing: iPhone 15
   User ID: abc123...
   Total Amount: R$ 7200.00
   Installments: 12
   Installment Amount: R$ 600.00
   Last Installment Date: 2026-01-15
   Issues: Missing total_amount field, Missing last_installment_date field

   Corrections to apply:
   Transaction 1/12:
     - Add total_amount: R$ 7200.00
     - Add last_installment_date: 2026-01-15
   ...

   ℹ️  DRY RUN: Would update 12 transactions
================================================================================

📊 MIGRATION SUMMARY:
   - Groups processed: 8
   - Transactions that would be updated: 96

💡 Run with --execute to apply changes
```

## Verification

After running the migration, verify in Supabase SQL Editor:

```sql
-- Check if all installments have the new fields
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE total_amount IS NOT NULL) as with_total_amount,
  COUNT(*) FILTER (WHERE total_amount IS NULL) as without_total_amount,
  COUNT(*) FILTER (WHERE last_installment_date IS NOT NULL) as with_last_date,
  COUNT(*) FILTER (WHERE last_installment_date IS NULL) as without_last_date
FROM transactions
WHERE is_installment = true;
```

Expected result:
- `without_total_amount` = 0
- `without_last_date` = 0

## Rollback

If needed, you can remove the new field:

```sql
ALTER TABLE transactions DROP COLUMN IF EXISTS total_amount;
```

However, this only removes the column. To restore old values, you'll need to use Supabase's backup functionality.

## Safety Features

- **Dry-run mode by default**: Shows changes before applying them
- **Detailed logging**: See exactly what will be changed
- **Grouping logic**: Intelligently groups related installments
- **Validation**: Checks for issues before fixing

## Support

See `GUIA_IMPLEMENTACAO_PARCELAS_MELHORADO.md` for detailed Portuguese documentation.

---

**Last Updated**: 07/12/2025
