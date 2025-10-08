/**
 * AI Configuration Helper
 * Manages AI configuration loading and validation
 */

/**
 * Load AI configuration from localStorage or database
 * @returns {Object|null} AI configuration or null if not configured
 */
export const loadAIConfig = () => {
  try {
    const configStr = localStorage.getItem('ai_config');
    if (configStr) {
      const config = JSON.parse(configStr);
      if (config.enabled && config.apiKey) {
        return config;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar configuração de IA:', error);
  }
  return null;
};

/**
 * Check if AI is configured and enabled
 * @returns {boolean} True if AI is available
 */
export const isAIConfigured = () => {
  const config = loadAIConfig();
  return config !== null && config.enabled && config.apiKey;
};

/**
 * Get AI provider name
 * @returns {string} Provider name or 'none'
 */
export const getAIProvider = () => {
  const config = loadAIConfig();
  return config?.provider || 'none';
};

/**
 * Save AI configuration to localStorage
 * @param {Object} config - AI configuration
 */
export const saveAIConfig = (config) => {
  try {
    localStorage.setItem('ai_config', JSON.stringify(config));
  } catch (error) {
    console.error('Erro ao salvar configuração de IA:', error);
  }
};

/**
 * Clear AI configuration
 */
export const clearAIConfig = () => {
  try {
    localStorage.removeItem('ai_config');
  } catch (error) {
    console.error('Erro ao limpar configuração de IA:', error);
  }
};

export default {
  loadAIConfig,
  isAIConfigured,
  getAIProvider,
  saveAIConfig,
  clearAIConfig
};
