-- Migration Script: Add Transaction Persistence, Audit Trail, and Import History
-- Date: 2025-12-11
-- Description: Adds audit columns to transactions, creates import_history and transaction_audit tables

-- ============================================================================
-- 1. Add audit and metadata columns to transactions table
-- ============================================================================

-- Add created_at column (when transaction was first created)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at column (when transaction was last modified)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add deleted_at column for soft-delete functionality
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add metadata column for storing additional information (import tracking, etc.)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add comments to document the columns
COMMENT ON COLUMN transactions.created_at IS 'Timestamp when the transaction was first created';
COMMENT ON COLUMN transactions.updated_at IS 'Timestamp when the transaction was last updated';
COMMENT ON COLUMN transactions.deleted_at IS 'Timestamp when the transaction was soft-deleted (NULL if active)';
COMMENT ON COLUMN transactions.metadata IS 'JSON metadata including import_id, source, and other tracking information';

-- Create index for soft-delete queries (active transactions)
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at 
ON transactions(deleted_at) WHERE deleted_at IS NULL;

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_transactions_metadata 
ON transactions USING GIN (metadata);

-- ============================================================================
-- 2. Create or replace trigger function for updated_at
-- ============================================================================

-- This function already exists from previous migration, but we ensure it's available
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Create trigger for transactions.updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Create import_history table
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  total_rows INTEGER NOT NULL DEFAULT 0,
  extracted_transactions INTEGER NOT NULL DEFAULT 0,
  imported_transactions INTEGER NOT NULL DEFAULT 0,
  failed_transactions INTEGER NOT NULL DEFAULT 0,
  import_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial'))
);

-- Add comments
COMMENT ON TABLE import_history IS 'Tracks file import operations and their results';
COMMENT ON COLUMN import_history.user_id IS 'User who performed the import';
COMMENT ON COLUMN import_history.file_name IS 'Name of the imported file';
COMMENT ON COLUMN import_history.file_size IS 'Size of the imported file in bytes';
COMMENT ON COLUMN import_history.total_rows IS 'Total number of rows in the import file';
COMMENT ON COLUMN import_history.extracted_transactions IS 'Number of transactions successfully extracted';
COMMENT ON COLUMN import_history.imported_transactions IS 'Number of transactions successfully imported';
COMMENT ON COLUMN import_history.failed_transactions IS 'Number of transactions that failed to import';
COMMENT ON COLUMN import_history.status IS 'Status of the import operation';
COMMENT ON COLUMN import_history.metadata IS 'Additional metadata about the import (errors, warnings, etc.)';

-- Create indexes for import_history
CREATE INDEX IF NOT EXISTS idx_import_history_user_id 
ON import_history(user_id);

CREATE INDEX IF NOT EXISTS idx_import_history_import_date 
ON import_history(import_date DESC);

CREATE INDEX IF NOT EXISTS idx_import_history_status 
ON import_history(status);

-- Enable Row Level Security
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for import_history
CREATE POLICY "Users can view their own import history" 
ON import_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import history" 
ON import_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import history" 
ON import_history FOR UPDATE 
USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Create transaction_audit table
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- create, update, delete
  payload JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_action CHECK (action IN ('create', 'update', 'delete'))
);

-- Add comments
COMMENT ON TABLE transaction_audit IS 'Audit trail for all transaction changes';
COMMENT ON COLUMN transaction_audit.transaction_id IS 'Reference to the transaction (NULL if deleted)';
COMMENT ON COLUMN transaction_audit.user_id IS 'User who performed the action';
COMMENT ON COLUMN transaction_audit.action IS 'Type of action performed';
COMMENT ON COLUMN transaction_audit.payload IS 'Complete transaction data at the time of action';
COMMENT ON COLUMN transaction_audit.timestamp IS 'When the action was performed';

-- Create indexes for transaction_audit
CREATE INDEX IF NOT EXISTS idx_transaction_audit_transaction_id 
ON transaction_audit(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_user_id 
ON transaction_audit(user_id);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_timestamp 
ON transaction_audit(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_action 
ON transaction_audit(action);

-- Enable Row Level Security
ALTER TABLE transaction_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transaction_audit
CREATE POLICY "Users can view their own audit logs" 
ON transaction_audit FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs" 
ON transaction_audit FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. Backfill existing transactions with created_at
-- ============================================================================

-- Set created_at for existing transactions that don't have it
-- Use the transaction date as a reasonable approximation
UPDATE transactions 
SET created_at = COALESCE(date::timestamptz, NOW())
WHERE created_at IS NULL;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify the changes
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('transactions', 'import_history', 'transaction_audit')
  AND column_name IN ('created_at', 'updated_at', 'deleted_at', 'metadata', 'user_id', 'status', 'action')
ORDER BY table_name, ordinal_position;

-- Note: If gen_random_uuid() is not available, enable the pgcrypto extension:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Or use uuid_generate_v4() if uuid-ossp extension is enabled instead
