// Serverless Anthropic proxy for Vercel or similar platforms
// Mirrors the Express proxy used locally so the frontend can validate Claude API keys in production.

const fetchFn = global.fetch || ((...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args))
);

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const parseRequestBody = async (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (req.body && typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  if (req.method === 'POST') {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });
  }

  return null;
};

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', service: 'anthropic-proxy' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST,OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = await parseRequestBody(req);

  if (!body) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON body'
    });
  }

  const { apiKey, model, prompt, maxTokens = 10, image } = body;

  if (!apiKey) {
    return res.status(400).json({
      success: false,
      error: 'API key is required'
    });
  }

  if (!model) {
    return res.status(400).json({
      success: false,
      error: 'Model is required'
    });
  }

  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: 'Prompt is required'
    });
  }

  const sanitizedMaxTokens = Number.isFinite(maxTokens)
    ? maxTokens
    : parseInt(maxTokens, 10) || 10;

  const messageContent = image
    ? [
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
      ]
    : [
        {
          type: 'text',
          text: prompt
        }
      ];

  try {
    const response = await fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: sanitizedMaxTokens,
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

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Anthropic proxy error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
