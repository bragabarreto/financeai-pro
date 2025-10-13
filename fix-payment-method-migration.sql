-- Migration Script: Adicionar coluna payment_method na tabela transactions
-- Data: 13/10/2025
-- Descrição: Corrige erro "Could not find the 'payment_method' column" adicionando a coluna faltante

-- IMPORTANTE: Este script deve ser executado no Supabase SQL Editor

-- 1. Adicionar coluna payment_method se não existir
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 2. Adicionar comentário na coluna
COMMENT ON COLUMN transactions.payment_method IS 'Método de pagamento utilizado na transação (credit_card, debit_card, pix, transfer, etc)';

-- 3. Criar índice para consultas por método de pagamento
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method 
ON transactions(payment_method);

-- 4. Atualizar registros existentes que não têm payment_method
-- Inferir payment_method baseado em card_id e account_id
UPDATE transactions
SET payment_method = CASE
  WHEN card_id IS NOT NULL THEN 'credit_card'
  WHEN account_id IS NOT NULL THEN 'pix'
  ELSE 'pix'
END
WHERE payment_method IS NULL OR payment_method = '';

-- 5. Verificar se a coluna foi criada corretamente
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transactions' 
  AND column_name = 'payment_method';

-- 6. Contar transações por método de pagamento
SELECT 
  payment_method,
  COUNT(*) as total
FROM transactions
GROUP BY payment_method
ORDER BY total DESC;

-- Fim da migration

