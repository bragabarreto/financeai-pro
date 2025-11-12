import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { resolveAnthropicProxyBaseUrl, resolveAnthropicProxyHealthUrl, resolveAnthropicProxyUrl } from '../../utils/anthropicProxy';

/**
 * AI Configuration Settings Component
 * Allows users to configure AI providers and API keys for enhanced extraction
 */
const AIConfigSettings = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showKeys, setShowKeys] = useState({});
  const [proxyStatus, setProxyStatus] = useState({ checked: false, available: false });
  
  const [config, setConfig] = useState({
    enabled: false,
    provider: 'gemini',
    model: '',
    apiKey: ''
  });

  const providers = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      models: [
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado)' },
        { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Experimental' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
      ],
      description: 'Google Gemini oferece excelente precisão para textos em português e imagens',
      getKeyUrl: 'https://aistudio.google.com/app/apikey',
      icon: '🔷'
    },
    {
      id: 'openai',
      name: 'OpenAI (ChatGPT)',
      models: [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recomendado)' },
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (Responses API)' }
      ],
      description: 'OpenAI GPT oferece alta qualidade e suporte a visão computacional',
      getKeyUrl: 'https://platform.openai.com/api-keys',
      icon: '🟢'
    },
    {
      id: 'claude',
      name: 'Anthropic Claude',
      models: [
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recomendado)' },
        { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
      ],
      description: 'Anthropic Claude oferece excelente compreensão contextual e precisão',
      getKeyUrl: 'https://console.anthropic.com/settings/keys',
      icon: '🟣'
    }
  ];

  useEffect(() => {
    if (user) {
      loadConfig();
    }
  }, [user]);

  useEffect(() => {
    // Check proxy status when Claude provider is selected
    if (config.provider === 'claude') {
      checkProxyHealth();
    }
  }, [config.provider]);

    const checkProxyHealth = async () => {
      try {
        const healthUrl = resolveAnthropicProxyHealthUrl();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          setProxyStatus({ checked: true, available: data.status === 'ok' });
        } else {
          setProxyStatus({ checked: true, available: false });
        }
      } catch (error) {
        console.warn('Proxy health check failed:', error.message);
        setProxyStatus({ checked: true, available: false });
      }
    };

  const loadConfig = async () => {
    setLoading(true);
    try {
      // Try to load from database first
      const { data, error } = await supabase
        .from('user_settings')
        .select('ai_config')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // If table doesn't exist, try localStorage
        if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.warn('Tabela user_settings não existe, carregando do localStorage');
          const localConfig = localStorage.getItem('ai_config');
          if (localConfig) {
            const parsed = JSON.parse(localConfig);
            setConfig({
              enabled: parsed.enabled || false,
              provider: parsed.provider || 'gemini',
              model: parsed.model || '',
              apiKey: parsed.apiKey || ''
            });
          }
          return;
        }
        throw error;
      }

      if (data && data.ai_config) {
        setConfig({
          enabled: data.ai_config.enabled || false,
          provider: data.ai_config.provider || 'gemini',
          model: data.ai_config.model || '',
          apiKey: data.ai_config.apiKey || ''
        });
      } else {
        // Fallback to localStorage if no data in database
        const localConfig = localStorage.getItem('ai_config');
        if (localConfig) {
          const parsed = JSON.parse(localConfig);
          setConfig({
            enabled: parsed.enabled || false,
            provider: parsed.provider || 'gemini',
            model: parsed.model || '',
            apiKey: parsed.apiKey || ''
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      // Try localStorage as last resort
      try {
        const localConfig = localStorage.getItem('ai_config');
        if (localConfig) {
          const parsed = JSON.parse(localConfig);
          setConfig({
            enabled: parsed.enabled || false,
            provider: parsed.provider || 'gemini',
            model: parsed.model || '',
            apiKey: parsed.apiKey || ''
          });
        }
      } catch (localError) {
        console.error('Erro ao carregar do localStorage:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate
      if (config.enabled && !config.apiKey) {
        setMessage({ type: 'error', text: 'Por favor, forneça uma chave API' });
        return;
      }

      // Test API key if enabled
      if (config.enabled && config.apiKey) {
        setMessage({ type: 'info', text: 'Testando chave API...' });
        const testResult = await testAPIKey();
        if (!testResult.success) {
          setMessage({ type: 'error', text: `Erro ao testar API: ${testResult.error}` });
          return;
        }
      }

      const configData = {
        enabled: config.enabled,
        provider: config.provider,
        model: config.model || getDefaultModel(config.provider),
        apiKey: config.apiKey
      };

      // Try to save to database
      try {
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            ai_config: configData,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          // Check if table doesn't exist
          if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
            console.warn('Tabela user_settings não existe, salvando apenas no localStorage');
            throw new Error('TABLE_NOT_EXISTS');
          }
          throw error;
        }
        
        setMessage({ type: 'success', text: 'Configuração salva com sucesso no banco de dados!' });
        
      } catch (dbError) {
        // Fallback to localStorage only
        if (dbError.message === 'TABLE_NOT_EXISTS') {
          console.log('Usando fallback para localStorage');
          setMessage({ 
            type: 'warning', 
            text: 'Configuração salva localmente. Execute o script SQL no Supabase para persistência completa.' 
          });
        } else {
          throw dbError;
        }
      }
      
      // Always store in localStorage for quick access
      if (config.enabled) {
        localStorage.setItem('ai_config', JSON.stringify(configData));
      } else {
        localStorage.removeItem('ai_config');
      }
      
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      setMessage({ 
        type: 'error', 
        text: `Erro ao salvar: ${error.message || 'Erro desconhecido'}. Verifique se executou o script SQL no Supabase.` 
      });
    } finally {
      setSaving(false);
    }
  };

  const testAPIKey = async () => {
    try {
      const testPrompt = 'Responda apenas com "OK"';

      if (config.provider === 'openai') {
        const model = config.model || 'gpt-4o-mini';
        const useResponsesEndpoint = model.startsWith('gpt-4.1') || model.startsWith('o1');
        const endpoint = useResponsesEndpoint
          ? 'https://api.openai.com/v1/responses'
          : 'https://api.openai.com/v1/chat/completions';
        const payload = useResponsesEndpoint
          ? {
              model,
              input: [
                {
                  role: 'user',
                  content: [{ type: 'text', text: testPrompt }]
                }
              ],
              max_output_tokens: 10,
              temperature: 0.1,
              modalities: ['text']
            }
          : {
              model,
              messages: [{ role: 'user', content: testPrompt }],
              max_tokens: 10
            };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          let errorMessage = 'Chave API inválida';
          try {
            const error = await response.json();
            errorMessage = error.error?.message || error.message || error.error || errorMessage;
          } catch (parseError) {
            errorMessage = `${errorMessage}: ${response.statusText}`;
          }
          return { success: false, error: errorMessage };
        }
      } else if (config.provider === 'gemini') {
        const model = config.model || 'gemini-2.5-flash';
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: testPrompt }] }]
            })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.error?.message || 'Chave API inválida' };
        }
      } else if (config.provider === 'claude') {
        if (proxyStatus.checked && !proxyStatus.available) {
          return {
            success: false,
            error:
              'Servidor proxy não está disponível. Por favor, inicie o servidor proxy com "npm run proxy" ou configure REACT_APP_ANTHROPIC_PROXY_URL para o endereço do seu servidor proxy em produção.'
          };
        }

        const proxyUrl = resolveAnthropicProxyUrl();
        const proxyBaseUrl = resolveAnthropicProxyBaseUrl();

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              apiKey: config.apiKey,
              model: config.model || 'claude-3-5-sonnet-20241022',
              prompt: testPrompt,
              maxTokens: 10
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const result = await response.json();
            return { success: false, error: result.error || 'Erro ao conectar com o proxy' };
          }

          const result = await response.json();

          if (!result.success) {
            return { success: false, error: result.error || 'Chave API inválida' };
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            return {
              success: false,
              error: 'Timeout ao conectar com o proxy. Verifique se o servidor está rodando.'
            };
          }
          return {
            success: false,
            error: `Falha ao conectar com o servidor proxy em ${proxyBaseUrl || proxyUrl}. Certifique-se de que:\n1. O servidor proxy está rodando (execute "npm run proxy")\n2. A variável REACT_APP_ANTHROPIC_PROXY_URL está configurada corretamente\n3. Não há firewall bloqueando a conexão`
          };
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getDefaultModel = (provider) => {
    const providerData = providers.find(p => p.id === provider);
    return providerData?.models[0]?.value || '';
  };

  const currentProvider = providers.find(p => p.id === config.provider);

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Sparkles className="w-6 h-6 text-purple-600" />
        <div>
          <h3 className="text-xl font-bold">Configuração de IA</h3>
          <p className="text-sm text-gray-600">
            Configure provedores de IA para melhorar a extração de dados de SMS e fotos
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Enable AI */}
        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
          <div>
            <label className="font-medium text-gray-900">Habilitar Extração com IA</label>
            <p className="text-sm text-gray-600">
              Use IA para extrair dados de transações com maior precisão
            </p>
          </div>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="w-6 h-6 text-purple-600 rounded focus:ring-purple-500"
          />
        </div>

        {config.enabled && (
          <>
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Provedor de IA</label>
              <div className="space-y-3">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    onClick={() => setConfig({ ...config, provider: provider.id, model: '' })}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      config.provider === provider.id
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{provider.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{provider.name}</div>
                        <p className="text-sm text-gray-600 mt-1">{provider.description}</p>
                        <a
                          href={provider.getKeyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-purple-600 hover:underline mt-2 inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Obter chave API →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Proxy Status Warning for Claude */}
            {config.provider === 'claude' && proxyStatus.checked && !proxyStatus.available && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-orange-900">
                    <p className="font-medium mb-2">⚠️ Servidor Proxy Não Detectado</p>
                    <p className="mb-2">O Anthropic Claude requer um servidor proxy ativo para funcionar. Não foi possível acessar {resolveAnthropicProxyHealthUrl()}.</p>
                    <p className="font-medium mb-1">Para usar o Claude, você precisa:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Abrir um terminal separado</li>
                      <li>Executar o comando: <code className="bg-orange-100 px-2 py-0.5 rounded">npm run proxy</code></li>
                      <li>Manter o servidor rodando enquanto usa o aplicativo</li>
                    </ol>
                    <p className="mt-2 text-xs">
                      Em produção, configure a variável de ambiente <code className="bg-orange-100 px-1 rounded">REACT_APP_ANTHROPIC_PROXY_URL</code> com o endereço do seu servidor proxy (ex.: {resolveAnthropicProxyUrl()}).
                    </p>
                    <button
                      onClick={checkProxyHealth}
                      className="mt-3 px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                    >
                      Verificar Novamente
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Proxy Status Success for Claude */}
            {config.provider === 'claude' && proxyStatus.checked && proxyStatus.available && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium">✓ Servidor Proxy Conectado</p>
                    <p className="text-xs mt-1">O servidor proxy está rodando e pronto para usar o Claude.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Model Selection */}
            {currentProvider && (
              <div>
                <label className="block text-sm font-medium mb-2">Modelo</label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {currentProvider.models.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium mb-2">Chave API</label>
              <div className="relative">
                <input
                  type={showKeys[config.provider] ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="Cole sua chave API aqui"
                  className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKeys({ ...showKeys, [config.provider]: !showKeys[config.provider] })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                >
                  {showKeys[config.provider] ? (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Sua chave API é armazenada de forma segura e nunca é compartilhada
              </p>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Como funciona:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Cole textos de SMS bancários para extração automática</li>
                    <li>Envie fotos de comprovantes e notificações</li>
                    <li>A IA identifica automaticamente valores, datas e estabelecimentos</li>
                    <li>Cartões são identificados pelos últimos 4 dígitos</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Message */}
        {message.text && (
          <div className={`p-4 rounded-lg flex items-center space-x-3 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-900 border border-green-200' 
              : message.type === 'warning'
              ? 'bg-yellow-50 text-yellow-900 border border-yellow-200'
              : message.type === 'info'
              ? 'bg-blue-50 text-blue-900 border border-blue-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Save Button */}
        <div className="flex space-x-3">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Salvando...' : 'Salvar Configuração'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIConfigSettings;
