# financeai-pro
Sistema de controle financeiro

## Configuração de IA (Anthropic Claude)

Este sistema suporta integração com múltiplos provedores de IA para extração inteligente de dados de transações:
- **Google Gemini** - Chamadas diretas do frontend ✅
- **OpenAI (ChatGPT)** - Chamadas diretas do frontend ✅  
- **Anthropic Claude** - Requer servidor proxy 🔒

### Por que o Anthropic precisa de servidor proxy?

A API da Anthropic bloqueia requisições CORS do navegador por questões de segurança. Para resolver isso, implementamos um servidor proxy que:
- Recebe a chave API do frontend (nunca armazena)
- Faz a chamada para a API da Anthropic
- Retorna a resposta ao frontend

### Como configurar e usar Anthropic Claude

#### Opção 1: Desenvolvimento Simplificado (Recomendado)

Execute um único comando que inicia tanto o proxy quanto o frontend:
```bash
npm run dev
```

Este comando inicia automaticamente:
- O servidor proxy na porta 3001
- O frontend React na porta 3000

#### Opção 2: Executar Separadamente

1. **Inicie o servidor proxy** (em um terminal separado):
   ```bash
   npm run proxy
   # ou diretamente:
   # node server/anthropic-proxy.js
   ```
   O servidor irá rodar na porta 3001 por padrão.

2. **Inicie o frontend** (em outro terminal):
   ```bash
   npm start
   ```

#### Configuração da Chave API

1. **Configure sua chave API no aplicativo**:
   - Acesse Configurações → IA
   - Selecione "Anthropic Claude" como provedor
   - Cole sua chave API (obtenha em https://console.anthropic.com/settings/keys)
   - Clique em "Salvar Configuração"

2. **Use normalmente**:
   - O sistema irá usar o proxy automaticamente para Claude
   - OpenAI e Gemini continuam funcionando sem proxy

### Variáveis de Ambiente (Opcional)

Se você quiser usar um proxy personalizado ou em produção, configure:
```bash
REACT_APP_ANTHROPIC_PROXY_URL=http://seu-servidor:porta/anthropic-proxy
```

**Para deployment em produção (Vercel, Netlify, etc.):**
- Veja o guia completo: [PROXY_DEPLOYMENT_GUIDE.md](./PROXY_DEPLOYMENT_GUIDE.md)
- Configure a variável de ambiente `REACT_APP_ANTHROPIC_PROXY_URL` no seu provedor de hosting
- O proxy pode ser deployado como serverless function, worker ou servidor separado

**Exemplo de configuração no Vercel:**
1. Vá em Settings → Environment Variables
2. Adicione `REACT_APP_ANTHROPIC_PROXY_URL` com o valor da URL do seu proxy
3. O proxy pode ser deployado na própria Vercel como serverless function em `api/anthropic-proxy.js`

### Segurança

✅ A chave API **não é armazenada** no servidor proxy  
✅ A chave é enviada do frontend apenas durante as requisições  
✅ Nenhuma chave é exposta no código-fonte  
✅ OpenAI e Gemini não precisam de proxy (sem problemas CORS)
