# Guia de Execução da Migration e Configuração de Variáveis

## Pré-requisitos

- Acesso ao projeto Supabase (https://supabase.com/dashboard)
- Credenciais de administrador do projeto
- Acesso ao repositório do código

---

## PARTE 1: Configuração das Variáveis de Ambiente

### 1.1 Obter Credenciais do Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** (ícone de engrenagem) → **API**
4. Copie os seguintes valores:

| Campo no Supabase | Variável de Ambiente |
|-------------------|---------------------|
| Project URL | `SUPABASE_URL` / `REACT_APP_SUPABASE_URL` |
| anon public | `SUPABASE_KEY` / `REACT_APP_SUPABASE_ANON_KEY` |
| service_role (secret) | `SUPABASE_SERVICE_ROLE_KEY` |

### 1.2 Configurar Arquivo .env

Crie ou edite o arquivo `.env` na raiz do projeto:

```bash
# Supabase - Configuração Principal
REACT_APP_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase - Para endpoints serverless (server-side)
SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# String de conexão PostgreSQL (para psql direto)
DATABASE_URL=postgresql://postgres:[SENHA]@db.SEU_PROJECT_ID.supabase.co:5432/postgres
```

### 1.3 Obter String de Conexão PostgreSQL

1. No Supabase Dashboard, vá em **Settings** → **Database**
2. Role até **Connection string**
3. Selecione **URI** e copie
4. Substitua `[YOUR-PASSWORD]` pela senha do banco

**Formato:**
```
postgresql://postgres:[SENHA]@db.[PROJECT_ID].supabase.co:5432/postgres
```

### 1.4 Configurar Variáveis no Vercel (se aplicável)

Se estiver usando Vercel para deploy:

1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione cada variável:

```
SUPABASE_URL = https://SEU_PROJECT_ID.supabase.co
SUPABASE_KEY = sua_anon_key
SUPABASE_SERVICE_ROLE_KEY = sua_service_role_key
```

---

## PARTE 2: Executar a Migration no Supabase

### OPÇÃO A: Via Supabase SQL Editor (Recomendado)

#### Passo 1: Acessar o SQL Editor

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**
4. Clique em **+ New query**

#### Passo 2: Colar e Executar a Migration

1. Copie TODO o conteúdo do arquivo:
   ```
   migrations/2025-12-11-add-audit-import-and-timestamps.sql
   ```

2. Cole no editor SQL

3. Clique no botão **Run** (ou pressione Ctrl+Enter / Cmd+Enter)

4. Aguarde a execução (pode levar alguns segundos)

5. Verifique se aparece a mensagem:
   ```
   Migration completed successfully!
   Tables created: import_history, transaction_audit
   Columns added to transactions: created_at, updated_at, deleted_at, metadata
   Triggers created: updated_at auto-update, transaction audit
   ```

#### Passo 3: Verificar a Migration

Execute estas queries no SQL Editor para confirmar:

```sql
-- 1. Verificar colunas adicionadas em transactions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('created_at', 'updated_at', 'deleted_at', 'metadata');

-- Resultado esperado: 4 linhas (uma para cada coluna)

-- 2. Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('import_history', 'transaction_audit');

-- Resultado esperado: 2 linhas

-- 3. Verificar triggers
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_name LIKE 'trigger_%';

-- Resultado esperado: triggers de updated_at e audit

-- 4. Verificar funções
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'update_updated_at_column', 
  'audit_transaction_changes', 
  'soft_delete_transaction', 
  'restore_transaction'
);

-- Resultado esperado: 4 linhas
```

---

### OPÇÃO B: Via psql (Linha de Comando)

#### Passo 1: Instalar psql (se necessário)

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

**macOS (Homebrew):**
```bash
brew install libpq
brew link --force libpq
```

**Windows:**
Baixe em https://www.postgresql.org/download/windows/

#### Passo 2: Configurar Variável de Conexão

```bash
export DATABASE_URL="postgresql://postgres:[SENHA]@db.[PROJECT_ID].supabase.co:5432/postgres"
```

Ou crie um arquivo `.pgpass` em `~/.pgpass`:
```
db.[PROJECT_ID].supabase.co:5432:postgres:postgres:[SENHA]
```
E defina permissões:
```bash
chmod 600 ~/.pgpass
```

#### Passo 3: Testar Conexão

```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

Deve retornar a versão do PostgreSQL.

#### Passo 4: Executar Migration

```bash
# Navegar até o diretório do projeto
cd /caminho/para/financeai-pro

# Habilitar extensão pgcrypto (se necessário)
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Executar a migration
psql "$DATABASE_URL" -f migrations/2025-12-11-add-audit-import-and-timestamps.sql
```

#### Passo 5: Verificar

```bash
# Verificar colunas
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name='transactions' AND column_name IN ('created_at','updated_at','deleted_at','metadata');"

# Verificar tabelas
psql "$DATABASE_URL" -c "SELECT to_regclass('public.import_history'), to_regclass('public.transaction_audit');"
```

---

### OPÇÃO C: Via Script Node.js

#### Passo 1: Criar Script de Migração

Crie o arquivo `migrations/run-sql-migration.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Iniciando migration...');
  
  const sqlPath = path.join(__dirname, '2025-12-11-add-audit-import-and-timestamps.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Dividir em comandos separados (por segurança)
  const commands = sql.split(';').filter(cmd => cmd.trim());
  
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i].trim();
    if (!cmd) continue;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { query: cmd });
      if (error) {
        console.warn(`⚠️ Comando ${i + 1}: ${error.message}`);
      } else {
        console.log(`✅ Comando ${i + 1} executado`);
      }
    } catch (err) {
      console.warn(`⚠️ Comando ${i + 1}: ${err.message}`);
    }
  }
  
  console.log('✅ Migration concluída!');
}

