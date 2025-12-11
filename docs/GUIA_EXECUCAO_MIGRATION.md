# Guia de Execução: Migration de Auditoria e Timestamps

## Visão Geral

Este guia fornece instruções passo a passo para executar a migration `2025-12-11-add-audit-import-and-timestamps.sql` no seu projeto FinanceAI Pro.

## Pré-requisitos

- Acesso ao dashboard do Supabase
- Credenciais do projeto (URL e API Keys)
- Backup recente do banco de dados (recomendado)

## Método 1: Via Supabase Dashboard (Recomendado)

### Passo 1: Acessar o SQL Editor

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto FinanceAI Pro
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Criar Nova Query

1. Clique no botão **+ New query**
2. Dê um nome descritivo: `Add Audit and Timestamps`

### Passo 3: Copiar e Colar a Migration

1. Abra o arquivo `migrations/2025-12-11-add-audit-import-and-timestamps.sql`
2. Copie **TODO** o conteúdo do arquivo
3. Cole no editor SQL do Supabase

### Passo 4: Executar a Migration

1. Clique no botão **Run** (ou pressione `Ctrl+Enter`)
2. Aguarde a execução (pode levar alguns segundos)
3. Verifique se não há erros na saída

### Passo 5: Verificar a Execução

Execute as seguintes queries de verificação:

```sql
-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='transactions' 
AND column_name IN ('created_at','updated_at','deleted_at','metadata');
-- Esperado: 4 linhas

-- Verificar se as tabelas foram criadas
SELECT to_regclass('public.import_history'), 
       to_regclass('public.transaction_audit');
-- Esperado: ambas retornam o nome da tabela (não NULL)

-- Verificar triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'transactions';
-- Esperado: 2 triggers (update_updated_at e log_transaction_changes)

-- Verificar políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('import_history', 'transaction_audit');
-- Esperado: 3 políticas (2 para import_history, 1 para transaction_audit)
```

## Método 2: Via Linha de Comando (psql)

### Passo 1: Obter Credenciais de Conexão

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Database**
4. Copie a **Connection String** (formato URI)

A string terá o formato:
```
postgresql://postgres:[SENHA]@db.[PROJECT_ID].supabase.co:5432/postgres
```

### Passo 2: Configurar Variável de Ambiente

```bash
export DATABASE_URL="postgresql://postgres:[SENHA]@db.[PROJECT_ID].supabase.co:5432/postgres"
```

### Passo 3: Testar Conexão

```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

Se a conexão funcionar, você verá a versão do PostgreSQL.

### Passo 4: Habilitar Extensão pgcrypto

```bash
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

### Passo 5: Executar a Migration

```bash
psql "$DATABASE_URL" -f migrations/2025-12-11-add-audit-import-and-timestamps.sql
```

### Passo 6: Verificar Execução

```bash
# Verificar colunas
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name='transactions' AND column_name IN ('created_at','updated_at','deleted_at','metadata');"

# Verificar tabelas
psql "$DATABASE_URL" -c "SELECT to_regclass('public.import_history'), to_regclass('public.transaction_audit');"

# Verificar últimas importações (deve estar vazio inicialmente)
psql "$DATABASE_URL" -c "SELECT * FROM import_history ORDER BY import_date DESC LIMIT 5;"
```

## Método 3: Via Supabase MCP (Automático)

Se você estiver usando o Supabase MCP Server:

```bash
# Listar projetos
manus-mcp-cli tool call list_projects --server supabase --input '{}'

# Aplicar migration
manus-mcp-cli tool call apply_migration --server supabase --input '{
  "project_id": "SEU_PROJECT_ID",
  "name": "add_audit_import_and_timestamps",
  "query": "CONTEÚDO_DO_ARQUIVO_SQL"
}'
```

## Configuração de Variáveis de Ambiente

### Para Desenvolvimento Local

Crie ou edite o arquivo `.env` na raiz do projeto:

