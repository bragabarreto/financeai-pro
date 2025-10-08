# 🎨 Guia Visual - Etapa 1: Atualizar o Código

## 📸 Screenshots e Comandos Passo a Passo

---

## 🪟 Para Usuários Windows

### Passo 1: Abrir o Terminal

**Opção A: Prompt de Comando**
```
1. Pressione Win + R
2. Digite: cmd
3. Pressione Enter
```

**Opção B: PowerShell**
```
1. Clique com botão direito no menu Iniciar
2. Selecione "Windows PowerShell"
```

**Opção C: Terminal do VS Code**
```
1. Abra o VS Code
2. Pressione Ctrl + `
3. OU vá em Terminal → New Terminal
```

### Passo 2: Navegar até a pasta do projeto

```cmd
# Ver onde você está
cd

# Resultado exemplo:
C:\Users\SeuNome

# Ir para a pasta do projeto (ajuste o caminho)
cd Documents\financeai-pro

# OU se estiver em outro lugar
cd C:\projetos\financeai-pro

# Verificar se está na pasta certa
dir

# Você deve ver:
# - pasta src
# - arquivo package.json
# - pasta node_modules
```

### Passo 3: Verificar Git

```cmd
# Ver status atual
git status

# Resultado esperado:
On branch main
Your branch is behind 'origin/main' by 3 commits
  (use "git pull" to update your local branch)

nothing to commit, working tree clean
```

### Passo 4: Puxar alterações

```cmd
git pull origin main
```

**O que você verá:**
```
From https://github.com/bragabarreto/financeai-pro
 * branch            main       -> FETCH_HEAD
Updating 528239e..36ef69c
Fast-forward
 GUIA_DEPLOY.md                                | 316 ++++++++++
 IMPLEMENTACAO_IA_COMPLETA.md                  | 556 ++++++++++++++++++
 src/App.jsx                                   | 588 +++++++++----------
 src/components/Import/ImportModalEnhanced.jsx | 515 +++++++++++++++++
 src/components/Settings/AIConfigSettings.jsx  | 392 +++++++++++++
 14 files changed, 3576 insertions(+), 637 deletions(-)
```

### Passo 5: Instalar dependências

```cmd
npm install
```

**O que você verá:**
```
npm WARN deprecated ...
added 0 packages, removed 0 packages, and audited 1234 packages in 5s

234 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

### Passo 6: Iniciar o servidor

```cmd
# Parar servidor anterior (se estiver rodando)
# Pressione Ctrl + C

# Iniciar novamente
npm run dev
```

**O que você verá:**
```
> financeai-pro@1.0.0 dev
> vite

  VITE v4.5.0  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Passo 7: Abrir no navegador

1. Abra seu navegador (Chrome, Edge, Firefox)
2. Digite na barra de endereço: `http://localhost:5173`
3. Pressione Enter
4. **IMPORTANTE:** Pressione `Ctrl + Shift + R` para limpar cache

---

## 🍎 Para Usuários Mac

### Passo 1: Abrir o Terminal

**Opção A: Spotlight**
```
1. Pressione Cmd + Espaço
2. Digite: Terminal
3. Pressione Enter
```

**Opção B: Finder**
```
1. Abra o Finder
2. Vá em Aplicativos → Utilitários → Terminal
```

**Opção C: Terminal do VS Code**
```
1. Abra o VS Code
2. Pressione Cmd + `
3. OU vá em Terminal → New Terminal
```

### Passo 2: Navegar até a pasta do projeto

```bash
# Ver onde você está
pwd

# Resultado exemplo:
/Users/seunome

# Ir para a pasta do projeto
cd Documents/financeai-pro

# OU se estiver em outro lugar
cd /caminho/completo/financeai-pro

# Verificar se está na pasta certa
ls -la

# Você deve ver:
# - pasta src/
# - arquivo package.json
# - pasta node_modules/
```

### Passo 3: Verificar Git

```bash
# Ver status atual
git status

# Resultado esperado:
On branch main
Your branch is behind 'origin/main' by 3 commits
  (use "git pull" to update your local branch)

