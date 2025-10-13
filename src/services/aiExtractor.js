import { supabase } from '../lib/supabase';
import { getTodayLocalDate, formatDateLocal } from '../utils/dateUtils';Client';

/**
 * Serviço de extração e categorização inteligente de transações
 * Consulta categorias existentes no banco de dados e sugere categorização
 */

// Keywords were removed - AI now categorizes exclusively based on registered user categories
// This ensures suggestions only come from the user's actual category list

/**
 * Busca categorias existentes do usuário no banco de dados
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object>} Categorias agrupadas por tipo
 */
export const fetchUserCategories = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    // Agrupar por tipo
    const grouped = {
      expense: data.filter(c => c.type === 'expense'),
      income: data.filter(c => c.type === 'income'),
      investment: data.filter(c => c.type === 'investment')
    };

    return grouped;
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return { expense: [], income: [], investment: [] };
  }
};

/**
 * Calcula score de similaridade entre texto e categoria
 * @param {string} text - Texto da transação
 * @param {Object} category - Categoria a comparar
 * @returns {number} Score de 0 a 1
 */
const calculateCategoryScore = (text, category) => {
  const lowerText = text.toLowerCase();
  const categoryName = category.name.toLowerCase();
  
  let score = 0;

  // Match exato do nome da categoria no texto
  if (lowerText.includes(categoryName)) {
    score += 0.8;
  }

  // Match reverso: nome da categoria contém palavras do texto
  const textWords = lowerText.split(/\s+/).filter(word => word.length > 2);
  const categoryWords = categoryName.split(/\s+/).filter(word => word.length > 2);
  
  if (categoryWords.length > 0 && textWords.length > 0) {
    // Palavras do texto que aparecem na categoria
    const textInCategory = textWords.filter(word => categoryName.includes(word));
    if (textInCategory.length > 0) {
      score += (textInCategory.length / textWords.length) * 0.5;
    }
    
    // Palavras da categoria que aparecem no texto
    const categoryInText = categoryWords.filter(word => lowerText.includes(word));
    if (categoryInText.length > 0) {
      score += (categoryInText.length / categoryWords.length) * 0.3;
    }
  }

  return Math.min(score, 1);
};

/**
 * Sugere categoria baseada exclusivamente nas categorias registradas do usuário
 * A IA escolhe a melhor categoria comparando a descrição da transação com os nomes das categorias
 * @param {string} description - Descrição da transação
 * @param {string} type - Tipo da transação
 * @param {Array} categories - Categorias disponíveis (somente as registradas pelo usuário)
 * @returns {Object|null} Categoria sugerida com score de confiança
 */
const suggestCategoryByKeywords = (description, type, categories) => {
  if (!categories || categories.length === 0) {
    return null;
  }

  const lowerDesc = description.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  // Comparar descrição da transação com cada categoria registrada
  for (const category of categories) {
    const score = calculateCategoryScore(description, category);
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = {
        category,
        confidence: score
      };
    }
  }

  return bestMatch;
};

/**
 * Categoriza uma lista de transações
 * @param {Array} transactions - Lista de transações a categorizar
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>} Transações categorizadas com confidence score
 */
export const categorizeTransactions = async (transactions, userId) => {
  // Buscar categorias existentes do usuário
  const userCategories = await fetchUserCategories(userId);

  return transactions.map(transaction => {
    const { type = 'expense', description = '' } = transaction;
    const availableCategories = userCategories[type] || [];

    // Sugerir categoria
    const suggestion = suggestCategoryByKeywords(description, type, availableCategories);

    return {
      ...transaction,
      suggestedCategory: suggestion?.category?.id || null,
      categoryConfidence: suggestion?.confidence || 0,
      isSuggestion: true,
      // Se não houver sugestão, deixar null para edição manual
      category: suggestion?.category?.id || null
    };
  });
};

/**
 * Extrai transações de texto CSV ou similar
 * @param {string} fileContent - Conteúdo do arquivo
 * @param {string} format - Formato do arquivo (csv, ofx, etc)
 * @returns {Array} Lista de transações extraídas
 */
export const extractTransactionsFromFile = (fileContent, format = 'csv') => {
  if (format === 'csv') {
    return extractFromCSV(fileContent);
  }
  // Adicionar outros formatos conforme necessário
  return [];
};

/**
 * Detecta se uma transação é parcelada baseado na descrição
 * @param {string} description - Descrição da transação
 * @returns {Object|null} Informações de parcelamento ou null
 */
const detectInstallment = (description) => {
  if (!description) return null;
  
  const lowerDesc = description.toLowerCase();
  
  // Padrões comuns de parcelamento: "12x", "12/24", "parcela 1 de 12", etc
  const patterns = [
    /(\d+)\s*x\s*de\s*(\d+)/i,  // "1x de 12", "01x de 12"
    /(\d+)\/(\d+)/,              // "1/12", "01/12"
    /parcela\s*(\d+)\s*de\s*(\d+)/i, // "parcela 1 de 12"
    /parc\s*(\d+)\/(\d+)/i,      // "parc 1/12"
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      const totalInstallments = parseInt(match[2]);
      if (totalInstallments > 1 && totalInstallments <= 48) {
        return {
          is_installment: true,
          installment_count: totalInstallments
        };
      }
    }
  }
  
  // Padrão simples: apenas "12x" sem indicar parcela atual
  const simplePattern = /(\d+)\s*x/i;
  const simpleMatch = description.match(simplePattern);
  if (simpleMatch) {
    const count = parseInt(simpleMatch[1]);
    if (count > 1 && count <= 48) {
      return {
        is_installment: true,
        installment_count: count
      };
    }
  }
  
  return null;
};

