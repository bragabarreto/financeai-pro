# 🚀 Guia de Configuração do Vercel - FinanceAI Pro

## Variáveis de Ambiente Necessárias

Para que o FinanceAI Pro funcione corretamente em produção, você precisa configurar as seguintes variáveis de ambiente no Vercel.

---

## 📋 Passo a Passo

### 1. Acessar o Dashboard do Vercel

🔗 https://vercel.com/dashboard

### 2. Selecionar o Projeto

- Clique no projeto **financeai-pro**
- Vá em **Settings** (no menu superior)
- Clique em **Environment Variables** (menu lateral)

### 3. Adicionar as Variáveis

Para cada variável abaixo, clique em **Add New** e preencha:

---

#### ✅ Variável 1: REACT_APP_SUPABASE_URL

**Nome da Variável:**
```
REACT_APP_SUPABASE_URL
```

**Valor:**
```
https://ubyvdvtlyhrmvplroiqf.supabase.co
```

**Ambientes:** ✅ Production ✅ Preview ✅ Development

---

#### ✅ Variável 2: REACT_APP_SUPABASE_ANON_KEY

**Nome da Variável:**
```
REACT_APP_SUPABASE_ANON_KEY
```

**Valor:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieXZkdnRseWhybXZwbHJvaXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjgxMzcsImV4cCI6MjA3NTAwNDEzN30.dgPykHdUGxe99FnImqphLnT-xV5VNwgnPZzmxhYw3dQ
```

**Ambientes:** ✅ Production ✅ Preview ✅ Development

---

#### ✅ Variável 3: SUPABASE_URL

**Nome da Variável:**
```
SUPABASE_URL
```

**Valor:**
```
https://ubyvdvtlyhrmvplroiqf.supabase.co
```

**Ambientes:** ✅ Production ✅ Preview ✅ Development

---

#### ✅ Variável 4: SUPABASE_KEY

**Nome da Variável:**
```
SUPABASE_KEY
```

**Valor:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieXZkdnRseWhybXZwbHJvaXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjgxMzcsImV4cCI6MjA3NTAwNDEzN30.dgPykHdUGxe99FnImqphLnT-xV5VNwgnPZzmxhYw3dQ
```

**Ambientes:** ✅ Production ✅ Preview ✅ Development

---

#### ✅ Variável 5: SUPABASE_SERVICE_ROLE_KEY

**Nome da Variável:**
```
SUPABASE_SERVICE_ROLE_KEY
```

**Valor:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVieXZkdnRseWhybXZwbHJvaXFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyODEzNywiZXhwIjoyMDc1MDA0MTM3fQ._wDxY3fDMXOTy0VTsDvuuLpygmN_mlWH228FmDuHl_8
```

**Ambientes:** ✅ Production ✅ Preview ✅ Development

⚠️ **IMPORTANTE**: Esta chave é sensível e só deve ser usada no backend/serverless functions!

---

## 🔄 Redeploy do Projeto

Após adicionar todas as variáveis:

1. Vá na aba **Deployments**
2. Clique no deployment mais recente
3. Clique em **⋯** (três pontos) → **Redeploy**
4. Confirme o redeploy

Ou simplesmente faça um novo push no GitHub que o Vercel fará o deploy automaticamente.

---

## ✅ Verificação

Após o deploy completar, verifique:

1. Acesse: https://financeai-pro.vercel.app
2. Tente fazer login ou criar uma conta
3. Se funcionar, as variáveis estão configuradas corretamente!

---

## 🐛 Troubleshooting

### Erro: "supabaseUrl is required"

**Solução**: Verifique se `REACT_APP_SUPABASE_URL` está configurada corretamente

### Erro: "supabaseKey is required"

**Solução**: Verifique se `REACT_APP_SUPABASE_ANON_KEY` está configurada corretamente

### Erro: "Failed to fetch"

**Solução**: 
1. Verifique se a URL do Supabase está correta
2. Verifique se o projeto Supabase está ativo
3. Verifique as políticas RLS no Supabase

### Variáveis não aparecem no build

**Solução**:
1. Certifique-se de marcar TODOS os ambientes (Production, Preview, Development)
2. Faça um novo deploy após adicionar as variáveis
3. Variáveis que começam com `REACT_APP_` são injetadas no build do React

---

## 📝 Notas Importantes

### Variáveis Frontend vs Backend

**Frontend (React):**
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

Estas são injetadas no código JavaScript e ficam visíveis no navegador.

**Backend (Serverless Functions):**
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Estas são usadas nas funções serverless (pasta `/api`) e NÃO ficam expostas no navegador.

### Segurança

✅ **Seguro expor**:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `SUPABASE_KEY` (anon key)

⚠️ **NUNCA expor no frontend**:
- `SUPABASE_SERVICE_ROLE_KEY`

A service role key tem permissões administrativas e só deve ser usada no backend!

---

## 🎯 Próximos Passos

Após configurar as variáveis:

1. ✅ Testar login/cadastro
2. ✅ Testar importação de CSV
3. ✅ Verificar histórico de importações (nova funcionalidade!)
4. ✅ Testar soft delete de transações
5. ✅ Testar exportação de dados

---

## 🔗 Links Úteis

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Aplicação**: https://financeai-pro.vercel.app
- **Repositório**: https://github.com/bragabarreto/financeai-pro

---

**Data**: 11 de Dezembro de 2025  
**Versão**: 1.0  
**Autor**: Manus AI