```bash
# Frontend (React)
REACT_APP_SUPABASE_URL=https://[PROJECT_ID].supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Backend/Serverless (se aplicável)
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

### Como Obter as Credenciais

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Para Produção (Vercel)

1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto **financeai-pro**
3. Vá em **Settings** → **Environment Variables**
4. Adicione as seguintes variáveis:

| Nome | Valor | Ambientes |
|------|-------|-----------|
| `SUPABASE_URL` | https://[PROJECT_ID].supabase.co | Production, Preview, Development |
| `SUPABASE_KEY` | eyJhbGciOiJIUzI1NiIsInR5cCI6... | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbGciOiJIUzI1NiIsInR5cCI6... | Production, Preview, Development |

5. Clique em **Save**
6. Faça um novo deploy para aplicar as variáveis

## Rollback (Se Necessário)

Se algo der errado, você pode reverter as alterações:

```sql
-- Remover triggers
DROP TRIGGER IF EXISTS trigger_update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS trigger_log_transaction_changes ON transactions;

-- Remover funções
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS log_transaction_changes();

-- Remover tabelas
DROP TABLE IF EXISTS transaction_audit;
DROP TABLE IF EXISTS import_history;

-- Remover colunas (CUIDADO: isso remove dados)
ALTER TABLE transactions 
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS metadata;
```

## Testes Pós-Migration

### Teste 1: Criar uma Transação

```javascript
const { data, error } = await supabase
  .from('transactions')
  .insert({
    description: 'Teste de auditoria',
    amount: 100,
    date: new Date().toISOString(),
    type: 'expense',
    category: 'Testes'
  })
  .select()
  .single();

console.log('Transação criada:', data);
console.log('created_at:', data.created_at);
console.log('updated_at:', data.updated_at);
```

### Teste 2: Atualizar uma Transação

```javascript
const { data, error } = await supabase
  .from('transactions')
  .update({ amount: 150 })
  .eq('id', transactionId)
  .select()
  .single();

console.log('updated_at atualizado:', data.updated_at);
```

### Teste 3: Verificar Log de Auditoria

```javascript
const { data: auditLog, error } = await supabase
  .from('transaction_audit')
  .select('*')
  .eq('transaction_id', transactionId)
  .order('created_at', { ascending: false });

console.log('Logs de auditoria:', auditLog);
```

### Teste 4: Registrar uma Importação

```javascript
const { data, error } = await supabase
  .from('import_history')
  .insert({
    file_name: 'teste.csv',
    file_type: 'csv',
    records_imported: 10,
    records_failed: 0,
    status: 'success'
  })
  .select()
  .single();

console.log('Importação registrada:', data);
```

## Troubleshooting

### Erro: "extension pgcrypto does not exist"

**Solução**: Execute antes da migration:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Erro: "permission denied"

**Solução**: Use a service_role key ou execute via dashboard do Supabase com permissões de admin.

### Erro: "column already exists"

**Solução**: A migration já foi executada. Verifique se as tabelas e colunas existem:
```sql
\d transactions
\d import_history
\d transaction_audit
```

### Erro: "trigger already exists"

**Solução**: Remova os triggers existentes antes:
```sql
DROP TRIGGER IF EXISTS trigger_update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS trigger_log_transaction_changes ON transactions;
```

Depois execute a migration novamente.

## Próximos Passos

Após executar a migration com sucesso:

1. ✅ Atualizar o código do frontend para usar os novos campos
2. ✅ Implementar interface de visualização de histórico de importações
3. ✅ Implementar interface de auditoria de transações
4. ✅ Testar funcionalidade de soft delete
5. ✅ Configurar variáveis de ambiente no Vercel
6. ✅ Fazer deploy da nova versão

## Suporte

Se encontrar problemas durante a execução:

1. Verifique os logs de erro no Supabase Dashboard
2. Consulte a documentação em `/docs/TRANSACTION_PERSISTENCE_ADDENDUM.md`
3. Revise as políticas RLS no Supabase Dashboard
4. Abra uma issue no repositório GitHub com detalhes do erro

---

**Versão**: 1.0  
**Última Atualização**: 11 de Dezembro de 2025  
**Autor**: FinanceAI Pro Development Team
