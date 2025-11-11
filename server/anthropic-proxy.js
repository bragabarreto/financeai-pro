/**
 * Anthropic API Proxy Server
 * 
 * This proxy server resolves CORS issues when calling Anthropic's API from the frontend.
 * The frontend sends the API key, model, and prompt to this proxy, which then forwards
 * the request to Anthropic's API and returns the response.
 * 
 * Security: API keys are sent from the frontend but never stored on the server.
 * 
 * Usage: 
 *   Development: npm run dev (starts both proxy and frontend)
 *   Proxy only: npm run proxy
 * Default port: 3001
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

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
    let messageContent;
    if (image) {
      // Vision API with image
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
      // Text-only API
      messageContent = prompt;
    }

    // Make request to Anthropic API
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
        temperature: image ? 0.1 : undefined, // Use temperature for vision
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
      data: data
    });

  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Provide more detailed error information
    let errorMessage = error.message || 'Internal server error';
    let statusCode = 500;
    
    // Handle specific error types
    if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
      errorMessage = 'Failed to connect to Anthropic API. Please check your internet connection.';
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request to Anthropic API timed out. Please try again.';
      statusCode = 504;
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'anthropic-proxy' });
});

// Start server
app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Anthropic Proxy Server Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Proxy endpoint: http://localhost:${PORT}/anthropic-proxy`);
  console.log(`💚 Health check:   http://localhost:${PORT}/health`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✓ Ready to receive requests from frontend');
  console.log('✓ CORS enabled for all origins');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use.`);
    console.error('   Please stop the other process or use a different port:\n');
    console.error(`   PORT=3002 npm run proxy\n`);
    process.exit(1);
  } else {
    console.error('\n❌ Failed to start proxy server:', err.message);
    process.exit(1);
  }
});
