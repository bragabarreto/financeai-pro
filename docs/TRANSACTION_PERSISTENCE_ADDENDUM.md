# Transaction Persistence and Dashboard Improvements - Implementation Guide

This document describes the implementation of transaction audit trail, import history tracking, and dashboard visualization improvements.

## Overview

This update adds comprehensive transaction persistence features including:

1. **Audit Trail**: Complete history of all transaction changes (create, update, delete)
2. **Import History**: Tracking of all file imports with success/failure metrics
3. **Soft Deletes**: Transactions are marked as deleted rather than physically removed
4. **Enhanced Dashboard**: Advanced period selection and improved visualizations
5. **CSV Export**: Export transactions for reporting and analysis

## Database Changes

### Migration File

Location: `migrations/2025-12-11-add-audit-import-and-timestamps.sql`

This migration adds:

- **transactions table updates**:
  - `created_at` (TIMESTAMPTZ): When the transaction was first created
  - `updated_at` (TIMESTAMPTZ): When the transaction was last updated
  - `deleted_at` (TIMESTAMPTZ): When the transaction was soft-deleted (NULL if active)
  - `metadata` (JSONB): Additional tracking information including import_id

- **import_history table**: Tracks all import operations
  - Records file name, size, row counts
  - Tracks success/failure metrics
  - Stores import metadata and errors

- **transaction_audit table**: Complete audit trail
  - Records all create/update/delete operations
  - Stores full transaction payload at time of action
  - Indexed for efficient querying

### Running the Migration

#### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Open the migration file: `migrations/2025-12-11-add-audit-import-and-timestamps.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run" to execute

#### Option 2: Using psql Command Line

```bash
# Set your database connection string
export DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"

# Run the migration
psql $DATABASE_URL -f migrations/2025-12-11-add-audit-import-and-timestamps.sql
```

#### Option 3: Using Supabase CLI

```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migration
supabase db push
```

### Verifying the Migration

After running the migration, verify it was successful:

```sql
-- Check that new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('created_at', 'updated_at', 'deleted_at', 'metadata');

-- Check that new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('import_history', 'transaction_audit');

-- Verify trigger exists
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'transactions' 
AND trigger_name = 'update_transactions_updated_at';
```

## Application Updates

### 1. Supabase Service Changes

File: `src/services/supabase.js`

**getTransactions**:
- Now supports `includeDeleted`, `limit`, and `offset` parameters
- Automatically excludes soft-deleted transactions by default
- Pagination support for large datasets

```javascript
// Example usage
const { data, error } = await getTransactions(userId, {
  includeDeleted: false,
  limit: 50,
  offset: 0
});
```

**createTransaction**:
- Automatically sets `created_at` timestamp
- Initializes `metadata` object
- Creates audit log entry

**updateTransaction**:
- Automatic `updated_at` timestamp via database trigger
- Creates audit log entry

**deleteTransaction**:
- Implements soft-delete (sets `deleted_at` instead of physical delete)
- Creates audit log entry
- Preserves all transaction data for historical reporting

**New Functions**:
- `createImportHistory(importData)`: Record new import operation
- `updateImportHistory(id, updates)`: Update import status/results
- `getImportHistory(userId)`: Retrieve user's import history

### 2. Export Endpoint

File: `api/export-transactions.js`

A serverless function that exports transactions to CSV format.

**Endpoint**: `/api/export-transactions`

**Query Parameters**:
- `userId` (required): User ID to export transactions for
- `startDate` (optional): ISO date string for filtering (inclusive)
- `endDate` (optional): ISO date string for filtering (inclusive)
- `type` (optional): Filter by transaction type (income, expense, investment)

**Example Usage**:

```javascript
// From the dashboard
const params = new URLSearchParams({ 
  userId: user.id,
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  type: 'expense'
});

const response = await fetch(`/api/export-transactions?${params.toString()}`);
const blob = await response.blob();
// Download the file
```

**Security**:
- CORS enabled for the application domain
- Requires valid userId
- Uses Supabase RLS policies for data access control

**CSV Format**:
- UTF-8 with BOM for Excel compatibility
- Includes all transaction fields
- Formatted for easy analysis

### 3. Dashboard Improvements

File: `src/components/Dashboard/Dashboard.jsx`

