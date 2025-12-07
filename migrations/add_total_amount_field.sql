-- Migration: Adicionar campo total_amount para transações parceladas
-- Data: 07/12/2025
-- Descrição: Adiciona campo para armazenar o valor total da compra em cada parcela

-- 1. Adicionar coluna total_amount na tabela transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2);

-- 2. Adicionar comentário na coluna
COMMENT ON COLUMN transactions.total_amount IS 'Valor total da compra (para transações parceladas, representa o valor total antes da divisão)';

-- 3. Criar índice para consultas otimizadas (opcional)
CREATE INDEX IF NOT EXISTS idx_transactions_total_amount 
ON transactions(total_amount) WHERE is_installment = TRUE;

-- Fim da migration
