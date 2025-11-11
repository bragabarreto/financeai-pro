# Configuração do Servidor Proxy Anthropic para Produção

## Visão Geral

O Anthropic Claude requer um servidor proxy devido a restrições CORS. Este guia explica como configurar o proxy tanto em desenvolvimento quanto em produção.

## Desenvolvimento Local

### 1. Iniciar o Servidor Proxy

Em um terminal separado, execute:

```bash
npm run proxy
```

Ou diretamente:

```bash
node server/anthropic-proxy.js
```

O servidor irá rodar na porta 3001 por padrão.

### 2. Verificar o Status

Acesse http://localhost:3001/health no navegador ou execute:

```bash
curl http://localhost:3001/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "service": "anthropic-proxy"
}
```

## Produção (Vercel ou Similar)

### Opção 1: Deploy do Proxy como Serverless Function (Recomendado para Vercel)

1. Crie o diretório `api` na raiz do projeto
2. Crie o arquivo `api/anthropic-proxy.js`:

```javascript
const cors = require('cors');

// Helper to initialize middleware
const initMiddleware = (middleware) => (req, res) =>
  new Promise((resolve, reject) => {
    middleware(req, res, (result) =>
      result instanceof Error ? reject(result) : resolve(result)
    );
  });

const corsMiddleware = initMiddleware(cors());

export default async function handler(req, res) {
  await corsMiddleware(req, res);

  if (req.method === 'GET' && req.url === '/health') {
    return res.status(200).json({ status: 'ok', service: 'anthropic-proxy' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { apiKey, model, prompt, maxTokens = 10, image } = req.body;

    if (!apiKey || !model || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    let messageContent;
    if (image) {
      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: image
          }
        },
        {
          type: 'text',
          text: prompt
        }
      ];
    } else {
      messageContent = prompt;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        temperature: image ? 0.1 : undefined,
        messages: [{ role: 'user', content: messageContent }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.error?.message || 'Failed to call Anthropic API'
      });
    }

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
```

3. Configure a variável de ambiente no Vercel:
   - Acesse o dashboard do Vercel
   - Vá em Settings → Environment Variables
   - Adicione: `REACT_APP_ANTHROPIC_PROXY_URL` = `https://seu-dominio.vercel.app/api/anthropic-proxy`

### Opção 2: Deploy do Proxy em Servidor Separado (Render, Railway, etc.)

1. Crie um repositório separado ou use um monorepo
2. Configure o `package.json` com o script de start:

```json
{
  "name": "anthropic-proxy",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^5.1.0",
    "cors": "^2.8.5"
  }
}
```

3. Renomeie `server/anthropic-proxy.js` para `server.js`
4. Deploy no Render/Railway/Heroku
5. Configure a variável de ambiente no Vercel:
   - `REACT_APP_ANTHROPIC_PROXY_URL` = `https://seu-proxy.render.com/anthropic-proxy`

### Opção 3: Cloudflare Workers

1. Crie um Worker na Cloudflare
2. Use código similar ao serverless function acima
3. Configure a variável de ambiente:
   - `REACT_APP_ANTHROPIC_PROXY_URL` = `https://seu-worker.workers.dev/anthropic-proxy`

## Configuração de Variáveis de Ambiente

### Vercel

1. Acesse o dashboard do Vercel
2. Selecione seu projeto
3. Vá em Settings → Environment Variables
4. Adicione a variável:
   - **Key**: `REACT_APP_ANTHROPIC_PROXY_URL`
   - **Value**: URL do seu proxy (ex: `https://seu-dominio.vercel.app/api/anthropic-proxy`)
   - **Environment**: Production, Preview, Development (selecione todos)

### Netlify

1. Acesse o dashboard do Netlify
2. Vá em Site Settings → Environment Variables
3. Adicione a variável:
   - **Key**: `REACT_APP_ANTHROPIC_PROXY_URL`
   - **Value**: URL do seu proxy

### GitHub Actions (CI/CD)

Adicione ao arquivo `.github/workflows/deploy.yml`:

```yaml
env:
  REACT_APP_ANTHROPIC_PROXY_URL: ${{ secrets.ANTHROPIC_PROXY_URL }}
```

E configure o secret no GitHub:
1. Vá em Settings → Secrets and variables → Actions
2. Clique em "New repository secret"
3. Nome: `ANTHROPIC_PROXY_URL`
4. Valor: URL do seu proxy

## Verificação

Após o deploy:

1. Acesse a aplicação
2. Vá em Configurações → IA
3. Selecione "Anthropic Claude"
4. O sistema irá verificar automaticamente a disponibilidade do proxy
5. Se o proxy estiver configurado corretamente, você verá a mensagem: "✓ Servidor Proxy Conectado"

## Troubleshooting

### Erro: "Servidor Proxy Não Detectado"

**Possíveis causas:**
1. Variável de ambiente não configurada
2. URL do proxy incorreta
3. Servidor proxy não está rodando
4. Problemas de CORS

**Soluções:**
1. Verifique se a variável `REACT_APP_ANTHROPIC_PROXY_URL` está configurada
2. Teste o endpoint de health: `curl https://seu-proxy.com/health`
3. Verifique os logs do servidor proxy
4. Certifique-se de que CORS está habilitado no proxy

### Erro: "Timeout ao conectar com o proxy"

**Possíveis causas:**
1. Servidor proxy muito lento ou sobrecarregado
2. Firewall bloqueando a conexão
3. Região do servidor muito distante

**Soluções:**
1. Use uma região mais próxima dos seus usuários
2. Aumente o timeout no código (atualmente 10 segundos)
3. Verifique os limites de rate da sua plataforma de hosting

## Segurança

⚠️ **IMPORTANTE:**

1. **Nunca** armazene API keys no código ou variáveis de ambiente
2. API keys são enviadas do frontend para o proxy apenas durante as requisições
3. O proxy **não deve** armazenar API keys
4. Configure rate limiting no proxy para evitar abuso
5. Use HTTPS em produção

## Custos

- **Vercel Serverless Functions**: Geralmente incluído no plano gratuito (até 100GB-Hrs)
- **Render/Railway**: Planos gratuitos disponíveis com limitações
- **Cloudflare Workers**: Plano gratuito muito generoso (100k requisições/dia)

## Alternativas

Se você não deseja manter um servidor proxy, considere:

1. **Usar apenas Google Gemini ou OpenAI**: Estes não requerem proxy
2. **Backend próprio**: Integre as chamadas da API no seu backend existente
3. **BaaS com Functions**: Use Firebase Functions, Supabase Edge Functions, etc.
