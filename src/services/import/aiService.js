import { resolveAnthropicProxyBaseUrl, resolveAnthropicProxyUrl } from '../../utils/anthropicProxy';

/**
 * AI Service Integration Layer
 * Provides abstraction for multiple AI providers (Google Gemini, OpenAI, Anthropic)
 * Supports transaction categorization and contextual analysis
 */

/**
 * AI Provider configuration
 * Add API keys via environment variables:
 * - REACT_APP_OPENAI_API_KEY
 * - REACT_APP_GEMINI_API_KEY  
 * - REACT_APP_ANTHROPIC_API_KEY
 */

const AI_CONFIG = {
  openai: {
    enabled: !!process.env.REACT_APP_OPENAI_API_KEY,
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  },
  gemini: {
    enabled: !!process.env.REACT_APP_GEMINI_API_KEY,
    apiKey: process.env.REACT_APP_GEMINI_API_KEY,
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    model: 'gemini-pro'
  },
  anthropic: {
    enabled: !!process.env.REACT_APP_ANTHROPIC_API_KEY,
    apiKey: process.env.REACT_APP_ANTHROPIC_API_KEY,
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-sonnet-20240229'
  }
};

/**
 * Check if any AI provider is configured
 * @returns {boolean} True if at least one provider is available
 */
export const isAIAvailable = () => {
  return AI_CONFIG.openai.enabled || 
         AI_CONFIG.gemini.enabled || 
         AI_CONFIG.anthropic.enabled;
};

/**
 * Get available AI providers
 * @returns {Array} List of available provider names
 */
export const getAvailableProviders = () => {
  const providers = [];
  if (AI_CONFIG.openai.enabled) providers.push('openai');
  if (AI_CONFIG.gemini.enabled) providers.push('gemini');
  if (AI_CONFIG.anthropic.enabled) providers.push('anthropic');
  return providers;
};

/**
 * Call OpenAI GPT API
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} AI response
 */
