# 📖 Guia Detalhado - Etapa 1: Atualizar o Código

## 🎯 Objetivo

Fazer com que o código atualizado do GitHub chegue até onde seu projeto está rodando (computador local, servidor, Vercel, Netlify, etc.).

---

## 🔍 Primeiro: Onde seu projeto está rodando?

Escolha o cenário que se aplica a você:

### **Cenário A:** Projeto rodando no seu computador (localhost)
### **Cenário B:** Projeto hospedado na Vercel
### **Cenário C:** Projeto hospedado na Netlify
### **Cenário D:** Projeto em servidor próprio (VPS, AWS, etc.)
### **Cenário E:** Ainda não está rodando em lugar nenhum

---

## 📋 Cenário A: Projeto no seu Computador (localhost)

### Pré-requisitos
- ✅ Git instalado
- ✅ Node.js instalado (versão 16 ou superior)
- ✅ Projeto já clonado anteriormente

### Passo a Passo

#### 1. Abrir Terminal/Prompt de Comando

**Windows:**
- Pressione `Win + R`
- Digite `cmd` e pressione Enter
- OU abra o PowerShell
- OU use o terminal do VS Code (Ctrl + `)

**Mac/Linux:**
- Pressione `Cmd + Espaço` (Mac) ou `Ctrl + Alt + T` (Linux)
- Digite "Terminal" e pressione Enter
- OU use o terminal do VS Code (Ctrl + `)

#### 2. Navegar até a pasta do projeto

```bash
# Exemplo se o projeto está em Documentos
cd Documents/financeai-pro

# OU se está em outra pasta
cd /caminho/completo/para/financeai-pro

# Para verificar se está na pasta certa, liste os arquivos
ls        # Mac/Linux
dir       # Windows
```

**Como saber se está na pasta certa?**
Você deve ver arquivos como:
- `package.json`
- `src/`
- `README.md`
- `.git/`

#### 3. Verificar status do Git

```bash
# Ver qual branch você está
git branch

# Ver se há alterações locais não commitadas
git status
```

**Resultado esperado:**
```
On branch main
Your branch is behind 'origin/main' by 3 commits
nothing to commit, working tree clean
```

#### 4. Puxar as alterações do GitHub

```bash
# Puxar as últimas alterações
git pull origin main
```

**Resultado esperado:**
```
From https://github.com/bragabarreto/financeai-pro
 * branch            main       -> FETCH_HEAD
Updating 528239e..36ef69c
Fast-forward
 GUIA_DEPLOY.md                                | 316 ++++++++++
 GUIA_RAPIDO.md                                | 245 ++++++++
 IMPLEMENTACAO_IA_COMPLETA.md                  | 556 ++++++++++++++++++
 ...
 14 files changed, 3576 insertions(+), 637 deletions(-)
```

#### 5. Instalar novas dependências (se houver)

```bash
npm install
```

**Resultado esperado:**
```
added 0 packages, removed 0 packages, and audited 1234 packages in 5s
```

#### 6. Reiniciar o servidor de desenvolvimento

```bash
# Se o servidor estava rodando, pare com Ctrl+C
# Depois inicie novamente:

npm run dev
# OU
npm start
```

**Resultado esperado:**
```
  VITE v4.x.x  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

#### 7. Abrir no navegador

Abra: http://localhost:5173 (ou a porta que aparecer)

**Pressione Ctrl+Shift+R** para limpar o cache

---

## 🌐 Cenário B: Projeto na Vercel

### Opção 1: Deploy Automático (Recomendado)

A Vercel faz deploy automático quando você faz push no GitHub!

**Passos:**
1. As alterações já estão no GitHub ✅
2. Acesse: https://vercel.com/dashboard
3. Encontre seu projeto
4. Veja se há um deploy em andamento
5. Aguarde finalizar (1-2 minutos)
6. Clique em "Visit" para ver o site atualizado

### Opção 2: Forçar Novo Deploy

Se o deploy automático não aconteceu:

1. Acesse o dashboard da Vercel
2. Selecione seu projeto
3. Vá em "Deployments"
4. Clique em "Redeploy" no último deployment
5. Confirme

### Opção 3: Via CLI

```bash
# Instalar Vercel CLI (primeira vez)
npm i -g vercel

# Fazer login
vercel login

# Navegar até a pasta do projeto local
cd /caminho/para/financeai-pro

# Puxar alterações
git pull origin main

# Fazer deploy
vercel --prod
```

---

## 🔷 Cenário C: Projeto na Netlify

### Opção 1: Deploy Automático (Recomendado)

A Netlify também faz deploy automático!

**Passos:**
1. As alterações já estão no GitHub ✅
2. Acesse: https://app.netlify.com
3. Encontre seu site
4. Veja se há um deploy em andamento
5. Aguarde finalizar (1-2 minutos)
6. Clique no link do site para ver atualizado

### Opção 2: Forçar Novo Deploy

1. Acesse o dashboard da Netlify
2. Selecione seu site
3. Vá em "Deploys"
4. Clique em "Trigger deploy" → "Deploy site"
5. Aguarde finalizar

### Opção 3: Via CLI

```bash
# Instalar Netlify CLI (primeira vez)
npm i -g netlify-cli

