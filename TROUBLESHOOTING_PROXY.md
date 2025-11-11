# Guia de Solução de Problemas - API Claude

## Visão Geral

Este guia ajuda a resolver problemas relacionados ao servidor proxy do Anthropic Claude, incluindo o erro: "Erro ao testar API: Falha ao conectar com o servidor proxy."

## Arquitetura da Solução

```
Frontend (React) → Servidor Proxy (Express) → API Anthropic
     :3000              :3001                  api.anthropic.com
```

### Por que usar um proxy?

A API da Anthropic bloqueia requisições CORS diretas do navegador. O servidor proxy:
- Recebe requisições do frontend com a chave API
- Encaminha para a API da Anthropic (sem restrições CORS)
- Retorna a resposta ao frontend

## Modo de Desenvolvimento

### Opção 1: Comando Unificado (Recomendado)

```bash
npm run dev
```

Este comando inicia **ambos** os servidores simultaneamente:
- ✅ Servidor proxy na porta 3001
- ✅ Frontend React na porta 3000

### Opção 2: Comandos Separados

Em terminais diferentes:

**Terminal 1 - Proxy:**
```bash
npm run proxy
```

**Terminal 2 - Frontend:**
```bash
npm start
```

## Verificação do Status

### 1. Verificar se o proxy está rodando

```bash
npm run test:proxy
```

**Saída esperada quando funcionando:**
```
✅ All tests passed!
```

**Saída quando NÃO está rodando:**
```
❌ Proxy server is not running
Start it with: npm run proxy
```

### 2. Verificar manualmente com curl

```bash
curl http://localhost:3001/health
```

**Resposta esperada:**
```json
{"status":"ok","service":"anthropic-proxy"}
```

## Problemas Comuns e Soluções

### Erro: "Falha ao conectar com o servidor proxy"

**Causa:** O servidor proxy não está rodando.

**Solução:**
1. Certifique-se de que o proxy está rodando:
   ```bash
   npm run proxy
   ```

2. Ou use o comando unificado:
   ```bash
   npm run dev
   ```

3. Verifique se a porta 3001 está livre:
   ```bash
   lsof -i :3001
   # Se algo estiver usando, mate o processo:
   # kill -9 <PID>
   ```

### Erro: "Port 3001 is already in use"

**Causa:** Outra instância do proxy ou outro serviço está usando a porta 3001.

**Solução 1:** Parar o processo existente
```bash
# Encontre o processo
lsof -i :3001

# Mate o processo
kill -9 <PID>
```

**Solução 2:** Use uma porta diferente
```bash
PORT=3002 npm run proxy
```

Depois, configure a variável de ambiente:
```bash
REACT_APP_ANTHROPIC_PROXY_URL=http://localhost:3002/anthropic-proxy npm start
```

### Erro: "Timeout ao conectar com o proxy"

**Causa:** O proxy está rodando mas não está respondendo adequadamente.

**Soluções:**
1. Reinicie o proxy:
   ```bash
   # Pare o proxy (Ctrl+C no terminal ou)
   pkill -f "node server/anthropic-proxy.js"
   
   # Inicie novamente
   npm run proxy
   ```

2. Verifique logs do servidor para erros
3. Verifique sua conexão de internet

### Erro: "Chave API inválida"

**Causa:** A chave API fornecida está incorreta ou expirou.

**Solução:**
1. Acesse https://console.anthropic.com/settings/keys
2. Verifique se a chave está ativa
3. Gere uma nova chave se necessário
4. Cole a nova chave no aplicativo (Configurações → IA)

### Erro: "Failed to call Anthropic API"

**Causas possíveis:**
- Sem créditos na conta Anthropic
- Chave API sem permissões adequadas
- Problema de rede

**Soluções:**
1. Verifique saldo de créditos em https://console.anthropic.com/
2. Verifique permissões da chave API
3. Teste a chave diretamente com curl:
   ```bash
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: SUA_CHAVE_AQUI" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"OK"}]}'
   ```

## Configuração em Produção

### Opção 1: Deploy Separado do Proxy

1. Deploy o proxy em um servidor separado (Heroku, Railway, etc.)
2. Configure a variável de ambiente no frontend:
   ```
   REACT_APP_ANTHROPIC_PROXY_URL=https://seu-proxy.herokuapp.com/anthropic-proxy
   ```

### Opção 2: Serverless Function (Vercel)

Crie `api/anthropic-proxy.js` no Vercel:
```javascript
export default async function handler(req, res) {
  // Mesmo código do server/anthropic-proxy.js adaptado para serverless
}
```

Configure:
```
REACT_APP_ANTHROPIC_PROXY_URL=https://seu-app.vercel.app/api/anthropic-proxy
```

### Opção 3: Cloudflare Workers

Deploy o proxy como um worker e configure a URL.

## Comandos Úteis

```bash
# Iniciar desenvolvimento completo
npm run dev

# Iniciar apenas o proxy
npm run proxy

# Iniciar apenas o frontend
npm start

# Testar o proxy
npm run test:proxy

# Build para produção
npm run build

# Verificar saúde do proxy
curl http://localhost:3001/health
```

## Checklist de Troubleshooting

Quando tiver problemas com o Claude:

- [ ] O proxy está rodando? (`npm run test:proxy`)
- [ ] A porta 3001 está livre? (`lsof -i :3001`)
- [ ] O health check responde? (`curl http://localhost:3001/health`)
- [ ] A chave API está correta?
- [ ] Há créditos na conta Anthropic?
- [ ] A conexão com internet está funcionando?
- [ ] As variáveis de ambiente estão configuradas?

## Logs e Debugging

### Habilitar logs detalhados do proxy

O proxy já possui logs automáticos. Ao iniciar, você verá:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Anthropic Proxy Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Proxy endpoint: http://localhost:3001/anthropic-proxy
💚 Health check:   http://localhost:3001/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Ready to receive requests from frontend
✓ CORS enabled for all origins
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Cada requisição será logada:
```
[2024-01-15T10:30:00.000Z] POST /anthropic-proxy
[2024-01-15T10:30:01.000Z] GET /health
```

### Verificar logs do frontend

Abra o DevTools do navegador (F12) e vá para a aba Console. Procure por:
- Mensagens de erro em vermelho
- Avisos sobre proxy (warnings)
- Status de requisições na aba Network

## Timeouts Configurados

- Health check: 5 segundos
- Teste de API key: 15 segundos
- Extração de texto (SMS): 30 segundos
- Extração de imagem (foto): 45 segundos

Se as operações estiverem demorando mais, pode indicar:
- Servidor proxy sobrecarregado
- Problemas de rede
- API da Anthropic lenta

## Suporte

Se após seguir este guia o problema persistir:

1. Colete as seguintes informações:
   - Mensagem de erro completa
   - Logs do servidor proxy
   - Resultado de `npm run test:proxy`
   - Sistema operacional e versão do Node.js

2. Verifique issues similares no repositório
3. Abra uma nova issue com todas as informações coletadas

## Recursos Adicionais

- [Documentação da API Anthropic](https://docs.anthropic.com/)
- [Console Anthropic](https://console.anthropic.com/)
- [Guia de Deploy do Proxy](./PROXY_DEPLOYMENT_GUIDE.md)
- [README do Projeto](./README.md)