nothing to commit, working tree clean
```

### Passo 4: Puxar alterações

```bash
git pull origin main
```

**O que você verá:**
```
From https://github.com/bragabarreto/financeai-pro
 * branch            main       -> FETCH_HEAD
Updating 528239e..36ef69c
Fast-forward
 GUIA_DEPLOY.md                                | 316 ++++++++++
 IMPLEMENTACAO_IA_COMPLETA.md                  | 556 ++++++++++++++++++
 src/App.jsx                                   | 588 +++++++++----------
 14 files changed, 3576 insertions(+), 637 deletions(-)
```

### Passo 5: Instalar dependências

```bash
npm install
```

**O que você verá:**
```
added 0 packages, removed 0 packages, and audited 1234 packages in 5s

234 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

### Passo 6: Iniciar o servidor

```bash
# Parar servidor anterior (se estiver rodando)
# Pressione Ctrl + C

# Iniciar novamente
npm run dev
```

**O que você verá:**
```
  VITE v4.5.0  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Passo 7: Abrir no navegador

1. Abra Safari, Chrome ou Firefox
2. Digite: `http://localhost:5173`
3. Pressione Enter
4. **IMPORTANTE:** Pressione `Cmd + Shift + R` para limpar cache

---

## 🐧 Para Usuários Linux

### Passo 1: Abrir o Terminal

**Ubuntu/Debian:**
```
Pressione Ctrl + Alt + T
```

**Outras distros:**
```
Procure por "Terminal" no menu de aplicativos
```

### Passo 2: Navegar até a pasta do projeto

```bash
# Ver onde você está
pwd

# Ir para a pasta do projeto
cd ~/Documents/financeai-pro

# OU
cd /home/seunome/projetos/financeai-pro

# Verificar se está na pasta certa
ls -la

# Você deve ver:
# - pasta src/
# - arquivo package.json
# - pasta node_modules/
```

### Passo 3: Verificar Git

```bash
git status
```

### Passo 4: Puxar alterações

```bash
git pull origin main
```

### Passo 5: Instalar dependências

```bash
npm install

# Se der erro de permissão, use:
sudo npm install
```

### Passo 6: Iniciar o servidor

```bash
npm run dev
```

### Passo 7: Abrir no navegador

1. Abra Firefox, Chrome ou outro navegador
2. Digite: `http://localhost:5173`
3. Pressione `Ctrl + Shift + R` para limpar cache

---

## 🌐 Para Projetos na Vercel

### Verificar Deploy Automático

1. **Acesse:** https://vercel.com/dashboard

2. **Faça login** com sua conta

3. **Encontre seu projeto** na lista

4. **Veja o status:**
   - 🟢 **Ready** = Deploy concluído
   - 🟡 **Building** = Deploy em andamento
   - 🔴 **Error** = Erro no deploy

5. **Se estiver "Building":**
   - Aguarde 1-2 minutos
   - Atualize a página

6. **Se estiver "Ready":**
   - Clique em "Visit"
   - Seu site abrirá atualizado
   - Pressione `Ctrl + Shift + R` para limpar cache

### Forçar Novo Deploy

Se não houver deploy automático:

1. Clique no seu projeto
2. Vá na aba "Deployments"
3. Clique nos 3 pontinhos (...) do último deploy
4. Clique em "Redeploy"
5. Confirme
6. Aguarde 1-2 minutos

---

## 🔷 Para Projetos na Netlify

### Verificar Deploy Automático

1. **Acesse:** https://app.netlify.com

2. **Faça login** com sua conta

3. **Encontre seu site** na lista

4. **Veja o status:**
   - 🟢 **Published** = Deploy concluído
   - 🟡 **Building** = Deploy em andamento
   - 🔴 **Failed** = Erro no deploy

5. **Se estiver "Building":**
   - Aguarde 1-2 minutos
   - Atualize a página

6. **Se estiver "Published":**
   - Clique no link do site
   - Seu site abrirá atualizado
   - Pressione `Ctrl + Shift + R` para limpar cache

