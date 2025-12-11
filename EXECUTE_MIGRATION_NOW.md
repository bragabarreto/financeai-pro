# 🚀 Execução Rápida da Migration - FinanceAI Pro

## ⚡ Passo a Passo Simplificado

### 1️⃣ Acessar o Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto **FinanceAI Pro**
3. No menu lateral, clique em **SQL Editor**

### 2️⃣ Executar a Migration

1. Clique em **+ New query**
2. Copie **TODO** o conteúdo do arquivo:
   ```
   migrations/2025-12-11-add-audit-import-and-timestamps.sql
   ```
3. Cole no editor SQL
4. Clique em **Run** (ou pressione `Ctrl+Enter`)
5. Aguarde a execução (5-10 segundos)

### 3️⃣ Verificar Sucesso

Execute esta query de verificação:

```sql
-- Verificar se tudo foi criado corretamente
SELECT 
  'Colunas adicionadas' as check_type,
  COUNT(*) as result
FROM information_schema.columns 
WHERE table_name='transactions' 
AND column_name IN ('created_at','updated_at','deleted_at','metadata')

UNION ALL

SELECT 
  'Tabela import_history',
  CASE WHEN to_regclass('public.import_history') IS NOT NULL THEN 1 ELSE 0 END

UNION ALL

SELECT 
  'Tabela transaction_audit',
  CASE WHEN to_regclass('public.transaction_audit') IS NOT NULL THEN 1 ELSE 0 END

UNION ALL

SELECT 
  'Triggers criados',
  COUNT(*)
FROM information_schema.triggers
WHERE event_object_table = 'transactions'

UNION ALL

SELECT 
  'Políticas RLS',
  COUNT(*)
FROM pg_policies 
WHERE tablename IN ('import_history', 'transaction_audit');
```

**Resultado Esperado:**
- Colunas adicionadas: 4
- Tabela import_history: 1
- Tabela transaction_audit: 1
- Triggers criados: 2
- Políticas RLS: 3

### 4️⃣ Configurar Variáveis de Ambiente no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **financeai-pro**
3. Vá em **Settings** → **Environment Variables**
4. Adicione/Verifique estas variáveis:

| Nome da Variável | Onde Encontrar o Valor |
|------------------|------------------------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_KEY` | Supabase Dashboard → Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |

**Importante:** Marque todas as variáveis para os ambientes:
- ✅ Production
- ✅ Preview  
- ✅ Development

5. Clique em **Save**

### 5️⃣ Fazer Deploy no Vercel

O deploy será automático após o push no GitHub, mas você pode forçar um novo deploy:

1. No dashboard do Vercel, vá na aba **Deployments**
2. Clique em **Redeploy** no último deployment
3. Aguarde o build completar (2-3 minutos)

## ✅ Checklist de Verificação

- [ ] Migration executada no Supabase SQL Editor
- [ ] Query de verificação retornou resultados corretos
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Novo deploy realizado com sucesso
- [ ] Aplicação funcionando em https://financeai-pro.vercel.app

## 🎯 O Que Foi Implementado

### Novas Tabelas
- **import_history**: Rastreia todas as importações (CSV, XLSX, SMS, fotos)
- **transaction_audit**: Log completo de todas as alterações em transações

### Novos Campos em Transactions
- **created_at**: Data de criação automática
- **updated_at**: Atualizado automaticamente em cada modificação
- **deleted_at**: Soft delete (NULL = ativo, data = deletado)
- **metadata**: Informações adicionais em JSON

### Novas Funcionalidades
- ✅ Soft delete (transações podem ser recuperadas)
- ✅ Auditoria completa de alterações
- ✅ Histórico de importações
- ✅ Timestamps automáticos
- ✅ Endpoint de exportação (/api/export-transactions)

### Segurança
- ✅ Row Level Security (RLS) habilitado
- ✅ Políticas de acesso por usuário
- ✅ Isolamento completo de dados

## 📚 Documentação Completa

Para mais detalhes, consulte:
- **Guia Técnico**: `docs/TRANSACTION_PERSISTENCE_ADDENDUM.md`
- **Guia de Execução**: `docs/GUIA_EXECUCAO_MIGRATION.md`

## 🆘 Problemas?

### Erro: "extension pgcrypto does not exist"
Execute antes da migration:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Erro: "column already exists"
A migration já foi executada. Verifique com:
```sql
\d transactions
```

### Erro: "permission denied"
Use o SQL Editor do Supabase Dashboard (tem permissões de admin automaticamente).

## 🎉 Próximos Passos

Após a migration estar completa:

1. **Testar importação**: Importe um CSV e verifique o histórico
2. **Verificar auditoria**: Edite uma transação e veja o log
3. **Testar soft delete**: Delete e restaure uma transação
4. **Exportar dados**: Teste o novo endpoint de exportação

---

**Status**: ✅ Código commitado no GitHub  
**Commit**: `a2cd935` - feat: Add audit system, import history tracking  
**Branch**: `main`  
**Próximo Deploy**: Automático após configurar variáveis no Vercel