runMigration().catch(console.error);
```

#### Passo 2: Executar

```bash
node migrations/run-sql-migration.js
```

---

## PARTE 3: Verificação Completa

### 3.1 Script de Verificação

Execute no SQL Editor do Supabase:

```sql
-- ============================================
-- SCRIPT DE VERIFICAÇÃO COMPLETA DA MIGRATION
-- ============================================

DO $$
DECLARE
  col_count INTEGER;
  table_count INTEGER;
  trigger_count INTEGER;
  func_count INTEGER;
BEGIN
  -- Verificar colunas em transactions
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns 
  WHERE table_name = 'transactions' 
  AND column_name IN ('created_at', 'updated_at', 'deleted_at', 'metadata');
  
  IF col_count = 4 THEN
    RAISE NOTICE '✅ Colunas de transactions: OK (4/4)';
  ELSE
    RAISE WARNING '❌ Colunas de transactions: FALHOU (%/4)', col_count;
  END IF;
  
  -- Verificar tabelas
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('import_history', 'transaction_audit');
  
  IF table_count = 2 THEN
    RAISE NOTICE '✅ Tabelas criadas: OK (2/2)';
  ELSE
    RAISE WARNING '❌ Tabelas criadas: FALHOU (%/2)', table_count;
  END IF;
  
  -- Verificar triggers
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers 
  WHERE trigger_name IN (
    'trigger_transactions_updated_at', 
    'trigger_import_history_updated_at',
    'trigger_transaction_audit'
  );
  
  IF trigger_count >= 2 THEN
    RAISE NOTICE '✅ Triggers: OK (%)', trigger_count;
  ELSE
    RAISE WARNING '❌ Triggers: FALHOU (%)', trigger_count;
  END IF;
  
  -- Verificar funções
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN (
    'update_updated_at_column', 
    'audit_transaction_changes', 
    'soft_delete_transaction', 
    'restore_transaction'
  );
  
  IF func_count = 4 THEN
    RAISE NOTICE '✅ Funções: OK (4/4)';
  ELSE
    RAISE WARNING '❌ Funções: FALHOU (%/4)', func_count;
  END IF;
  
  -- Resumo
  IF col_count = 4 AND table_count = 2 AND trigger_count >= 2 AND func_count = 4 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 MIGRATION EXECUTADA COM SUCESSO!';
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING '========================================';
    RAISE WARNING '⚠️ MIGRATION INCOMPLETA - VERIFIQUE OS ERROS';
    RAISE WARNING '========================================';
  END IF;