/**
 * Calcula datas de parcelas
 * @param {string} startDate - Data inicial (ISO format)
 * @param {number} count - Número de parcelas
 * @returns {Array} Array de datas em formato ISO
 */
const calculateInstallmentDates = (startDate, count) => {
  const dates = [];
  const date = new Date(startDate);
  for (let i = 0; i < count; i++) {
    const installmentDate = new Date(date);
    installmentDate.setMonth(date.getMonth() + i);
    dates.push(formatDateLocal(installmentDate));
  }
  return dates;
};

/**
 * Extrai transações de arquivo CSV
 * @param {string} csvContent - Conteúdo CSV
 * @returns {Array} Lista de transações
 */
const extractFromCSV = (csvContent) => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) return [];

  // Assumir primeira linha como cabeçalho
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const transactions = [];

  // Mapear colunas comuns
  const dateIndex = header.findIndex(h => h.includes('data') || h.includes('date'));
  const descIndex = header.findIndex(h => h.includes('descri') || h.includes('desc') || h.includes('hist'));
  const amountIndex = header.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('value'));
  const typeIndex = header.findIndex(h => h.includes('tipo') || h.includes('type'));
  
  // Mapear colunas de parcelamento (se existirem)
  const installmentIndex = header.findIndex(h => h.includes('parcelado') || h.includes('installment'));
  const installmentCountIndex = header.findIndex(h => h.includes('parcelas') || h.includes('installments'));

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length < header.length) continue;

    const date = dateIndex >= 0 ? parseDate(values[dateIndex]) : getTodayLocalDate();
    const description = descIndex >= 0 ? values[descIndex].replace(/['"]/g, '') : '';
    const amount = amountIndex >= 0 ? parseFloat(values[amountIndex].replace(/[^\d.-]/g, '')) : 0;
    
    const transaction = {
      date,
      description,
      amount,
      type: typeIndex >= 0 ? parseType(values[typeIndex]) : 'expense',
      origin: 'import',
      is_installment: false,
      installment_count: null,
      installment_due_dates: [],
      last_installment_date: null
    };
    
    // Verificar se há informação explícita de parcelamento nas colunas
    if (installmentIndex >= 0 && values[installmentIndex]) {
      const isInstallmentValue = values[installmentIndex].toLowerCase();
      transaction.is_installment = isInstallmentValue === 'sim' || isInstallmentValue === 'true' || isInstallmentValue === '1';
    }
    
    if (installmentCountIndex >= 0 && values[installmentCountIndex]) {
      const count = parseInt(values[installmentCountIndex]);
      if (!isNaN(count) && count > 1) {
        transaction.installment_count = count;
        transaction.is_installment = true;
      }
    }
    
    // Se não há informação explícita, tentar detectar pela descrição
    if (!transaction.is_installment) {
      const installmentInfo = detectInstallment(description);
      if (installmentInfo) {
        transaction.is_installment = installmentInfo.is_installment;
        transaction.installment_count = installmentInfo.installment_count;
      }
    }
    
    // Calcular datas de parcelas se for parcelado
    if (transaction.is_installment && transaction.installment_count > 0) {
      transaction.installment_due_dates = calculateInstallmentDates(date, transaction.installment_count);
      transaction.last_installment_date = transaction.installment_due_dates[transaction.installment_due_dates.length - 1];
    }

    if (transaction.description && transaction.amount > 0) {
      transactions.push(transaction);
    }
  }

  return transactions;
};

/**
 * Converte string de data para formato ISO
 * @param {string} dateStr - String de data
 * @returns {string} Data em formato ISO (YYYY-MM-DD)
 */
const parseDate = (dateStr) => {
  // Tentar formatos comuns: DD/MM/YYYY, YYYY-MM-DD, etc
  const patterns = [
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      if (pattern === patterns[0] || pattern === patterns[2]) {
        // DD/MM/YYYY ou DD-MM-YYYY
        return `${match[3]}-${match[2]}-${match[1]}`;
      } else {
        // YYYY-MM-DD
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }
  }

  return getTodayLocalDate();
};

/**
 * Converte string de tipo para tipo válido
 * @param {string} typeStr - String do tipo
 * @returns {string} Tipo válido (expense, income, investment)
 */
const parseType = (typeStr) => {
  const lower = typeStr.toLowerCase();
  if (lower.includes('receita') || lower.includes('income') || lower.includes('credito')) {
    return 'income';
  }
  if (lower.includes('invest')) {
    return 'investment';
  }
  return 'expense';
};