### Forçar Novo Deploy

1. Clique no seu site
2. Vá na aba "Deploys"
3. Clique em "Trigger deploy"
4. Selecione "Deploy site"
5. Aguarde 1-2 minutos

---

## ✅ Como Saber se Funcionou

### 1. Abra o sistema

### 2. Faça login

### 3. Vá no Dashboard

### 4. Procure o botão "Importar Transações"

**Deve estar aqui:**
```
┌─────────────────────────────────────┐
│  Dashboard                          │
│                                     │
│  [+ Nova Transação] [Importar]  ← AQUI
│                                     │
│  Saldo Total: R$ 0,00              │
└─────────────────────────────────────┘
```

### 5. Clique em "Importar Transações"

**Deve abrir um modal com 3 opções:**
```
┌─────────────────────────────────────┐
│  Importar Transações           [X]  │
├─────────────────────────────────────┤
│                                     │
│  Escolha o método de importação:   │
│                                     │
│  ○ 📄 Arquivo CSV                  │
│  ○ 📱 SMS Bancário          ← NOVO │
│  ○ 📸 Foto de Comprovante   ← NOVO │
│                                     │
│              [Continuar]            │
└─────────────────────────────────────┘
```

### 6. Vá em Configurações (ícone ⚙️)

**Deve aparecer uma nova seção:**
```
┌─────────────────────────────────────┐
│  Configurações                      │
├─────────────────────────────────────┤
│                                     │
│  🤖 Configuração de IA       ← NOVO│
│                                     │
│  ☐ Habilitar extração com IA       │
│                                     │
│  Provedor: [Google Gemini ▼]       │
│  Modelo: [gemini-2.0-flash-exp ▼]  │
│  Chave API: [_______________]       │
│                                     │
│              [Salvar]               │
├─────────────────────────────────────┤
│  👤 Perfil do Usuário              │
│  ...                                │
└─────────────────────────────────────┘
```

### 7. Vá em Cartões de Crédito

**Ao editar um cartão, deve aparecer:**
```
┌─────────────────────────────────────┐
│  Editar Cartão                 [X]  │
├─────────────────────────────────────┤
│  Nome: [Cartão Caixa        ]      │
│  Bandeira: [ELO ▼]                 │
│  Últimos 4 dígitos: [1527]         │
│                                     │
│  Números Adicionais (até 5): ← NOVO│
│  [0405]                            │
│  [____]                            │
│  [____]                            │
│  [____]                            │
│  [____]                            │
│                                     │
│              [Salvar]               │
└─────────────────────────────────────┘
```

---

## 🎯 Se Tudo Apareceu Corretamente

✅ **Parabéns! Etapa 1 concluída com sucesso!**

**Próximo passo:** Etapa 2 - Atualizar banco de dados no Supabase

---

## 🐛 Se Algo Não Apareceu

### Modal ainda tem só opção CSV

**Causa:** Cache do navegador

**Solução:**
1. Pressione `Ctrl + Shift + R` (Windows/Linux)
2. OU `Cmd + Shift + R` (Mac)
3. Se não funcionar, limpe o cache manualmente:
   - Chrome: Configurações → Privacidade → Limpar dados
   - Firefox: Opções → Privacidade → Limpar dados

### Seção de IA não aparece nas configurações

**Causa:** Código não foi atualizado

**Solução:**
1. Volte ao terminal
2. Execute: `git pull origin main`
3. Execute: `npm install`
4. Reinicie: `npm run dev`
5. Limpe o cache do navegador

### Erro ao abrir a página

**Causa:** Servidor não está rodando

**Solução:**
1. Verifique se o terminal mostra: `Local: http://localhost:5173/`
2. Se não, execute: `npm run dev`
3. Aguarde aparecer a mensagem
4. Tente novamente

---

## 📞 Ainda com Dúvidas?

Me informe:
1. Qual sistema operacional você usa?
2. Onde o projeto está rodando?
3. O que apareceu quando executou os comandos?
4. Tire um print da tela e me mostre

---

**Última atualização:** 08/10/2025
