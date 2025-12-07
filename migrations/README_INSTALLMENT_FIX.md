# Migration: Fix Installment Transactions

## Overview

This migration fixes installment transactions that were created before the proper installment logic was implemented. The goal is to ensure all installment transactions follow the current standard:

1. **Divided Amount**: Each installment has `total_amount / installment_count`
2. **Monthly Dates**: Each installment has a date exactly 1 month after the previous
3. **Installment Number**: Each installment has `installment_number` field set (1, 2, 3, ...)
4. **Proper Description**: Description includes installment notation, e.g., "iPhone 15 (1/12)"

## Problem Description

### What was wrong?

Before the installment feature was properly implemented, some transactions may have been created with:

- **Full amount in each installment** instead of divided amount
- **Missing `installment_number`** field
- **Incorrect dates** (all same date or not monthly intervals)
- **Incorrect description format** (missing installment notation)

### Current Behavior (Correct)

When creating new installment transactions, the system:
- Divides the total amount by the number of installments
- Creates separate transaction records for each installment
- Sets each installment date to 1 month after the previous
- Includes installment information in the description: "Description (X/Y)"
- Tracks installment number in the `installment_number` field

## Migration Options

There are two ways to run this migration:

### Option 1: JavaScript Migration Script (Recommended for testing)

The JavaScript script provides detailed output and can run in dry-run mode.

**Location**: `migrations/fix-installment-transactions.js`

**Usage**:

```bash
# Dry run (shows what would be changed without making changes)
node migrations/fix-installment-transactions.js

# Execute the migration
node migrations/fix-installment-transactions.js --execute

# Fix only specific user's transactions
node migrations/fix-installment-transactions.js --execute --user=USER_ID

# Fix only first N groups
node migrations/fix-installment-transactions.js --execute --limit=10
```

**Features**:
- Dry-run mode by default
- Detailed logging of all changes
- Groups transactions intelligently
- Shows before/after values
- Can limit to specific users or number of groups

### Option 2: SQL Migration (For direct database execution)

The SQL migration can be run directly in Supabase SQL editor.

**Location**: `migrations/fix-installment-transactions.sql`

**Steps**:

1. **Review Diagnostic Queries**: Run the diagnostic queries at the top of the file to understand the scope
2. **Create Backup**: Run the backup creation query
3. **Execute Fix**: Uncomment and run the fix function
4. **Verify Results**: Run the verification queries
5. **Cleanup**: Optionally remove backup and function

## Detailed Process

### 1. Identification Phase

The migration identifies problematic installment groups by:

1. **Grouping transactions** by:
   - User ID
   - Base description (without installment notation)
   - Category
   - Payment method

2. **Detecting problems**:
   - Count mismatch: Number of transactions ≠ `installment_count`
   - Amount problems: Amounts vary or don't divide evenly
   - Missing `installment_number`
   - Incorrect date spacing (not monthly)
   - Incorrect description format

### 2. Fix Phase

For each problematic group:

1. **Calculate correct values**:
   - `total_amount` = sum of all amounts in the group
   - `installment_amount` = total_amount / number_of_transactions
   - `expected_dates` = start_date + (0, 1, 2, ... N-1) months

2. **Update each transaction**:
   - Set `amount` to `installment_amount`
   - Set `date` to expected monthly date
   - Set `description` to include `(X/Y)` notation
   - Set `installment_number` to sequence number (1, 2, 3, ...)
   - Ensure `installment_count` matches actual count

### 3. Verification Phase

After migration:

1. **Check installment_number**: All should be set
2. **Check amounts**: All installments in a group should have same amount
3. **Check dates**: Should be ~30 days apart (monthly)
4. **Check descriptions**: Should follow `Description (X/Y)` format

## Example Scenarios

### Scenario 1: Full Amount in Each Installment

**Before**:
```
Description: "iPhone 15"
Installments: 12
Each transaction: R$ 6,000.00 (total R$ 72,000.00 - WRONG!)
```

**After**:
```
Description: "iPhone 15 (1/12)", "iPhone 15 (2/12)", ...
Installments: 12
Each transaction: R$ 500.00 (total R$ 6,000.00 - CORRECT!)
```

### Scenario 2: Missing Installment Numbers

**Before**:
```
Description: "TV Smart"
installment_number: NULL
Amount: R$ 200.00 (correct)
Date: 2025-01-15 (all same - WRONG!)
```

**After**:
```
Description: "TV Smart (1/12)", "TV Smart (2/12)", ...
installment_number: 1, 2, 3, ..., 12
Amount: R$ 200.00 (unchanged)
Dates: 2025-01-15, 2025-02-15, 2025-03-15, ... (CORRECT!)
```

