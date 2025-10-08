# 🚀 Guia de Deploy - Finance AI Pro

## ✅ Status Atual

As alterações foram **commitadas e enviadas para o GitHub**, mas para que funcionem na página, você precisa seguir os passos abaixo.

---

## 📋 Checklist de Deploy

### ✅ 1. Código Atualizado no GitHub
- ✅ ImportModalEnhanced integrado
- ✅ AIConfigSettings adicionado
- ✅ App.jsx atualizado
- ✅ Script de migração criado

**Commits realizados:**
- `3f2a64e` - Implementação inicial com IA
- `53b50aa` - Integração no App principal

**Link:** https://github.com/bragabarreto/financeai-pro

---

### 🔄 2. Atualizar Código Local/Servidor

Se você está rodando o app localmente ou em um servidor, precisa puxar as alterações:

```bash
# Navegar até o diretório do projeto
cd /caminho/para/financeai-pro

# Puxar alterações do GitHub
git pull origin main

# Instalar dependências (se houver novas)
npm install

# Reiniciar o servidor de desenvolvimento
npm start
```

---

### 🗄️ 3. Atualizar Banco de Dados (Supabase)

**IMPORTANTE:** Execute o script SQL no Supabase para adicionar as novas colunas.

#### Passo a Passo:

1. **Acesse o Supabase Dashboard**
   - Vá para: https://app.supabase.com
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New Query"

3. **Cole o Script SQL**
   - Copie o conteúdo do arquivo `database-migration.sql`
   - Cole no editor SQL

4. **Execute o Script**
   - Clique em "Run" ou pressione Ctrl+Enter
   - Aguarde a confirmação de sucesso

#### O que o script faz:

- ✅ Adiciona coluna `last_digits_list` na tabela `credit_cards`
- ✅ Cria tabela `user_settings` para configurações de IA
- ✅ Configura Row Level Security (RLS)
- ✅ Cria índices para melhor performance
- ✅ Adiciona triggers para atualização automática

#### Script SQL Completo:

```sql
-- 1. Adicionar coluna last_digits_list
ALTER TABLE credit_cards 
ADD COLUMN IF NOT EXISTS last_digits_list TEXT[];

-- 2. Criar tabela user_settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Habilitar RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas
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
```

---

### 🔑 4. Configurar Chave API do Gemini

Após o deploy, você precisa configurar a IA:

1. **Obter Chave API**
   - Acesse: https://aistudio.google.com/app/apikey
   - Crie uma chave API (gratuito)

2. **Configurar no Sistema**
   - Faça login no Finance AI Pro
   - Vá em **Configurações** (ícone de engrenagem)
   - Procure por "Configuração de IA"
   - Habilite "Extração com IA"
   - Selecione "Google Gemini"
   - Escolha modelo: **gemini-2.0-flash-exp**
   - Cole sua chave API
   - Clique em "Salvar Configuração"

**Chave fornecida anteriormente:**
```
AIzaSyAnX690uDlhRfcSfmRrOl5z4CbFTI4RWl4
```

---

### 🎴 5. Cadastrar Cartões

Para a IA identificar automaticamente os cartões:

1. Vá em **Cartões de Crédito**
2. Para cada cartão, clique em "Editar"
3. Adicione os **últimos 4 dígitos** principais
4. Adicione até **5 números adicionais** (opcional)
5. Salve

**Exemplo:**
- Últimos 4 dígitos: `1527`
- Números adicionais: `0405`, `1234`, etc.

---

### 🧪 6. Testar Funcionalidades

#### Teste 1: Importação por SMS
1. Vá em **Dashboard**
2. Clique em "Importar Transações"
3. Escolha "SMS Bancário"
4. Cole um SMS de compra
5. Clique em "Extrair Transações"
6. Verifique se os dados foram extraídos corretamente

#### Teste 2: Importação por Foto
1. Vá em **Dashboard**
2. Clique em "Importar Transações"
3. Escolha "Foto de Comprovante"
4. Selecione uma foto de comprovante
5. Clique em "Extrair Transações"
6. Verifique se os dados foram extraídos corretamente

#### Teste 3: Configuração de IA
1. Vá em **Configurações**
2. Verifique se "Configuração de IA" aparece
3. Teste habilitar/desabilitar
4. Teste trocar de provedor

---

## 🌐 Deploy em Produção

### Vercel (Recomendado)

1. **Conectar Repositório**
   ```bash
   # Instalar Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Deploy
   vercel
   ```

2. **Configurar Variáveis de Ambiente**
   - No dashboard da Vercel
   - Adicione variáveis do Supabase:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

3. **Deploy Automático**
   - Cada push no GitHub fará deploy automático

### Netlify

1. **Conectar Repositório**
   - Vá em: https://app.netlify.com
   - Clique em "New site from Git"
   - Conecte seu repositório GitHub

2. **Configurar Build**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Adicionar Variáveis de Ambiente**
   - Mesmas do Vercel

---

## 🔍 Verificação Final

Após o deploy, verifique:

- [ ] Página carrega sem erros
- [ ] Login funciona
- [ ] Dashboard exibe dados
- [ ] Botão "Importar Transações" aparece
- [ ] Modal tem 3 opções: CSV, SMS, Foto
- [ ] Tab "Configurações" tem seção "Configuração de IA"
- [ ] Cartões têm campo para múltiplos números
- [ ] Importação por SMS funciona
- [ ] Importação por foto funciona

---

## 🐛 Solução de Problemas

### Erro: "ImportModalEnhanced is not defined"
**Solução:** Execute `git pull` e `npm install`

### Erro: "Column last_digits_list does not exist"
**Solução:** Execute o script SQL no Supabase

### Erro: "API key not configured"
**Solução:** Configure a chave API nas configurações

### Modal antigo aparece
**Solução:** Limpe o cache do navegador (Ctrl+Shift+R)

### IA não funciona
**Solução:** 
1. Verifique se a chave API está correta
2. Verifique se a IA está habilitada nas configurações
3. Teste com outro modelo (gemini-2.0-flash-exp)

---

## 📊 Monitoramento

### Logs do Supabase
1. Acesse Supabase Dashboard
2. Vá em "Logs"
3. Monitore erros de API

### Logs do Navegador
1. Abra DevTools (F12)
2. Vá em "Console"
3. Verifique erros JavaScript

### Uso da API Gemini
1. Acesse: https://aistudio.google.com
2. Vá em "API Keys"
3. Monitore uso e limites

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs** do navegador e Supabase
2. **Consulte a documentação** em `IMPLEMENTACAO_IA_COMPLETA.md`
3. **Revise os testes** em `TESTES_REALIZADOS.md`
4. **Siga o guia rápido** em `GUIA_RAPIDO.md`

---

## 🎯 Próximos Passos

Após o deploy bem-sucedido:

1. **Teste com dados reais**
   - Importe SMS reais
   - Importe fotos reais de comprovantes

2. **Ajuste categorias**
   - Crie categorias personalizadas
   - Ajuste sugestões da IA

3. **Configure alertas**
   - Configure limites de gastos
   - Configure metas financeiras

4. **Compartilhe feedback**
   - Reporte bugs encontrados
   - Sugira melhorias

---

**Status:** ✅ **PRONTO PARA DEPLOY**

**Última atualização:** 08/10/2025  
**Versão:** 2.0.0 (com IA)
