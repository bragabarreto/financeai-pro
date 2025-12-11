# Transaction Persistence and Dashboard Improvements - Implementation Guide

## Overview

This document provides comprehensive instructions for deploying and using the new transaction persistence features, including audit logging, import history tracking, enhanced dashboard capabilities, and CSV export functionality.

## Table of Contents

1. [Database Migration](#database-migration)
2. [New Features](#new-features)
3. [API Endpoints](#api-endpoints)
4. [Configuration](#configuration)
5. [Backfill and Migration](#backfill-and-migration)
6. [Troubleshooting](#troubleshooting)

---

## Database Migration

### Running the Migration

The migration script adds several enhancements to the database schema:

1. **Timestamp columns** for transactions (created_at, updated_at, deleted_at)
2. **Metadata column** for flexible JSON storage
3. **Import history table** to track all import operations
4. **Transaction audit table** to log all transaction events

#### Steps to Deploy

**Option 1: Supabase SQL Editor (Recommended)**

1. Log in to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Open the file `migrations/2025-12-11-add-audit-import-and-timestamps.sql`
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **RUN** to execute the migration
8. Verify success by checking the "Success" message

**Option 2: Using psql Command Line**

```bash
# Ensure you have your database connection string
psql "postgresql://user:password@host:port/database" -f migrations/2025-12-11-add-audit-import-and-timestamps.sql
```

**Option 3: Using Supabase CLI**

```bash
supabase db push
```

### Verification

After running the migration, verify the changes:

```sql
-- Check transactions table has new columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('created_at', 'updated_at', 'deleted_at', 'metadata');

-- Check import_history table exists
SELECT * FROM import_history LIMIT 1;

-- Check transaction_audit table exists
SELECT * FROM transaction_audit LIMIT 1;
```

### Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove columns from transactions
ALTER TABLE transactions DROP COLUMN IF EXISTS created_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS updated_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS metadata;

-- Drop tables
DROP TABLE IF EXISTS transaction_audit;
DROP TABLE IF EXISTS import_history;

-- Drop trigger and function
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP FUNCTION IF EXISTS update_updated_at_column();
```

---

## New Features

### 1. Soft Delete for Transactions

Transactions are no longer permanently deleted. Instead, they are marked with a `deleted_at` timestamp.

**Benefits:**
- Maintain complete historical records
- Ability to restore accidentally deleted transactions
- Audit trail of all deletions

**Usage:**
```javascript
// Delete a transaction (soft delete)
await deleteTransaction(transactionId);

// Get transactions excluding deleted
const { data } = await getTransactions(userId, { includeDeleted: false });

// Get all transactions including deleted
const { data } = await getTransactions(userId, { includeDeleted: true });
```

### 2. Import History Tracking

Every import operation is now logged in the `import_history` table.

**Tracked Information:**
- File name and size
- Number of rows processed
- Successful and failed imports
- Import status
- Metadata (AI usage, matching stats, etc.)

**Usage:**
```javascript
// View import history
const { data } = await getImportHistory(userId);
```

### 3. Transaction Audit Log

All create, update, and delete operations are logged.

**Logged Events:**
- `create` - New transaction created
- `update` - Transaction modified
- `delete` - Transaction soft-deleted
- `restore` - Deleted transaction restored

**Information Stored:**
- Complete transaction payload at time of event
- Changed fields (for updates)
- Timestamp of event
- User ID

### 4. Enhanced Dashboard

**New Period Selectors:**
- Current Month
- Last 3 Months
- Last 6 Months
- Year
- All History
- Custom Date Range

**Improved Visualizations:**
- Horizontal bar chart showing top 10 categories
- Enhanced tooltips with:
  - Formatted currency values
  - Percentage of total
  - Transaction count per category
- Both pie chart and bar chart views for categories

**CSV Export:**
- Export button in dashboard
- Filters based on selected period
- Downloads transactions as CSV file

### 5. Advanced Filtering

```javascript
// Get transactions with filters
const { data } = await getTransactions(userId, {
  includeDeleted: false,
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  type: 'expense',
  limit: 100,
  offset: 0
});
```

---

## API Endpoints

### Export Transactions Endpoint

**Endpoint:** `/api/export-transactions`

**Method:** GET

**Query Parameters:**
- `userId` (required) - User ID for filtering
- `startDate` (optional) - Start date (YYYY-MM-DD)
- `endDate` (optional) - End date (YYYY-MM-DD)
- `type` (optional) - Transaction type (income, expense, investment)

**Example Request:**
```
GET /api/export-transactions?userId=abc123&startDate=2025-01-01&endDate=2025-12-31
```

**Response:**
- CSV file download with Content-Disposition header
- Filename: `transactions_{userId}_{date}.csv`

**CSV Columns:**
- id, date, description, amount, type, category
- payment_method, account, is_installment
- installment_number, installment_count
- notes, created_at, updated_at

---

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Supabase Configuration (existing)
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key

# API Configuration (for export endpoint)
REACT_APP_API_URL=http://localhost:3000

# For serverless deployment (Vercel/Netlify)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

### Vercel Configuration

If deploying to Vercel, ensure `vercel.json` includes:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/server/api/:path*"
    }
  ]
}
```

---

## Backfill and Migration

### Backfilling Existing Transactions

The migration automatically backfills `created_at` for existing transactions using the transaction date. However, you may want to run additional backfill operations:

**Set metadata for existing transactions:**

```sql
-- Add default metadata to transactions without it
UPDATE transactions
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;
```

**Create audit entries for existing transactions:**

```sql
-- Optional: Create audit entries for all existing transactions
INSERT INTO transaction_audit (transaction_id, user_id, event_type, payload, metadata)
SELECT 
  id,
  user_id,
  'create',
  to_jsonb(transactions.*),
  '{}'::jsonb
FROM transactions
WHERE created_at < NOW() - INTERVAL '1 day';
```

### Data Consistency Checks

Run these queries to ensure data consistency:

```sql
-- Check for transactions without created_at
SELECT COUNT(*) FROM transactions WHERE created_at IS NULL;

-- Check for active (non-deleted) transactions
SELECT COUNT(*) FROM transactions WHERE deleted_at IS NULL;

-- View import history statistics
SELECT 
  status,
  COUNT(*) as count,
  SUM(imported_transactions) as total_imported,
  SUM(failed_transactions) as total_failed
FROM import_history
GROUP BY status;
```

---

## Troubleshooting

### Common Issues

**1. Migration fails with "function update_updated_at_column already exists"**

Solution: The function already exists. You can safely ignore this error or drop and recreate:

```sql
DROP FUNCTION IF EXISTS update_updated_at_column();
-- Then re-run the CREATE FUNCTION statement
```

**2. Export endpoint returns 404**

Solution: Ensure your API routes are properly configured in `vercel.json` or your server configuration.

**3. Soft-deleted transactions still appear**

Solution: Ensure you're passing `includeDeleted: false` to `getTransactions`:

```javascript
const { data } = await getTransactions(userId, { includeDeleted: false });
```

**4. Import history not created**

Solution: Check browser console for errors. Ensure the import_history table exists and RLS policies are correct.

**5. CSV export is empty**

Solution: 
- Check that transactions exist for the selected period
- Verify the userId is correct
- Check browser network tab for API errors

### Support and Best Practices

**Best Practices:**

1. **Regular Backups:** Always backup your database before running migrations
2. **Test in Staging:** Test migrations in a staging environment first
3. **Monitor Audit Logs:** Regularly review transaction_audit for unusual activity
4. **Archive Old Data:** Consider archiving old import_history and audit logs
5. **Use Indexes:** The migration creates indexes, but monitor query performance

**Performance Considerations:**

- Soft deletes add a small overhead to queries (mitigated by indexes)
- Audit logging adds minimal overhead to write operations
- Large CSV exports may take time; consider pagination for millions of records

---

## Next Steps

After deploying these changes:

1. ✅ Run the migration in your Supabase project
2. ✅ Deploy the updated application code
3. ✅ Test the dashboard period selectors
4. ✅ Test CSV export functionality
5. ✅ Import some transactions and verify import_history is populated
6. ✅ Delete and restore a transaction to test soft delete
7. ✅ Review audit logs to ensure events are being captured

---

## Summary of Changes

### Database Schema
- ✅ Added `created_at`, `updated_at`, `deleted_at`, `metadata` to transactions
- ✅ Created `import_history` table
- ✅ Created `transaction_audit` table
- ✅ Added trigger for auto-updating `updated_at`

### Application Features
- ✅ Soft delete implementation
- ✅ Import history tracking
- ✅ Audit logging
- ✅ Enhanced dashboard with period selectors
- ✅ CSV export endpoint
- ✅ Advanced transaction filtering
- ✅ Improved category visualizations

### Files Modified
- `migrations/2025-12-11-add-audit-import-and-timestamps.sql` (new)
- `src/services/supabase.js` (modified)
- `server/api/export-transactions.js` (new)
- `src/components/Dashboard/Dashboard.jsx` (modified)
- `src/components/Import/ImportModal.jsx` (modified)
- `src/services/import/importService.js` (modified)

---

For additional support or questions, please refer to the project documentation or create an issue in the repository.