END $$;
```

### 3.2 Teste Funcional

Após a migration, teste criando uma transação:

```sql
-- Inserir transação de teste
INSERT INTO transactions (
  user_id, 
  date, 
  description, 
  amount, 
  type, 
  metadata
) VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- ou seu user_id específico
  CURRENT_DATE,
  'Transação de Teste - Migration',
  100.00,
  'expense',
  '{"source": "test", "test": true}'::jsonb
)
RETURNING id, created_at, updated_at, metadata;

-- Verificar se audit foi criado
SELECT * FROM transaction_audit 
WHERE created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC;
```

---

## PARTE 4: Troubleshooting

### Erro: "permission denied for schema public"

Execute como superuser:
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

### Erro: "function gen_random_uuid() does not exist"

Execute:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Erro: "relation transactions does not exist"

A tabela `transactions` precisa existir antes da migration. Verifique se o schema inicial do Supabase foi aplicado.

### Erro: "column already exists"

A migration é idempotente (usa `IF NOT EXISTS`), mas se houver conflito, pode ser necessário dropar a coluna manualmente:
```sql
ALTER TABLE transactions DROP COLUMN IF EXISTS created_at;
-- Depois re-execute a migration
```

### Erro de RLS Policy

Se houver erro de política RLS:
```sql
-- Temporariamente desabilitar RLS para a migration
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Executar migration...

-- Reabilitar após
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

---

## PARTE 5: Rollback (Se Necessário)

**⚠️ ATENÇÃO: Faça backup antes de executar rollback!**

```sql
-- 1. Remover triggers
DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS trigger_import_history_updated_at ON import_history;
DROP TRIGGER IF EXISTS trigger_transaction_audit ON transactions;

-- 2. Remover funções
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS audit_transaction_changes();
DROP FUNCTION IF EXISTS soft_delete_transaction(UUID);
DROP FUNCTION IF EXISTS restore_transaction(UUID);

-- 3. Remover tabelas
DROP TABLE IF EXISTS transaction_audit;
DROP TABLE IF EXISTS import_history;

-- 4. Remover colunas de transactions
ALTER TABLE transactions DROP COLUMN IF EXISTS metadata;
ALTER TABLE transactions DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS updated_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS created_at;

-- 5. Remover view
DROP VIEW IF EXISTS active_transactions;

-- 6. Remover índices
DROP INDEX IF EXISTS idx_transactions_not_deleted;
DROP INDEX IF EXISTS idx_transactions_metadata_import_id;
DROP INDEX IF EXISTS idx_transactions_date_range;
```

---

## Checklist Final

- [ ] Variáveis de ambiente configuradas no `.env`
- [ ] Variáveis configuradas no Vercel (se aplicável)
- [ ] Migration executada no Supabase SQL Editor
- [ ] Verificação de colunas em `transactions` passou
- [ ] Tabelas `import_history` e `transaction_audit` criadas
- [ ] Triggers funcionando
- [ ] Teste de criação de transação com sucesso
- [ ] Teste de soft-delete funcionando
- [ ] Endpoint de exportação acessível

---

## Comandos Rápidos para Manus AI

```bash
# 1. Clonar e configurar ambiente
git clone https://github.com/bragabarreto/financeai-pro.git
cd financeai-pro
cp .env.example .env
# Editar .env com suas credenciais

# 2. Instalar dependências
npm install

# 3. Executar migration via psql (se DATABASE_URL configurado)
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql "$DATABASE_URL" -f migrations/2025-12-11-add-audit-import-and-timestamps.sql

# 4. Verificar migration
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name='transactions' AND column_name IN ('created_at','updated_at','deleted_at','metadata');"

# 5. Build e test
npm run build
npm test

# 6. Iniciar aplicação
npm start
```
