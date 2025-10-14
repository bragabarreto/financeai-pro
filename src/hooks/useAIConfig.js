/**
 * Custom Hook: useAIConfig
 * Carrega configuração de IA do Supabase e sincroniza com localStorage
 * 
 * Resolve o problema de desconexão entre banco de dados e localStorage
 * que impedia o funcionamento do botão "Processar Foto"
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook para carregar e gerenciar configuração de IA
 * @param {string} userId - ID do usuário
 * @param {boolean} autoLoad - Se deve carregar automaticamente (default: true)
 * @returns {Object} { config, loading, error, reload }
 */
export const useAIConfig = (userId, autoLoad = true) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConfig = async () => {
    if (!userId) {
      setLoading(false);
      setConfig(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Tentar localStorage primeiro (cache rápido)
      const localConfig = localStorage.getItem('ai_config');
      if (localConfig) {
        try {
          const parsed = JSON.parse(localConfig);
          if (parsed.enabled && parsed.apiKey && parsed.provider) {
            console.log('✅ Configuração de IA carregada do localStorage (cache)');
            setConfig(parsed);
            setLoading(false);
            
            // Validar no background se está sincronizado com o banco
            validateWithDatabase(userId, parsed);
            return;
          }
        } catch (parseError) {
          console.warn('⚠️ Erro ao parsear localStorage, buscando do banco:', parseError);
          localStorage.removeItem('ai_config');
        }
      }

      // 2. Buscar do Supabase se não encontrou no localStorage
      console.log('🔄 Buscando configuração de IA do Supabase...');
      const { data, error: dbError } = await supabase
        .from('user_settings')
        .select('ai_config')
        .eq('user_id', userId)
        .single();

      if (dbError) {
        // Se não encontrou registro, não é erro crítico
        if (dbError.code === 'PGRST116') {
          console.log('ℹ️ Nenhuma configuração de IA encontrada no banco');
          setConfig(null);
          setLoading(false);
          return;
        }
        throw dbError;
      }

      if (data && data.ai_config) {
        const aiConfig = data.ai_config;
        
        // Validar estrutura da configuração
        if (aiConfig.enabled && aiConfig.apiKey && aiConfig.provider) {
          console.log('✅ Configuração de IA carregada do Supabase:', {
            provider: aiConfig.provider,
            model: aiConfig.model,
            enabled: aiConfig.enabled
          });
          
          // Salvar no localStorage para próximas vezes
          localStorage.setItem('ai_config', JSON.stringify(aiConfig));
          setConfig(aiConfig);
        } else {
          console.warn('⚠️ Configuração de IA incompleta no banco:', aiConfig);
          setConfig(null);
        }
      } else {
        console.log('ℹ️ Nenhuma configuração de IA encontrada');
        setConfig(null);
      }
    } catch (err) {
      console.error('❌ Erro ao carregar configuração de IA:', err);
      setError(err);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Valida se configuração local está sincronizada com o banco
   * Atualiza silenciosamente se houver diferença
   */
  const validateWithDatabase = async (userId, localConfig) => {
    try {
      const { data, error: dbError } = await supabase
        .from('user_settings')
        .select('ai_config')
        .eq('user_id', userId)
        .single();

      if (!dbError && data && data.ai_config) {
        const dbConfig = data.ai_config;
        
        // Comparar se há diferença
        const isDifferent = 
          localConfig.provider !== dbConfig.provider ||
          localConfig.model !== dbConfig.model ||
          localConfig.apiKey !== dbConfig.apiKey ||
          localConfig.enabled !== dbConfig.enabled;

        if (isDifferent) {
          console.log('🔄 Configuração desatualizada, sincronizando...');
          localStorage.setItem('ai_config', JSON.stringify(dbConfig));
          setConfig(dbConfig);
        }
      }
    } catch (err) {
      // Validação em background, não precisa mostrar erro
      console.warn('⚠️ Erro ao validar configuração:', err);
    }
  };

  // Carregar automaticamente quando userId mudar
  useEffect(() => {
    if (autoLoad) {
      loadConfig();
    }
  }, [userId, autoLoad]);

  return {
    config,
    loading,
    error,
    reload: loadConfig,
    isConfigured: config !== null && config.enabled
  };
};

/**
 * Função auxiliar para verificar se IA está disponível
 * Compatível com a função antiga isAIAvailable()
 */
export const checkAIAvailability = (config) => {
  return config !== null && 
         config.enabled === true && 
         config.apiKey && 
         config.provider;
};

export default useAIConfig;

