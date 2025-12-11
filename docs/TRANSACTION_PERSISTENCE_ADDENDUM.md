# Persistência Histórica de Transações - Documentação

## Visão Geral

Este documento descreve as implementações de persistência histórica de transações, auditoria, exportação CSV e melhorias no Dashboard do FinanceAI Pro.

## Funcionalidades Implementadas

### 1. Persistência Histórica de Transações

#### Campos Adicionados à Tabela `transactions`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `created_at` | TIMESTAMPTZ | Data/hora de criação da transação |
| `updated_at` | TIMESTAMPTZ | Data/hora da última atualização |
| `deleted_at` | TIMESTAMPTZ | Data/hora do soft-delete (NULL = ativo) |
| `metadata` | JSONB | Dados adicionais (import_id, source, etc) |

#### Soft-Delete

Transações não são mais excluídas permanentemente. Em vez disso, o campo `deleted_at` é preenchido com a data/hora da exclusão.

**Benefícios:**
- Histórico completo de transações
- Possibilidade de restaurar transações excluídas
- Auditoria e compliance

### 2. Tabela `import_history`

Registra todas as importações realizadas pelo usuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `user_id` | UUID | ID do usuário |
| `import_date` | TIMESTAMPTZ | Data da importação |
| `source` | VARCHAR(50) | Origem: 'csv', 'sms', 'photo', 'paycheck', 'manual' |
| `file_name` | VARCHAR(255) | Nome do arquivo importado |
| `total_rows` | INTEGER | Total de linhas/transações |
| `imported_count` | INTEGER | Quantidade importada com sucesso |
| `failed_count` | INTEGER | Quantidade que falhou |
| `status` | VARCHAR(20) | 'pending', 'processing', 'completed', 'failed', 'partial' |
| `error_details` | JSONB | Detalhes dos erros |
| `metadata` | JSONB | Dados adicionais |

### 3. Tabela `transaction_audit`

Registro de auditoria de todas as alterações em transações.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `transaction_id` | UUID | ID da transação alterada |
| `user_id` | UUID | ID do usuário |
| `action` | VARCHAR(20) | 'create', 'update', 'delete', 'restore' |
| `old_values` | JSONB | Valores anteriores |
| `new_values` | JSONB | Novos valores |
| `changed_fields` | TEXT[] | Lista de campos alterados |
| `created_at` | TIMESTAMPTZ | Data/hora da ação |

### 4. Endpoint de Exportação CSV

**URL:** `/api/export-transactions`

**Parâmetros:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `userId` | UUID | Sim | ID do usuário |
| `startDate` | Date | Não | Data inicial (YYYY-MM-DD) |
| `endDate` | Date | Não | Data final (YYYY-MM-DD) |
| `includeDeleted` | Boolean | Não | Incluir transações excluídas |
| `format` | String | Não | 'csv' (padrão) ou 'json' |

**Exemplo:**
```
/api/export-transactions?userId=123e4567-e89b-12d3-a456-426614174000&startDate=2025-01-01&endDate=2025-12-31
```

### 5. Melhorias no Dashboard

#### Novos Períodos de Visualização:
- Este Mês
- Últimos 3 Meses
- Últimos 6 Meses
- Este Ano
- Todo o Histórico
- Personalizado (datas customizadas)

#### Gráfico de Categorias:
- Opção de visualização em Pizza ou Barras
- Alternância entre os tipos de gráfico

#### Exportação:
- Botão "Exportar CSV" no Dashboard
- Exporta as transações do período selecionado

## Como Usar

### Aplicar Migration

1. Acesse o Supabase SQL Editor
2. Cole o conteúdo de `migrations/2025-12-11-add-audit-import-and-timestamps.sql`
3. Execute o script

**Ou via CLI:**
```bash
psql "$DATABASE_URL" -f migrations/2025-12-11-add-audit-import-and-timestamps.sql
```

### Verificar Migration

Execute no Supabase SQL Editor:

```sql
-- Verificar colunas de transactions
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('created_at', 'updated_at', 'deleted_at', 'metadata');

-- Verificar tabelas criadas
SELECT to_regclass('public.import_history'), 
       to_regclass('public.transaction_audit');

-- Verificar últimas importações
SELECT * FROM import_history ORDER BY import_date DESC LIMIT 5;

-- Verificar auditoria
SELECT * FROM transaction_audit ORDER BY created_at DESC LIMIT 10;
```

