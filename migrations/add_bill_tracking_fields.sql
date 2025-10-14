-- Migration: Adicionar campos para melhor acompanhamento de faturas
-- Data: 2025-10-13
-- Descrição: Adiciona campos para rastreamento de status e período de fechamento das faturas

-- 1. Adicionar coluna para data de fechamento da fatura
ALTER TABLE credit_card_bills 
ADD COLUMN IF NOT EXISTS closing_date DATE;

-- 2. Adicionar coluna para período de referência (início)
ALTER TABLE credit_card_bills 
ADD COLUMN IF NOT EXISTS period_start DATE;

-- 3. Adicionar coluna para período de referência (fim)
ALTER TABLE credit_card_bills 
ADD COLUMN IF NOT EXISTS period_end DATE;

-- 4. Adicionar coluna para status da fatura
ALTER TABLE credit_card_bills 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open' 
CHECK (status IN ('open', 'closed', 'paid', 'overdue'));

-- 5. Adicionar comentários nas colunas
COMMENT ON COLUMN credit_card_bills.closing_date IS 'Data de fechamento da fatura';
COMMENT ON COLUMN credit_card_bills.period_start IS 'Data de início do período da fatura';
COMMENT ON COLUMN credit_card_bills.period_end IS 'Data de fim do período da fatura (dia de fechamento)';
COMMENT ON COLUMN credit_card_bills.status IS 'Status da fatura: open (aberta), closed (fechada), paid (paga), overdue (vencida)';

-- 6. Criar índices para consultas otimizadas
CREATE INDEX IF NOT EXISTS idx_credit_card_bills_status 
ON credit_card_bills(status);

CREATE INDEX IF NOT EXISTS idx_credit_card_bills_card_period 
ON credit_card_bills(card_id, year, month);

CREATE INDEX IF NOT EXISTS idx_credit_card_bills_due_date 
ON credit_card_bills(due_date) WHERE status != 'paid';

-- 7. Atualizar faturas existentes para adicionar status
UPDATE credit_card_bills
SET status = CASE
  WHEN is_paid = true THEN 'paid'
  WHEN due_date < CURRENT_DATE AND is_paid = false THEN 'overdue'
  ELSE 'open'
END
WHERE status IS NULL;

-- Fim da migration

