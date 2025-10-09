-- Migration Script: Adicionar suporte a múltiplos números de cartão
-- Data: 08/10/2025
-- Descrição: Adiciona coluna last_digits_list para armazenar até 5 números de cartão

-- 1. Adicionar coluna last_digits_list na tabela credit_cards
ALTER TABLE credit_cards 
ADD COLUMN IF NOT EXISTS last_digits_list TEXT[];

-- 2. Adicionar comentário na coluna
COMMENT ON COLUMN credit_cards.last_digits_list IS 'Array com até 5 números de cartão (últimos 4 dígitos) para identificação pela IA';

-- 3. Criar índice para busca eficiente
CREATE INDEX IF NOT EXISTS idx_credit_cards_last_digits_list 
ON credit_cards USING GIN (last_digits_list);

-- 4. Criar tabela user_settings se não existir (para armazenar configurações de IA)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 5. Adicionar comentário na tabela
COMMENT ON TABLE user_settings IS 'Configurações do usuário, incluindo configurações de IA';

-- 6. Criar índice para user_id
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id 
ON user_settings(user_id);

-- 7. Habilitar Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 8. Criar políticas de segurança para user_settings
CREATE POLICY "Users can view their own settings" 
ON user_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
ON user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON user_settings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" 
ON user_settings FOR DELETE 
USING (auth.uid() = user_id);

-- 9. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Criar trigger para user_settings
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Verificar estrutura das tabelas
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('credit_cards', 'user_settings')
ORDER BY table_name, ordinal_position;

-- Fim da migration

-- Migration Script: Adicionar suporte a transações parceladas
-- Data: Atual
-- Descrição: Adiciona campos para permitir registro de transações parceladas

-- 12. Adicionar campos de parcelamento na tabela transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_installment BOOLEAN DEFAULT FALSE;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS installment_count INTEGER;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS installment_due_dates TEXT[];

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS last_installment_date DATE;

-- 13. Adicionar comentários nas colunas
COMMENT ON COLUMN transactions.is_installment IS 'Indica se a transação é parcelada';
COMMENT ON COLUMN transactions.installment_count IS 'Quantidade de parcelas (número de meses)';
COMMENT ON COLUMN transactions.installment_due_dates IS 'Array com datas de vencimento mensal';
COMMENT ON COLUMN transactions.last_installment_date IS 'Data da última parcela';

-- 14. Criar índice para consultas de transações parceladas
CREATE INDEX IF NOT EXISTS idx_transactions_installment 
ON transactions(is_installment) WHERE is_installment = TRUE;

-- Fim da migration de parcelamento
