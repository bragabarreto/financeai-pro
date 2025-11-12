/**
 * Anthropic API Proxy Server
 * 
 * This proxy server resolves CORS issues when calling Anthropic's API from the frontend.
 * The frontend sends the API key, model, and prompt to this proxy, which then forwards
 * the request to Anthropic's API and returns the response.
 * 
 * Security: API keys are sent from the frontend but never stored on the server.
 * 
 * Usage: node server/anthropic-proxy.js
 * Default port: 3001
 */

const express = require('express');
const cors = require('cors');

// Ensure fetch is available in Node environments < 18
const fetchFn = global.fetch || ((...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args))
);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * POST /anthropic-proxy
 * Proxies requests to Anthropic's API
 * 
 * Request body:
 * - apiKey: The Anthropic API key
 * - model: The model to use (e.g., 'claude-3-5-sonnet-20241022')
 * - prompt: The prompt/message to send
 * - maxTokens: (optional) Maximum tokens in response, defaults to 10
 * - image: (optional) Base64 encoded image for vision API
 */
app.post('/anthropic-proxy', async (req, res) => {
  try {
    const { apiKey, model, prompt, maxTokens = 10, image } = req.body;

    // Validate required fields
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

    // Build message content
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

    // Make request to Anthropic API
    const response = await fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
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

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'anthropic-proxy' });
});

app.get('/anthropic-proxy/health', (req, res) => {
  res.json({ status: 'ok', service: 'anthropic-proxy' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Anthropic proxy server running on port ${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/anthropic-proxy`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
