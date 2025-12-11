-- Migration: Add audit, import history, and timestamp fields
-- Created: 2025-12-11
-- Description: Adds audit trail, import history tracking, and proper timestamp management

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add timestamp columns to transactions table
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index on timestamp columns for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_updated_at ON transactions(updated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create import_history table
CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_name TEXT,
  file_type TEXT CHECK (file_type IN ('csv', 'xlsx', 'sms', 'photo', 'manual')),
  records_imported INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('success', 'partial', 'failed')) DEFAULT 'success',
  error_details JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for import_history
CREATE INDEX IF NOT EXISTS idx_import_history_user_id ON import_history(user_id);
CREATE INDEX IF NOT EXISTS idx_import_history_import_date ON import_history(import_date DESC);
CREATE INDEX IF NOT EXISTS idx_import_history_status ON import_history(status);

-- Create transaction_audit table for tracking changes
CREATE TABLE IF NOT EXISTS transaction_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT CHECK (action IN ('create', 'update', 'delete', 'restore')) NOT NULL,
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for transaction_audit
CREATE INDEX IF NOT EXISTS idx_transaction_audit_transaction_id ON transaction_audit(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_user_id ON transaction_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_created_at ON transaction_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_action ON transaction_audit(action);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on transactions
DROP TRIGGER IF EXISTS trigger_update_transactions_updated_at ON transactions;
CREATE TRIGGER trigger_update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to log transaction changes
CREATE OR REPLACE FUNCTION log_transaction_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields JSONB := '{}'::jsonb;
  old_vals JSONB := '{}'::jsonb;
  new_vals JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO transaction_audit (
      transaction_id,
      user_id,
      action,
      new_values,
      created_at
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'create',
      to_jsonb(NEW),
      NOW()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Build changed fields JSON
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      changed_fields := changed_fields || '{"description": true}'::jsonb;
      old_vals := old_vals || jsonb_build_object('description', OLD.description);
      new_vals := new_vals || jsonb_build_object('description', NEW.description);
    END IF;
    IF OLD.amount IS DISTINCT FROM NEW.amount THEN
      changed_fields := changed_fields || '{"amount": true}'::jsonb;
      old_vals := old_vals || jsonb_build_object('amount', OLD.amount);
      new_vals := new_vals || jsonb_build_object('amount', NEW.amount);
    END IF;
    IF OLD.date IS DISTINCT FROM NEW.date THEN
      changed_fields := changed_fields || '{"date": true}'::jsonb;
      old_vals := old_vals || jsonb_build_object('date', OLD.date);
      new_vals := new_vals || jsonb_build_object('date', NEW.date);
    END IF;
    IF OLD.category IS DISTINCT FROM NEW.category THEN
      changed_fields := changed_fields || '{"category": true}'::jsonb;
      old_vals := old_vals || jsonb_build_object('category', OLD.category);
      new_vals := new_vals || jsonb_build_object('category', NEW.category);
    END IF;
    IF OLD.payment_method IS DISTINCT FROM NEW.payment_method THEN
      changed_fields := changed_fields || '{"payment_method": true}'::jsonb;
      old_vals := old_vals || jsonb_build_object('payment_method', OLD.payment_method);
      new_vals := new_vals || jsonb_build_object('payment_method', NEW.payment_method);
    END IF;
    
    -- Only log if there are actual changes
    IF changed_fields != '{}'::jsonb THEN
      INSERT INTO transaction_audit (
        transaction_id,
        user_id,
        action,
        changed_fields,
        old_values,
        new_values,
        created_at
      ) VALUES (
        NEW.id,
        NEW.user_id,
        'update',
        changed_fields,
        old_vals,
        new_vals,
        NOW()
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO transaction_audit (
      transaction_id,
      user_id,
      action,
      old_values,
      created_at
    ) VALUES (
      OLD.id,
      OLD.user_id,
      'delete',
      to_jsonb(OLD),
      NOW()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log transaction changes
DROP TRIGGER IF EXISTS trigger_log_transaction_changes ON transactions;
CREATE TRIGGER trigger_log_transaction_changes
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION log_transaction_changes();

-- Update existing transactions to have created_at if null
UPDATE transactions 
SET created_at = COALESCE(date, NOW())
WHERE created_at IS NULL;

-- Add comment to tables for documentation
COMMENT ON TABLE import_history IS 'Tracks all import operations including CSV, XLSX, SMS, and photo imports';
COMMENT ON TABLE transaction_audit IS 'Audit trail for all transaction changes including create, update, and delete operations';
COMMENT ON COLUMN transactions.metadata IS 'Additional metadata for transactions including import source, AI extraction confidence, etc.';
COMMENT ON COLUMN transactions.deleted_at IS 'Soft delete timestamp - NULL means active, non-NULL means deleted';

-- Grant necessary permissions (adjust based on your RLS policies)
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for import_history
CREATE POLICY "Users can view their own import history"
  ON import_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import history"
  ON import_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for transaction_audit
CREATE POLICY "Users can view audit logs for their transactions"
  ON transaction_audit FOR SELECT
  USING (auth.uid() = user_id);

-- Migration completed successfully
SELECT 'Migration completed: audit, import history, and timestamps added' AS status;