## API JavaScript

### Transações

```javascript
import { 
  getTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  restoreTransaction,
  getDeletedTransactions 
} from '@/services/supabase';

// Buscar transações (exclui soft-deleted por padrão)
const { data } = await getTransactions(userId);

// Buscar incluindo deletadas
const { data } = await getTransactions(userId, { includeDeleted: true });

// Buscar por período
const { data } = await getTransactions(userId, { 
  startDate: '2025-01-01', 
  endDate: '2025-12-31' 
});

// Criar transação
const { data } = await createTransaction(transaction, { 
  source: 'manual',
  import_id: 'uuid-do-import' 
});

// Atualizar transação
const { data } = await updateTransaction(id, updates);

// Soft-delete
const { data } = await deleteTransaction(id);

// Hard-delete (permanente)
const { error } = await deleteTransaction(id, true);

// Restaurar transação
const { data } = await restoreTransaction(id);

// Buscar transações deletadas (lixeira)
const { data } = await getDeletedTransactions(userId);
```

### Histórico de Importação

```javascript
import { 
  createImportHistory, 
  updateImportHistory, 
  getImportHistory 
} from '@/services/supabase';

// Criar registro antes de importar
const { data } = await createImportHistory({
  userId: user.id,
  source: 'csv',
  fileName: 'arquivo.csv',
  totalRows: 100
});

// Atualizar após importação
await updateImportHistory(importId, {
  imported_count: 95,
  failed_count: 5,
  status: 'partial'
});

// Buscar histórico
const { data } = await getImportHistory(userId, 20);
```

### Auditoria

```javascript
import { 
  getTransactionAudit, 
  getUserAuditLog 
} from '@/services/supabase';

// Histórico de uma transação específica
const { data } = await getTransactionAudit(transactionId);

// Todas as alterações do usuário
const { data } = await getUserAuditLog(userId, { 
  limit: 50,
  action: 'update' 
});
```

### Exportação

```javascript
import { getExportUrl } from '@/services/supabase';

// Gerar URL de exportação
const url = getExportUrl(userId, {
  startDate: '2025-01-01',
  endDate: '2025-12-31'
});

// Abrir para download
window.open(url, '_blank');
```

## Segurança

### Row Level Security (RLS)

Todas as novas tabelas possuem RLS habilitado:

- `import_history`: Usuários só podem ver/editar seus próprios registros
- `transaction_audit`: Usuários só podem ver seus próprios logs

### Proteção de Dados

- Soft-delete preserva dados para compliance
- Auditoria registra todas as alterações
- Exportação requer autenticação

## Rollback (Emergência)

**⚠️ ATENÇÃO: Faça backup antes de executar!**

```sql
-- Remover colunas de transactions
ALTER TABLE transactions DROP COLUMN IF EXISTS metadata;
ALTER TABLE transactions DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS updated_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS created_at;

-- Remover tabelas
DROP TABLE IF EXISTS import_history;
DROP TABLE IF EXISTS transaction_audit;

-- Remover triggers
DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS trigger_transaction_audit ON transactions;

-- Remover funções
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS audit_transaction_changes();
DROP FUNCTION IF EXISTS soft_delete_transaction(UUID);
DROP FUNCTION IF EXISTS restore_transaction(UUID);
```

## Monitoramento

### Queries Úteis

```sql
-- Transações importadas por fonte
SELECT source, COUNT(*) as total, 
       SUM(imported_count) as imported, 
       SUM(failed_count) as failed
FROM import_history
GROUP BY source;

-- Transações por status
SELECT 
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as ativas,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deletadas
FROM transactions;

-- Atividade de auditoria por ação
SELECT action, COUNT(*) as total, DATE(created_at) as date
FROM transaction_audit
GROUP BY action, DATE(created_at)
ORDER BY date DESC;
```

## Changelog

### v2.0.0 (2025-12-11)
- Adicionados campos de timestamp e metadata em transactions
- Implementado soft-delete
- Criada tabela import_history
- Criada tabela transaction_audit
- Triggers de auditoria automática
- Endpoint de exportação CSV
- Dashboard com períodos ampliados e gráficos em barra
- ImportModal com registro de import_history