### Scenario 3: Incorrect Description Format

**Before**:
```
Description: "Geladeira Nova"
All fields correct except description format
```

**After**:
```
Description: "Geladeira Nova (1/6)", "Geladeira Nova (2/6)", ...
All other fields unchanged
```

## Safety Measures

### Backup

Before running the migration, a backup is created:

**JavaScript**:
The script only modifies data when run with `--execute` flag.

**SQL**:
```sql
CREATE TABLE transactions_backup_installment_fix AS
SELECT * FROM transactions WHERE is_installment = true;
```

### Restore from Backup

If something goes wrong:

```sql
-- Delete modified transactions
DELETE FROM transactions WHERE is_installment = true;

-- Restore from backup
INSERT INTO transactions SELECT * FROM transactions_backup_installment_fix;
```

## Testing

Before running in production:

1. **Run in dry-run mode** (JavaScript script default)
2. **Review output carefully** - check what would be changed
3. **Test on a small subset** using `--limit=10`
4. **Test on specific user** using `--user=USER_ID`
5. **Verify results** using verification queries

## Verification Queries

### Check all installments have installment_number

```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE installment_number IS NOT NULL) as with_number,
  COUNT(*) FILTER (WHERE installment_number IS NULL) as without_number
FROM transactions
WHERE is_installment = true;
```

Expected: `without_number` should be 0.

### Check amount consistency within groups

```sql
WITH installment_groups AS (
  SELECT 
    REGEXP_REPLACE(description, '\s*\(\d+/\d+\)\s*$', '') as base_description,
    MAX(amount) - MIN(amount) as amount_variance
  FROM transactions
  WHERE is_installment = true
  GROUP BY base_description
)
SELECT * FROM installment_groups
WHERE amount_variance > 0.01;
```

Expected: No results (all amounts within a group should be equal).

### Check date spacing

```sql
WITH installment_dates AS (
  SELECT 
    id,
    description,
    date,
    LAG(date) OVER (PARTITION BY 
      REGEXP_REPLACE(description, '\s*\(\d+/\d+\)\s*$', '')
      ORDER BY installment_number
    ) as prev_date
  FROM transactions
  WHERE is_installment = true
)
SELECT 
  description,
  date,
  prev_date,
  EXTRACT(DAY FROM (date::date - prev_date::date)) as days_diff
FROM installment_dates
WHERE prev_date IS NOT NULL
  AND (
    EXTRACT(DAY FROM (date::date - prev_date::date)) < 25 
    OR EXTRACT(DAY FROM (date::date - prev_date::date)) > 35
  );
```

Expected: No results (all dates should be ~30 days apart).

## FAQ

### Q: Will this affect future transactions?

No, only existing transactions with `is_installment = true` are affected. The migration doesn't change how new transactions are created.

### Q: What if I have partial installment groups?

The migration handles this by:
1. Using the actual number of transactions in the group
2. Redistributing the total amount evenly
3. Setting `installment_count` to match the actual count

### Q: What about transactions in different time zones?

The migration uses local dates (YYYY-MM-DD) without time components, so timezone issues are avoided.

### Q: Can I run this multiple times?

Yes, the migration is idempotent. Running it multiple times on already-fixed transactions won't cause issues (it will detect they're already correct and skip them).

### Q: What if the total amount was wrong?

The migration assumes the sum of all amounts in a group is the correct total. It then divides this total evenly. If the original total was wrong, you'll need to manually correct it first.

## Rollback

If you need to rollback:

1. **Stop immediately** - don't run more migrations
2. **Check backup** - ensure `transactions_backup_installment_fix` table exists
3. **Restore data** using the restore queries above
4. **Investigate** what went wrong
5. **Fix the issue** in the migration script
6. **Re-test** in dry-run mode

## Support

For issues or questions:

1. Check the diagnostic queries output
2. Review the migration script logs
3. Verify your data matches expected patterns
4. Test with a small subset first (`--limit=10`)

## Post-Migration

After successful migration:

1. ✅ Verify all checks pass
2. ✅ Test creating new installment transactions
3. ✅ Test viewing installment transactions in the UI
4. ✅ Optionally drop backup table (after confirming everything works)
5. ✅ Update documentation if needed

## Related Files

- `/migrations/fix-installment-transactions.js` - JavaScript migration script
- `/migrations/fix-installment-transactions.sql` - SQL migration script
- `/src/App.jsx` - Contains `handleSaveTransaction` with current logic
- `/src/services/import/importService.js` - Contains import logic for installments
- `/src/__tests__/InstallmentTransactions.test.js` - Tests for installment logic
