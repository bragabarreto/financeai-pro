-- ============================================================
-- Migration: Persistência Histórica de Transações
-- Data: 2025-12-11
-- Descrição: Adiciona campos de auditoria, timestamps e tabelas
--            para rastreamento de importações
-- ============================================================

-- Habilitar extensão para UUIDs (se não existir)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. Adicionar colunas de timestamp e metadata na tabela transactions
-- ============================================================

-- created_at: quando a transação foi criada no sistema
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- updated_at: quando a transação foi atualizada pela última vez
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- deleted_at: soft-delete - quando a transação foi "excluída"
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- metadata: dados adicionais em formato JSON (import_id, source, etc)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ============================================================
-- 2. Criar tabela import_history para rastrear importações
-- ============================================================

CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_date TIMESTAMPTZ DEFAULT NOW(),
  source VARCHAR(50) NOT NULL, -- 'csv', 'sms', 'photo', 'paycheck', 'manual'
  file_name VARCHAR(255),
  total_rows INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'partial'
  error_details JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para import_history
CREATE INDEX IF NOT EXISTS idx_import_history_user_id ON import_history(user_id);
CREATE INDEX IF NOT EXISTS idx_import_history_status ON import_history(status);
CREATE INDEX IF NOT EXISTS idx_import_history_import_date ON import_history(import_date DESC);

-- ============================================================
-- 3. Criar tabela transaction_audit para auditoria
-- ============================================================

CREATE TABLE IF NOT EXISTS transaction_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete', 'restore'
  old_values JSONB DEFAULT NULL,
  new_values JSONB DEFAULT NULL,
  changed_fields TEXT[] DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para transaction_audit
CREATE INDEX IF NOT EXISTS idx_transaction_audit_transaction_id ON transaction_audit(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_user_id ON transaction_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_action ON transaction_audit(action);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_created_at ON transaction_audit(created_at DESC);

-- ============================================================
-- 4. Trigger para atualizar updated_at automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela transactions
DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON transactions;
CREATE TRIGGER trigger_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger na tabela import_history
DROP TRIGGER IF EXISTS trigger_import_history_updated_at ON import_history;
CREATE TRIGGER trigger_import_history_updated_at
  BEFORE UPDATE ON import_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. Trigger para registrar auditoria automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION audit_transaction_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed TEXT[] := '{}';
  old_json JSONB := NULL;
  new_json JSONB := NULL;
BEGIN
  -- Determinar a ação
  IF TG_OP = 'INSERT' THEN
    new_json := to_jsonb(NEW);
    INSERT INTO transaction_audit (
      transaction_id, user_id, action, new_values, created_at
    ) VALUES (
      NEW.id, NEW.user_id, 'create', new_json, NOW()
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    
    -- Detectar campos alterados
    IF OLD.amount IS DISTINCT FROM NEW.amount THEN changed := array_append(changed, 'amount'); END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN changed := array_append(changed, 'description'); END IF;
    IF OLD.date IS DISTINCT FROM NEW.date THEN changed := array_append(changed, 'date'); END IF;
    IF OLD.type IS DISTINCT FROM NEW.type THEN changed := array_append(changed, 'type'); END IF;
    IF OLD.category IS DISTINCT FROM NEW.category THEN changed := array_append(changed, 'category'); END IF;
    IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN changed := array_append(changed, 'account_id'); END IF;
    IF OLD.card_id IS DISTINCT FROM NEW.card_id THEN changed := array_append(changed, 'card_id'); END IF;
    IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN changed := array_append(changed, 'deleted_at'); END IF;
    
    -- Determinar se é soft-delete ou restore
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      INSERT INTO transaction_audit (
        transaction_id, user_id, action, old_values, new_values, changed_fields, created_at
      ) VALUES (
        NEW.id, NEW.user_id, 'delete', old_json, new_json, changed, NOW()
      );
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      INSERT INTO transaction_audit (
        transaction_id, user_id, action, old_values, new_values, changed_fields, created_at
      ) VALUES (
        NEW.id, NEW.user_id, 'restore', old_json, new_json, changed, NOW()
      );
    ELSE
      INSERT INTO transaction_audit (
        transaction_id, user_id, action, old_values, new_values, changed_fields, created_at
      ) VALUES (
        NEW.id, NEW.user_id, 'update', old_json, new_json, changed, NOW()
      );
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
    INSERT INTO transaction_audit (
      transaction_id, user_id, action, old_values, created_at
    ) VALUES (
      OLD.id, OLD.user_id, 'delete', old_json, NOW()
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de auditoria
DROP TRIGGER IF EXISTS trigger_transaction_audit ON transactions;
CREATE TRIGGER trigger_transaction_audit
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION audit_transaction_changes();

-- ============================================================
-- 6. Índices adicionais para performance
-- ============================================================

-- Índice para soft-delete (transações não deletadas)
CREATE INDEX IF NOT EXISTS idx_transactions_not_deleted 
ON transactions(user_id, date DESC) 
WHERE deleted_at IS NULL;

-- Índice para metadata (busca por import_id)
CREATE INDEX IF NOT EXISTS idx_transactions_metadata_import_id 
ON transactions((metadata->>'import_id'));

-- Índice para busca por período
CREATE INDEX IF NOT EXISTS idx_transactions_date_range 
ON transactions(user_id, date);

-- ============================================================
-- 7. View para transações ativas (não deletadas)
-- ============================================================

CREATE OR REPLACE VIEW active_transactions AS
SELECT * FROM transactions WHERE deleted_at IS NULL;

-- ============================================================
-- 8. Função para soft-delete
-- ============================================================

CREATE OR REPLACE FUNCTION soft_delete_transaction(transaction_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE transactions 
  SET deleted_at = NOW() 
  WHERE id = transaction_uuid AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. Função para restaurar transação deletada
-- ============================================================

CREATE OR REPLACE FUNCTION restore_transaction(transaction_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE transactions 
  SET deleted_at = NULL 
  WHERE id = transaction_uuid AND deleted_at IS NOT NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10. Políticas RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_audit ENABLE ROW LEVEL SECURITY;

-- Políticas para import_history
DROP POLICY IF EXISTS "Users can view own import history" ON import_history;
CREATE POLICY "Users can view own import history" ON import_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own import history" ON import_history;
CREATE POLICY "Users can insert own import history" ON import_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own import history" ON import_history;
CREATE POLICY "Users can update own import history" ON import_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para transaction_audit
DROP POLICY IF EXISTS "Users can view own audit logs" ON transaction_audit;
CREATE POLICY "Users can view own audit logs" ON transaction_audit
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 11. Migrar dados existentes (atualizar created_at onde está NULL)
-- ============================================================

-- Para transações existentes sem created_at, usar a data da transação
UPDATE transactions 
SET created_at = COALESCE(created_at, date::timestamptz, NOW())
WHERE created_at IS NULL;

-- Garantir que updated_at tenha valor
UPDATE transactions 
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

-- ============================================================
-- Verificação final
-- ============================================================

-- Verificar se as colunas foram criadas
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Tables created: import_history, transaction_audit';
  RAISE NOTICE 'Columns added to transactions: created_at, updated_at, deleted_at, metadata';
  RAISE NOTICE 'Triggers created: updated_at auto-update, transaction audit';
END $$;