const callOpenAI = async (prompt) => {
  const model = AI_CONFIG.openai.model;
  const useResponsesEndpoint = model.startsWith('gpt-4.1') || model.startsWith('o1');
  const endpoint = useResponsesEndpoint
    ? 'https://api.openai.com/v1/responses'
    : AI_CONFIG.openai.endpoint;

  const payload = useResponsesEndpoint
    ? {
        model,
        input: [
          {
            role: 'system',
            content: [
              { type: 'text', text: 'You are a financial transaction categorization assistant. Analyze transactions and provide categorization in JSON format.' }
            ]
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt }
            ]
          }
        ],
        temperature: 0.3,
        max_output_tokens: 500,
        response_format: { type: 'json_object' }
      }
    : {
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a financial transaction categorization assistant. Analyze transactions and provide categorization in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.openai.apiKey}`
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }
  
  const data = await response.json();

  if (useResponsesEndpoint) {
    const outputPart = data.output?.[0]?.content?.find(
      (part) => part.type === 'output_text' || part.type === 'text'
    );
    return outputPart?.text || '';
  }

  return data.choices[0]?.message?.content || '';
};

/**
 * Call Google Gemini API
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} AI response
 */
const callGemini = async (prompt) => {
  const url = `${AI_CONFIG.gemini.endpoint}?key=${AI_CONFIG.gemini.apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are a financial transaction categorization assistant. ${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

/**
 * Call Anthropic Claude API via proxy
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} AI response
 */
const callClaude = async (prompt) => {
  // Use proxy server to avoid CORS issues with Anthropic API
  const proxyUrl = resolveAnthropicProxyUrl();
  const proxyBaseUrl = resolveAnthropicProxyBaseUrl();
  
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: AI_CONFIG.anthropic.apiKey,
        model: AI_CONFIG.anthropic.model,
        prompt: `You are a financial transaction categorization assistant. ${prompt}`,
        maxTokens: 500
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Claude API error: ${result.error || 'Unknown error'}`);
    }
    
    return result.data.content?.[0]?.text || '';
  } catch (error) {
    // Provide helpful error if proxy is not available
    if (
      error.name === 'TypeError' ||
      error.message.includes('fetch') ||
      error.message.includes('Failed to fetch')
    ) {
      throw new Error(`Não foi possível conectar ao servidor proxy para Anthropic. Certifique-se de que o serviço está acessível em ${proxyBaseUrl || proxyUrl}`);
    }
    throw error;
  }
};

/**
 * Call AI provider with automatic fallback
 * @param {string} prompt - The prompt to send
 * @param {string} preferredProvider - Preferred provider ('openai', 'gemini', 'anthropic')
 * @returns {Promise<string>} AI response
 */
const callAI = async (prompt, preferredProvider = 'gemini') => {
  const providers = getAvailableProviders();
  
  if (providers.length === 0) {
    throw new Error('No AI provider configured. Please set API keys in environment variables.');
  }
  
  // Try preferred provider first, then fallback to others
  const providerOrder = providers.includes(preferredProvider) 
    ? [preferredProvider, ...providers.filter(p => p !== preferredProvider)]
    : providers;
  
  for (const provider of providerOrder) {
    try {
      if (provider === 'openai') {
        return await callOpenAI(prompt);
      } else if (provider === 'gemini') {
        return await callGemini(prompt);
      } else if (provider === 'anthropic') {
        return await callClaude(prompt);
      }
    } catch (error) {
      console.warn(`Failed to call ${provider}:`, error.message);
      // Continue to next provider
    }
  }
  
  throw new Error('All AI providers failed');
};

/**
 * Enhance transaction categorization using AI and match payment forms
 * @param {Object} transaction - Transaction object
 * @param {Array} availableCategories - List of available categories
 * @param {Array} availableCards - List of user's cards
 * @param {Array} availableAccounts - List of user's accounts
 * @param {Object} historicalContext - Optional historical context for better matching
 * @returns {Promise<Object>} Enhanced transaction with AI suggestions
 */
export const enhanceTransactionWithAI = async (transaction, availableCategories = [], availableCards = [], availableAccounts = [], historicalContext = {}) => {
  if (!isAIAvailable()) {
    return transaction; // Return unchanged if no AI available
  }

  try {
    const categoryNames = availableCategories.map(c => c.name).join(', ');
    const cardNames = availableCards.map(c => `${c.name}${c.last_digits ? ` (*${c.last_digits})` : ''}`).join(', ');
    const accountNames = availableAccounts.map(a => a.name).join(', ');
    
    // If no categories are registered, return transaction unchanged
    if (!categoryNames) {
      console.warn('No categories available for AI enhancement');
      return transaction;
    }
    
    // Build historical context section if available
    let historicalSection = '';
    if (historicalContext.recentTransactions && historicalContext.recentTransactions.length > 0) {
      historicalSection = `
HISTORICAL CONTEXT (USE AS PRIORITY REFERENCE):
These transactions show how the user typically categorizes similar merchants:
${historicalContext.recentTransactions.slice(0, 10).map(t => 
  `- "${t.description}" → Category: ${t.category} (${t.type})`
).join('\n')}

IMPORTANT: If the current transaction description is SIMILAR to any in the history, 
use the SAME CATEGORY to ensure consistency.`;
    }
    
    const prompt = `Analyze this financial transaction and suggest the best category and payment form:

Transaction Details:
- Description: ${transaction.description || 'N/A'}
- Amount: R$ ${transaction.amount || 0}
- Type: ${transaction.type || 'expense'}
- Payment Method: ${transaction.payment_method || 'N/A'}
- Card Last Digits: ${transaction.card_last_digits || 'N/A'}
- Raw Text: ${transaction.raw_text || 'N/A'}

Available Categories: ${categoryNames}
Available Cards: ${cardNames || 'None'}
Available Accounts: ${accountNames || 'None'}
${historicalSection}

IMPORTANT INSTRUCTIONS:
1. You MUST select the category ONLY from the Available Categories list above. Do not suggest categories that are not in this list.
2. Analyze the COMPLETE DESCRIPTION provided to understand the nature of the transaction and suggest the most appropriate category.
3. The description field contains the full name of the establishment or party involved - use this complete information for accurate categorization.
4. If historical context is provided and a similar transaction exists, PREFER the same category used before.
5. If card last digits are provided, match them to the Available Cards list.

Based on the payment method and COMPLETE description, identify:
1. The most suitable category from the Available Categories list (use the full description as primary context)
2. If payment_method is "credit_card", which card was likely used (match by last digits if provided, or by card name from description)
3. If payment_method is "debit_card", "pix", "transfer", etc., which account was likely used

Provide your response in JSON format:
{
  "category": "suggested category name (MUST be from Available Categories list)",
  "confidence": 0-100,
  "reasoning": "brief explanation mentioning the complete description analysis",
  "suggested_card": "card name if credit_card payment, otherwise null",
  "suggested_account": "account name if account payment, otherwise null"
}`;

    const response = await callAI(prompt);
    
    // Try to parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiSuggestion = JSON.parse(jsonMatch[0]);
      
      // Find matching category
      const matchedCategory = availableCategories.find(c => 
        c.name.toLowerCase() === aiSuggestion.category?.toLowerCase()
      );
      
      // Find matching card
      let matchedCard = null;
      if (aiSuggestion.suggested_card && transaction.payment_method === 'credit_card') {
        matchedCard = availableCards.find(c => 
          c.name.toLowerCase().includes(aiSuggestion.suggested_card.toLowerCase()) ||
          aiSuggestion.suggested_card.toLowerCase().includes(c.name.toLowerCase())
        );
      }
      
      // Find matching account
      let matchedAccount = null;
      if (aiSuggestion.suggested_account) {
        matchedAccount = availableAccounts.find(a => 
          a.name.toLowerCase().includes(aiSuggestion.suggested_account.toLowerCase()) ||
          aiSuggestion.suggested_account.toLowerCase().includes(a.name.toLowerCase())
        );
      }
      
      return {
        ...transaction,
        aiSuggestedCategory: matchedCategory?.id || null,
        aiCategoryName: aiSuggestion.category,
        aiConfidence: aiSuggestion.confidence || 0,
        aiReasoning: aiSuggestion.reasoning,
        card_id: matchedCard?.id || transaction.card_id || null,
        account_id: matchedAccount?.id || transaction.account_id || null,
        enhancedByAI: true
      };
    }
  } catch (error) {
    console.error('AI enhancement failed:', error.message);
  }
  
  return transaction;
};

/**
 * Batch enhance multiple transactions
 * @param {Array} transactions - Array of transactions
 * @param {Array} availableCategories - List of available categories
 * @param {Array} availableCards - List of user's cards
 * @param {Array} availableAccounts - List of user's accounts
 * @param {string} userId - Optional user ID for fetching historical context
 * @returns {Promise<Array>} Enhanced transactions
 */
export const enhanceTransactionsWithAI = async (transactions, availableCategories = [], availableCards = [], availableAccounts = [], userId = null) => {
  if (!isAIAvailable() || !Array.isArray(transactions) || transactions.length === 0) {
    return transactions;
  }

  // Fetch historical context if userId is provided
  let historicalContext = {};
  if (userId) {
    try {
      const { supabase } = await import('../../supabaseClient');
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('description, category, type')
        .eq('user_id', userId)
        .not('category', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (recentTransactions && recentTransactions.length > 0) {
        // Map category IDs to names
        const transactionsWithNames = recentTransactions.map(t => {
          const cat = availableCategories.find(c => c.id === t.category);
          return {
            ...t,
            category: cat ? cat.name : 'outros'
          };
        });
        historicalContext.recentTransactions = transactionsWithNames;
        console.log(`📊 Contexto histórico carregado: ${transactionsWithNames.length} transações recentes`);
      }
    } catch (error) {
      console.warn('Não foi possível carregar contexto histórico:', error);
    }
  }

  // Process in batches to avoid rate limits
  const batchSize = 5;
  const enhanced = [];
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const promises = batch.map(t => enhanceTransactionWithAI(t, availableCategories, availableCards, availableAccounts, historicalContext));
    
    try {
      const results = await Promise.allSettled(promises);
      enhanced.push(...results.map((r, idx) => 
        r.status === 'fulfilled' ? r.value : batch[idx]
      ));
    } catch (error) {
      console.error('Batch enhancement failed:', error);
      enhanced.push(...batch);
    }
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < transactions.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return enhanced;
};

/**
 * Analyze SMS text using AI for better extraction
 * @param {string} smsText - SMS text to analyze
 * @returns {Promise<Object>} Extracted transaction data
 */
export const analyzeSMSWithAI = async (smsText) => {
  if (!isAIAvailable()) {
    return null;
  }

  try {
    const prompt = `Extract transaction information from this SMS/notification:

"${smsText}"

Provide the extracted data in JSON format:
{
  "amount": number,
  "description": "merchant or description",
  "date": "YYYY-MM-DD",
  "type": "income or expense",
  "payment_method": "credit_card, debit_card, pix, transfer, or boleto_bancario",
  "confidence": 0-100
}

If you cannot extract all information, use null for missing fields.`;

    const response = await callAI(prompt);
    
    // Try to parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      return {
        ...extracted,
        origin: 'sms_import',
        raw_text: smsText.substring(0, 200),
        extractedByAI: true
      };
    }
  } catch (error) {
    console.error('AI SMS analysis failed:', error.message);
  }
  
  return null;
};

/**
 * Get AI provider status
 * @returns {Object} Status of each provider
 */
export const getAIStatus = () => {
  return {
    available: isAIAvailable(),
    providers: {
      openai: {
        enabled: AI_CONFIG.openai.enabled,
        model: AI_CONFIG.openai.model
      },
      gemini: {
        enabled: AI_CONFIG.gemini.enabled,
        model: AI_CONFIG.gemini.model
      },
      anthropic: {
        enabled: AI_CONFIG.anthropic.enabled,
        model: AI_CONFIG.anthropic.model
      }
    }
  };
};

/**
 * Get AI configuration from localStorage
 * This is used for features that need AI config (like photo extraction)
 * @returns {Object|null} AI configuration object or null if not configured
 */
export const getAIConfig = () => {
  try {
    const configStr = localStorage.getItem('ai_config');
    if (configStr) {
      const config = JSON.parse(configStr);
      if (config.enabled && config.apiKey && config.provider) {
        return config;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar configuração de IA:', error);
  }
  return null;
};