# Fazer login
netlify login

# Navegar até a pasta do projeto local
cd /caminho/para/financeai-pro

# Puxar alterações
git pull origin main

# Build local
npm run build

# Fazer deploy
netlify deploy --prod
```

---

## 🖥️ Cenário D: Servidor Próprio (VPS/AWS/DigitalOcean)

### Via SSH

#### 1. Conectar ao servidor

```bash
# Conectar via SSH
ssh usuario@seu-servidor.com

# OU com chave
ssh -i /caminho/para/chave.pem usuario@ip-do-servidor
```

#### 2. Navegar até a pasta do projeto

```bash
cd /var/www/financeai-pro
# OU onde quer que esteja instalado
```

#### 3. Puxar alterações

```bash
git pull origin main
```

#### 4. Instalar dependências

```bash
npm install
```

#### 5. Fazer build

```bash
npm run build
```

#### 6. Reiniciar serviço

```bash
# Se estiver usando PM2
pm2 restart financeai-pro

# OU se estiver usando systemd
sudo systemctl restart financeai-pro

# OU se estiver rodando direto
# Pare com Ctrl+C e rode novamente
npm start
```

---

## 🆕 Cenário E: Ainda não está rodando

### Primeira vez configurando o projeto?

#### 1. Clonar o repositório

```bash
# Navegar até onde quer salvar o projeto
cd Documents  # ou outra pasta

# Clonar
git clone https://github.com/bragabarreto/financeai-pro.git

# Entrar na pasta
cd financeai-pro
```

#### 2. Instalar dependências

```bash
npm install
```

#### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Edite o arquivo `.env` e adicione suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

#### 4. Iniciar servidor de desenvolvimento

```bash
npm run dev
```

#### 5. Abrir no navegador

Abra: http://localhost:5173

---

## ✅ Como Verificar se Funcionou

Após atualizar o código, verifique:

### 1. Abrir o sistema no navegador

### 2. Fazer login

### 3. Verificar se apareceu o botão "Importar Transações"

Deve estar no Dashboard, próximo ao botão de adicionar transação

### 4. Clicar em "Importar Transações"

Deve abrir um modal com **3 opções**:
- 📄 Arquivo CSV
- 📱 SMS Bancário
- 📸 Foto de Comprovante

### 5. Ir em Configurações (ícone ⚙️)

Deve aparecer uma nova seção chamada **"Configuração de IA"**

### 6. Ir em Cartões de Crédito

Ao editar um cartão, deve aparecer campos para **"Números Adicionais do Cartão"**

---

## 🐛 Problemas Comuns

### Erro: "git: command not found"

**Solução:** Instale o Git
- Windows: https://git-scm.com/download/win
- Mac: `brew install git`
- Linux: `sudo apt install git`

### Erro: "npm: command not found"

**Solução:** Instale o Node.js
- https://nodejs.org (versão LTS recomendada)

### Erro: "Permission denied"

**Solução:** Use `sudo` (Linux/Mac)
```bash
sudo npm install
```

### Erro: "Port 5173 is already in use"

**Solução:** Mate o processo anterior
```bash
# Mac/Linux
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <numero_do_pid> /F
```

### Erro: "Your local changes would be overwritten"

**Solução:** Salve suas alterações locais
```bash
# Salvar alterações
git stash

# Puxar do GitHub
git pull origin main

# Recuperar suas alterações
git stash pop
```

### Modal antigo ainda aparece

**Solução:** Limpe o cache do navegador
- Chrome/Edge: `Ctrl + Shift + R`
- Firefox: `Ctrl + F5`
- Safari: `Cmd + Option + R`

---

## 📞 Precisa de Ajuda?

Se ainda tiver dúvidas, me informe:

1. **Onde o projeto está rodando?** (local, Vercel, Netlify, servidor)
2. **Qual erro apareceu?** (copie a mensagem completa)
3. **O que aconteceu quando tentou?** (descreva o comportamento)

---

## 📋 Checklist Final

Após completar a Etapa 1, você deve ter:

- [ ] Código atualizado do GitHub
- [ ] Dependências instaladas
- [ ] Servidor rodando sem erros
- [ ] Modal de importação com 3 opções
- [ ] Seção de configuração de IA nas configurações
- [ ] Campos para múltiplos números nos cartões

**Se todos os itens estão marcados:** ✅ Etapa 1 completa!

**Próximo passo:** Etapa 2 - Atualizar banco de dados no Supabase

---

**Última atualização:** 08/10/2025  
**Versão do guia:** 1.0
