# 🔧 Correção Rápida de Transações Parceladas

## Comandos Principais

### 1️⃣ Testar a lógica (sem banco de dados)
```bash
npm run migrate:installments:test
```

### 2️⃣ Simular correções (sem alterar dados)
```bash
npm run migrate:installments
```

### 3️⃣ Executar correções (ATENÇÃO: altera dados!)
```bash
npm run migrate:installments:execute
```

## Opções Avançadas

```bash
# Limitar a 10 grupos
node migrations/run-migration.js --execute --limit=10

# Corrigir apenas um usuário
node migrations/run-migration.js --execute --user=USER_ID

# Obter ajuda
node migrations/run-migration.js --help
```

## ✅ Pré-requisitos

1. Arquivo `.env` configurado com credenciais do Supabase
2. Backup do banco de dados (recomendado)

## 📚 Documentação Completa

- **Guia em Português**: [GUIA_MIGRACAO_PARCELAS.md](GUIA_MIGRACAO_PARCELAS.md)
- **Guia em Inglês**: [migrations/README_INSTALLMENT_FIX.md](migrations/README_INSTALLMENT_FIX.md)

## 🔍 Verificação

Após executar, verifique no Supabase:

```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE installment_number IS NOT NULL) as corretos,
  COUNT(*) FILTER (WHERE installment_number IS NULL) as incorretos
FROM transactions
WHERE is_installment = true;
```

O campo `incorretos` deve ser 0.

## ⚠️ IMPORTANTE

- Sempre execute primeiro em **dry-run** (simulação)
- Faça **backup** antes de executar em produção
- Revise os logs para entender as mudanças