**New Period Selectors**:
- Current Month
- Last 3 Months
- Last 6 Months
- Year
- All History
- Custom Date Range

**Enhanced Category Visualization**:
- Toggle between Pie Chart and Horizontal Bar Chart
- Rich tooltips showing:
  - Category name
  - Amount in R$
  - Percentage of total
  - Number of transactions
- Limited to top 8 categories for clarity

**Export Button**:
- Direct CSV export from dashboard
- Respects current period filter
- Downloads file immediately

### 4. Import History Tracking

File: `src/components/Import/ImportModal.jsx`

**Automatic Tracking**:
- Creates import_history record before import starts
- Updates with success/failure counts after import
- Stores import metadata (source, mode, errors)
- Links all imported transactions via metadata.import_id

**Import Metadata**:
Each imported transaction includes:
```javascript
{
  metadata: {
    import_id: "uuid-of-import-record",
    import_source: "csv|text|photo|paycheck",
    import_date: "2025-12-11T10:30:00Z"
  }
}
```

## Environment Variables

The export endpoint requires Supabase configuration:

```bash
# In production (Vercel/deployment platform)
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key  # For server-side operations

# For local development
# Create .env.local with the same variables
```

## Deployment

### Vercel Deployment

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Environment Variables** in Vercel dashboard:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY` (for export endpoint)

3. **Deploy**:
   ```bash
   vercel --prod
   ```

### Run Migration on Production

After deploying the application:

1. Access your production Supabase dashboard
2. Run the migration SQL as described above
3. Verify tables and columns were created
4. Test the application

## Testing Locally

1. **Start the development server**:
   ```bash
   npm start
   ```

2. **Run migration** on your development Supabase instance

3. **Test features**:
   - Create, update, and delete transactions
   - Import transactions and check import_history
   - Use dashboard period selectors
   - Export transactions to CSV
   - Check that soft-deleted transactions don't appear in lists

4. **Verify in Supabase**:
   ```sql
   -- Check audit trail
   SELECT * FROM transaction_audit ORDER BY timestamp DESC LIMIT 10;
   
   -- Check import history
   SELECT * FROM import_history ORDER BY import_date DESC LIMIT 10;
   
   -- Check soft-deleted transactions
   SELECT * FROM transactions WHERE deleted_at IS NOT NULL;
   ```

## Backward Compatibility

This update is **fully backward compatible**:

- No existing columns are renamed or removed
- Soft-delete preserves all data
- New columns have defaults and are nullable
- Existing functionality continues to work
- New features are additive only

## Rollback Instructions

If you need to rollback the migration:

```sql
-- Remove new columns from transactions
ALTER TABLE transactions 
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at,
DROP COLUMN IF EXISTS deleted_at,
DROP COLUMN IF EXISTS metadata;

-- Drop new tables
DROP TABLE IF EXISTS transaction_audit;
DROP TABLE IF EXISTS import_history;

-- Drop trigger
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
```

**Note**: This will lose all audit trail and import history data.

## Troubleshooting

### Migration Fails with "gen_random_uuid() does not exist"

Enable the pgcrypto extension:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Or modify the migration to use `uuid_generate_v4()` instead:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Then replace gen_random_uuid() with uuid_generate_v4()
```

### Export Endpoint Returns 500 Error

Check:
1. Environment variables are set correctly
2. Supabase service key is valid
3. RLS policies allow the query
4. Check server logs for details

### Transactions Not Appearing After Soft-Delete

This is expected behavior. To view deleted transactions:

```javascript
const { data } = await getTransactions(userId, { includeDeleted: true });
```

Or in SQL:
```sql
SELECT * FROM transactions WHERE user_id = 'your-user-id';
-- This shows all transactions including soft-deleted ones
```

## Support

For issues or questions:
1. Check this documentation
2. Review the implementation code
3. Check Supabase logs for errors
4. Verify environment variables are set correctly

## Future Enhancements

Potential improvements for future iterations:

1. **Restore Deleted Transactions**: UI to restore soft-deleted transactions
2. **Audit Log Viewer**: Dashboard to view transaction history
3. **Import History Dashboard**: Visualize import success rates
4. **Export Formats**: Add Excel, JSON export options
5. **Scheduled Exports**: Email periodic reports
6. **Advanced Filtering**: More granular export filters

---

Last Updated: 2025-12-11
