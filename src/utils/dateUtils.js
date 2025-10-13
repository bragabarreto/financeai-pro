/**
 * Utilitários para manipulação de datas
 * Garante que as datas sejam sempre tratadas no timezone local do usuário
 */

/**
 * Retorna a data atual no formato YYYY-MM-DD usando o timezone local
 * Evita problemas de conversão UTC que causam datas incorretas
 * 
 * @returns {string} Data no formato YYYY-MM-DD (ex: "2025-10-13")
 */
export const getTodayLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Converte uma data para o formato YYYY-MM-DD usando timezone local
 * 
 * @param {Date} date - Objeto Date a ser convertido
 * @returns {string} Data no formato YYYY-MM-DD
 */
export const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Converte uma string de data YYYY-MM-DD para objeto Date no timezone local
 * Evita problemas de conversão UTC
 * 
 * @param {string} dateString - Data no formato YYYY-MM-DD
 * @returns {Date} Objeto Date no timezone local
 */
export const parseLocalDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Retorna a data de hoje no timezone do Brasil (America/Sao_Paulo)
 * Útil para garantir consistência independente do timezone do servidor
 * 
 * @returns {string} Data no formato YYYY-MM-DD
 */
export const getTodayBrazilDate = () => {
  const now = new Date();
  const brazilDate = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  
  // Converter de DD/MM/YYYY para YYYY-MM-DD
  const [day, month, year] = brazilDate.split('/');
  return `${year}-${month}-${day}`;
};

/**
 * Formata uma data para exibição no padrão brasileiro (DD/MM/YYYY)
 * 
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada (DD/MM/YYYY)
 */
export const formatBrazilianDate = (date) => {
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
};

