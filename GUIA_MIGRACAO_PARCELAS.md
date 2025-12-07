# Guia de Migração de Transações Parceladas

Este guia explica como corrigir transações parceladas antigas que foram registradas antes da implementação adequada da lógica de parcelamento.

## 📋 O que será corrigido?

O script de migração corrige transações parceladas que possuem:

1. **Valor total em cada parcela** ao invés do valor dividido
2. **Campo `installment_number` ausente** ou incorreto
3. **Datas iguais** ao invés de intervalos mensais
4. **Descrição sem notação de parcela** (ex: sem "(1/12)")

## ✅ Pré-requisitos

1. **Node.js** instalado (versão 14 ou superior)
2. **Credenciais do Supabase** configuradas no arquivo `.env`
3. **Backup do banco de dados** (recomendado)

## 🚀 Como executar

### Opção 1: Usando npm scripts (Recomendado)

#### 1. Teste a lógica (sem conexão ao banco)

```bash
npm run migrate:installments:test
```

Este comando executa testes da lógica de migração sem conectar ao banco de dados.

#### 2. Simulação (Dry Run)

```bash
npm run migrate:installments
```

Este comando:
- Conecta ao banco de dados
- Identifica transações problemáticas
- Mostra o que seria corrigido
- **NÃO faz alterações no banco**

#### 3. Execução Real

```bash
npm run migrate:installments:execute
```

⚠️ **ATENÇÃO**: Este comando fará alterações no banco de dados!

### Opção 2: Comando direto com Node.js

```bash
# Dry run (simulação)
node migrations/run-migration.js

# Execução real
node migrations/run-migration.js --execute

# Limitar a 10 grupos
node migrations/run-migration.js --execute --limit=10

# Apenas para um usuário específico
node migrations/run-migration.js --execute --user=USER_ID
```

### Opção 3: SQL direto no Supabase

1. Abra o SQL Editor no painel do Supabase
2. Copie o conteúdo de `migrations/fix-installment-transactions.sql`
3. Siga as instruções no arquivo SQL

## 📊 Exemplo de saída

### Dry Run (simulação)

```
╔════════════════════════════════════════════════════════════════════╗
║     INSTALLMENT TRANSACTIONS MIGRATION                             ║
╚════════════════════════════════════════════════════════════════════╝

⚠️  Running in DRY RUN mode - no changes will be made

🔍 Identifying problematic installment transactions...

📊 Found 145 total installment transactions

📋 Found 8 groups with problems:

================================================================================
📝 [DRY RUN] Fixing: iPhone 15
   User ID: abc123...
   Total Amount: R$ 72000.00
   Transactions to fix: 12
   Problems: Amount not properly divided

   Corrections to apply:
   - Each installment amount: R$ 6000.00
   - Start date: 2025-01-15
   - Date range: 2025-01-15 to 2025-12-15

   Transaction 1/12:
     Amount: R$ 72000.00 → R$ 6000.00
     
   Transaction 2/12:
     Amount: R$ 72000.00 → R$ 6000.00
   
   ... (mais 10 transações)

   ℹ️  DRY RUN: Would update 12 transactions
================================================================================

📊 MIGRATION SUMMARY:
   - Groups analyzed: 8
   - Transactions that would be updated: 96

💡 Run with --execute to apply changes
```

### Execução Real

```
╔════════════════════════════════════════════════════════════════════╗
║     INSTALLMENT TRANSACTIONS MIGRATION                             ║
╚════════════════════════════════════════════════════════════════════╝

⚠️  Running in EXECUTE mode - changes WILL be made to the database

🔍 Identifying problematic installment transactions...

📊 Found 145 total installment transactions

================================================================================
📝 [EXECUTING] Fixing: iPhone 15
   User ID: abc123...
   Total Amount: R$ 72000.00
   Transactions to fix: 12

   🔄 Updating 12 transactions...

   ✅ Updated 12 transactions successfully
================================================================================

📊 MIGRATION SUMMARY:
   - Groups analyzed: 8
   - Transactions updated: 96
```

## 🔍 Verificação após migração

Após executar a migração, verifique os resultados:

### No banco de dados (Supabase SQL Editor)

```sql
-- Verificar se todas as parcelas têm installment_number
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE installment_number IS NOT NULL) as com_numero,
  COUNT(*) FILTER (WHERE installment_number IS NULL) as sem_numero
FROM transactions
WHERE is_installment = true;
```

**Resultado esperado**: `sem_numero` deve ser 0.

```sql
-- Verificar consistência de valores
WITH grupos_parcela AS (
  SELECT 
    REGEXP_REPLACE(description, '\s*\(\d+/\d+\)\s*$', '') as descricao_base,
    MAX(amount) - MIN(amount) as variacao_valor
  FROM transactions
  WHERE is_installment = true
  GROUP BY descricao_base
)
SELECT * FROM grupos_parcela
WHERE variacao_valor > 0.01;
```

**Resultado esperado**: Nenhum resultado (todos os valores de um mesmo grupo devem ser iguais).

### Na aplicação

1. Acesse a lista de transações
2. Filtre por transações parceladas
3. Verifique se:
   - Os valores estão divididos corretamente
   - As datas estão espaçadas mensalmente
   - As descrições incluem "(X/Y)"

## 🔙 Rollback (Desfazer)

Se algo der errado, você pode reverter as alterações:

### Se usou o script JavaScript

O script não cria backup automaticamente. Recomenda-se usar o backup do Supabase.

### Se usou o script SQL

O script SQL cria uma tabela de backup:

```sql
-- Deletar transações modificadas
DELETE FROM transactions WHERE is_installment = true;

-- Restaurar do backup
INSERT INTO transactions 
SELECT * FROM transactions_backup_installment_fix;
```

## ⚠️ Avisos importantes

1. **Faça backup** antes de executar em produção
2. **Teste primeiro** em um ambiente de desenvolvimento
3. **Use dry run** para entender o impacto antes de executar
4. **Limite o escopo** com `--limit=10` nas primeiras execuções
5. **Verifique os resultados** após a execução

## 🐛 Problemas comuns

### "Missing Supabase credentials"

**Solução**: Crie um arquivo `.env` na raiz do projeto com:

```
REACT_APP_SUPABASE_URL=sua_url_do_supabase
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```

### "No problematic installment transactions found"

**Solução**: Isso é bom! Significa que suas transações parceladas já estão corretas.

### Erro de conexão com o banco

**Solução**: Verifique se:
- Suas credenciais do Supabase estão corretas
- Você tem acesso à internet
- O Supabase não está em manutenção

## 📚 Documentação adicional

- **README completo**: `migrations/README_INSTALLMENT_FIX.md`
- **Script JavaScript**: `migrations/fix-installment-transactions.js`
- **Script SQL**: `migrations/fix-installment-transactions.sql`
- **Testes**: `migrations/test-migration-logic.js`

## 💡 Dicas

- Execute primeiro com `--limit=1` para ver como funciona com apenas um grupo
- Use `--user=USER_ID` para testar com transações de um usuário específico
- Sempre rode em dry-run primeiro para revisar as mudanças
- Monitore os logs para entender o que está sendo corrigido

## 📞 Suporte

Se encontrar problemas ou tiver dúvidas:

1. Revise a documentação em `migrations/README_INSTALLMENT_FIX.md`
2. Execute os testes com `npm run migrate:installments:test`
3. Execute em dry-run para ver o que será alterado
4. Verifique os logs para entender o problema

---

**Última atualização**: 07/12/2025
