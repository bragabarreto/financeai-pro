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

1. **Inicie o servidor proxy** (em um terminal separado):
   ```bash
   npm run proxy
   # ou diretamente:
   # node server/anthropic-proxy.js
   ```
   O servidor irá rodar na porta 3001 por padrão.

2. **Configure sua chave API no aplicativo**:
   - Acesse Configurações → IA
   - Selecione "Anthropic Claude" como provedor
   - Cole sua chave API (obtenha em https://console.anthropic.com/settings/keys)
   - Clique em "Salvar Configuração"

3. **Use normalmente**:
   - O sistema irá usar o proxy automaticamente para Claude
   - OpenAI e Gemini continuam funcionando sem proxy

### Variáveis de Ambiente (Opcional)

O projeto já inclui funções serverless em `api/anthropic-proxy.js` e `api/health.js`. Em produção, caso nenhum endereço seja configurado, o frontend utiliza automaticamente `https://seu-dominio/api/anthropic-proxy`.

Configure a variável abaixo apenas se quiser apontar para um proxy externo:
```bash
REACT_APP_ANTHROPIC_PROXY_URL=https://seu-servidor/anthropic-proxy
```

**Para deployment em produção (Vercel, Netlify, etc.):**
- Veja o guia completo: [PROXY_DEPLOYMENT_GUIDE.md](./PROXY_DEPLOYMENT_GUIDE.md)
- Opcionalmente configure `REACT_APP_ANTHROPIC_PROXY_URL` no seu provedor de hosting para usar um proxy dedicado
- Caso contrário, basta publicar o projeto e a função `api/anthropic-proxy` cuidará das requisições

**Exemplo de configuração no Vercel:**
1. Vá em Settings → Environment Variables
2. (Opcional) Adicione `REACT_APP_ANTHROPIC_PROXY_URL` caso use um proxy externo
3. Sem nenhuma configuração extra, a função `api/anthropic-proxy.js` já estará disponível em `https://seu-app.vercel.app/api/anthropic-proxy`

### Segurança

✅ A chave API **não é armazenada** no servidor proxy  
✅ A chave é enviada do frontend apenas durante as requisições  
✅ Nenhuma chave é exposta no código-fonte  
✅ OpenAI e Gemini não precisam de proxy (sem problemas CORS)
