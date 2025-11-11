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
   node server/anthropic-proxy.js
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

Se você quiser usar um proxy personalizado, configure:
```bash
REACT_APP_ANTHROPIC_PROXY_URL=http://seu-servidor:porta/anthropic-proxy
```

### Segurança

✅ A chave API **não é armazenada** no servidor proxy  
✅ A chave é enviada do frontend apenas durante as requisições  
✅ Nenhuma chave é exposta no código-fonte  
✅ OpenAI e Gemini não precisam de proxy (sem problemas CORS)
