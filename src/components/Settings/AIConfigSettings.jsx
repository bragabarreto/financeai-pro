import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';

/**
 * AI Configuration Settings Component
 * Allows users to configure AI providers and API keys for enhanced extraction
 */
const AIConfigSettings = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showKeys, setShowKeys] = useState({});
  
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
        { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (Recomendado)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'gpt-4o', label: 'GPT-4o' }
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

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('ai_config')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.ai_config) {
        setConfig({
          enabled: data.ai_config.enabled || false,
          provider: data.ai_config.provider || 'gemini',
          model: data.ai_config.model || '',
          apiKey: data.ai_config.apiKey || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
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
        const testResult = await testAPIKey();
        if (!testResult.success) {
          setMessage({ type: 'error', text: `Erro ao testar API: ${testResult.error}` });
          return;
        }
      }

      // Save to database
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ai_config: {
            enabled: config.enabled,
            provider: config.provider,
            model: config.model || getDefaultModel(config.provider),
            apiKey: config.apiKey
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Configuração salva com sucesso!' });
      
      // Store in localStorage for quick access
      if (config.enabled) {
        localStorage.setItem('ai_config', JSON.stringify({
          enabled: config.enabled,
          provider: config.provider,
          model: config.model || getDefaultModel(config.provider),
          apiKey: config.apiKey
        }));
      } else {
        localStorage.removeItem('ai_config');
      }
      
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configuração' });
    } finally {
      setSaving(false);
    }
  };

  const testAPIKey = async () => {
    try {
      const testPrompt = 'Responda apenas com "OK"';
      
      if (config.provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model || 'gpt-4.1-mini',
            messages: [{ role: 'user', content: testPrompt }],
            max_tokens: 10
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.error?.message || 'Chave API inválida' };
        }
        
      } else if (config.provider === 'gemini') {
        const model = config.model || 'gemini-2.5-flash';
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: testPrompt }] }]
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.error?.message || 'Chave API inválida' };
        }
        
      } else if (config.provider === 'claude') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: config.model || 'claude-3-5-sonnet-20241022',
            max_tokens: 10,
            messages: [{ role: 'user', content: testPrompt }]
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.error?.message || 'Chave API inválida' };
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
            message.type === 'success' ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
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
