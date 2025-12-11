-- Migration Script: Add Transaction Audit, Import History and Timestamps
-- Data: 2025-12-11
-- Description: Adds complete historical persistence for transactions with audit logging and import tracking

-- ============================================================================
-- PART 1: Add timestamp and metadata columns to transactions table
-- ============================================================================

-- Add created_at column (timestamp of when transaction was first created)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at column (timestamp of last update)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add deleted_at column (timestamp for soft delete)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add metadata column (JSONB for flexible data storage)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN transactions.created_at IS 'Timestamp when transaction was created';
COMMENT ON COLUMN transactions.updated_at IS 'Timestamp when transaction was last updated';
COMMENT ON COLUMN transactions.deleted_at IS 'Timestamp when transaction was soft-deleted (NULL if not deleted)';
COMMENT ON COLUMN transactions.metadata IS 'Additional metadata including import_id, AI extraction details, etc.';

-- Create index on deleted_at for efficient soft-delete queries
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at 
ON transactions(deleted_at) WHERE deleted_at IS NULL;

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_created_at 
ON transactions(created_at DESC);

-- Create GIN index on metadata for JSONB queries
CREATE INDEX IF NOT EXISTS idx_transactions_metadata 
ON transactions USING GIN (metadata);

-- ============================================================================
-- PART 2: Create trigger function for automatic updated_at
-- ============================================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 3: Create import_history table
-- ============================================================================

-- Create table to track all import operations
CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT,
  file_size INTEGER,
  total_rows INTEGER DEFAULT 0,
  extracted_transactions INTEGER DEFAULT 0,
  imported_transactions INTEGER DEFAULT 0,
  failed_transactions INTEGER DEFAULT 0,
  import_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE import_history IS 'Tracks all transaction import operations';
COMMENT ON COLUMN import_history.file_name IS 'Name of imported file (CSV, photo, SMS, etc.)';
COMMENT ON COLUMN import_history.file_size IS 'File size in bytes';
COMMENT ON COLUMN import_history.total_rows IS 'Total rows in import file';
COMMENT ON COLUMN import_history.extracted_transactions IS 'Number of transactions extracted';
COMMENT ON COLUMN import_history.imported_transactions IS 'Number of transactions successfully imported';
COMMENT ON COLUMN import_history.failed_transactions IS 'Number of transactions that failed to import';
COMMENT ON COLUMN import_history.status IS 'Import status: pending, processing, completed, failed, partial';
COMMENT ON COLUMN import_history.metadata IS 'Additional import details: import_type, errors, AI usage, etc.';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_import_history_user_id 
ON import_history(user_id);

CREATE INDEX IF NOT EXISTS idx_import_history_import_date 
ON import_history(import_date DESC);

CREATE INDEX IF NOT EXISTS idx_import_history_status 
ON import_history(status);

-- Enable Row Level Security
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own import history" 
ON import_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import history" 
ON import_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import history" 
ON import_history FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own import history" 
ON import_history FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================================================
-- PART 4: Create transaction_audit table
-- ============================================================================

-- Create table to log all transaction events (create, update, delete)
CREATE TABLE IF NOT EXISTS transaction_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN ('create', 'update', 'delete', 'restore')) NOT NULL,
  event_timestamp TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL,
  changed_fields TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add comments
COMMENT ON TABLE transaction_audit IS 'Audit log for all transaction events';
COMMENT ON COLUMN transaction_audit.transaction_id IS 'ID of the transaction being audited';
COMMENT ON COLUMN transaction_audit.event_type IS 'Type of event: create, update, delete, restore';
COMMENT ON COLUMN transaction_audit.event_timestamp IS 'When the event occurred';
COMMENT ON COLUMN transaction_audit.payload IS 'Full transaction data at time of event';
COMMENT ON COLUMN transaction_audit.changed_fields IS 'Array of field names that changed (for updates)';
COMMENT ON COLUMN transaction_audit.metadata IS 'Additional audit context (IP, user agent, etc.)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transaction_audit_transaction_id 
ON transaction_audit(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_user_id 
ON transaction_audit(user_id);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_event_timestamp 
ON transaction_audit(event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_event_type 
ON transaction_audit(event_type);

-- Enable Row Level Security
ALTER TABLE transaction_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own audit logs" 
ON transaction_audit FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" 
ON transaction_audit FOR INSERT 
WITH CHECK (true);

-- ============================================================================
-- PART 5: Backfill existing transactions with created_at (optional)
-- ============================================================================

-- Update existing transactions that don't have created_at
-- Use the 'date' field as a reasonable approximation for created_at
UPDATE transactions 
SET created_at = COALESCE(date::timestamptz, NOW())
WHERE created_at IS NULL;

-- ============================================================================
-- PART 6: Verification queries
-- ============================================================================

-- Verify transactions table structure
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('created_at', 'updated_at', 'deleted_at', 'metadata')
ORDER BY ordinal_position;

-- Verify import_history table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'import_history'
ORDER BY ordinal_position;

-- Verify transaction_audit table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transaction_audit'
ORDER BY ordinal_position;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- DEPLOYMENT INSTRUCTIONS:
-- 1. Go to Supabase SQL Editor
-- 2. Create a new query
-- 3. Paste this entire migration script
-- 4. Execute the script
-- 5. Verify that all tables and columns were created successfully
-- 6. Check that existing data was not affected
--
-- ROLLBACK (if needed):
-- Note: Rollback should be done carefully to avoid data loss
-- 
-- -- Remove columns from transactions
-- ALTER TABLE transactions DROP COLUMN IF EXISTS created_at;
-- ALTER TABLE transactions DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE transactions DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE transactions DROP COLUMN IF EXISTS metadata;
-- 
-- -- Drop tables
-- DROP TABLE IF EXISTS transaction_audit;
-- DROP TABLE IF EXISTS import_history;
-- 
-- -- Drop trigger
-- DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- 
-- ============================================================================
