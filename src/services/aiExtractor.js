import { supabase } from '../supabaseClient';

/**
 * Serviço de extração e categorização inteligente de transações
 * Consulta categorias existentes no banco de dados e sugere categorização
 */

// Palavras-chave para categorização por tipo de transação
const KEYWORDS_BY_TYPE = {
  expense: {
    alimentacao: ['restaurante', 'lanchonete', 'food', 'ifood', 'uber eats', 'padaria', 'mercado', 'supermercado', 'brasilerie', 'pizzaria', 'bar', 'cafe', 'cafeteria', 'lanches', 'hamburgueria', 'confeitaria', 'doceria', 'sorveteria'],
    transporte: ['uber', '99', 'taxi', 'combustivel', 'gasolina', 'estacionamento', 'pedagio', 'posto'],
    moradia: ['aluguel', 'condominio', 'iptu', 'agua', 'luz', 'energia', 'gas'],
    saude: ['farmacia', 'medico', 'hospital', 'clinica', 'consulta', 'plano de saude', 'drogaria'],
    educacao: ['escola', 'curso', 'faculdade', 'universidade', 'livro', 'livraria'],
    lazer: ['cinema', 'teatro', 'show', 'streaming', 'netflix', 'spotify', 'ingresso'],
    vestuario: ['roupa', 'calcado', 'vestuario', 'loja', 'magazine'],
    telefone: ['telefone', 'celular', 'internet', 'tim', 'vivo', 'claro', 'oi'],
  },
  income: {
    salario: ['salario', 'pagamento', 'pix'],
    freelance: ['freelance', 'servico', 'prestacao'],
    investimento: ['rendimento', 'dividendo', 'juros'],
  },
  investment: {
    acoes: ['acao', 'stock', 'bovespa', 'b3'],
    fundos: ['fundo', 'fii', 'etf'],
    renda_fixa: ['cdb', 'lci', 'lca', 'tesouro'],
  }
};

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

  // Match exato do nome da categoria
  if (lowerText.includes(categoryName)) {
    score += 0.8;
  }

  // Match parcial (palavras em comum)
  const textWords = lowerText.split(/\s+/);
  const categoryWords = categoryName.split(/\s+/);
  const commonWords = textWords.filter(word => categoryWords.includes(word));
  score += (commonWords.length / categoryWords.length) * 0.2;

  return Math.min(score, 1);
};

/**
 * Sugere categoria baseada em palavras-chave
 * @param {string} description - Descrição da transação
 * @param {string} type - Tipo da transação
 * @param {Array} categories - Categorias disponíveis
 * @returns {Object|null} Categoria sugerida com score de confiança
 */
const suggestCategoryByKeywords = (description, type, categories) => {
  const lowerDesc = description.toLowerCase();
  const keywords = KEYWORDS_BY_TYPE[type] || {};

  let bestMatch = null;
  let bestScore = 0;

  // Primeiro, tentar match por palavras-chave
  for (const [categoryKey, keywordList] of Object.entries(keywords)) {
    for (const keyword of keywordList) {
      if (lowerDesc.includes(keyword)) {
        // Procurar categoria correspondente
        const category = categories.find(c => 
          c.name.toLowerCase().includes(categoryKey) ||
          c.name.toLowerCase().includes(keyword)
        );
        
        if (category && !bestMatch) {
          bestMatch = { category, confidence: 0.6 };
        }
      }
    }
  }

  // Depois, tentar match por similaridade com nomes de categorias
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

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length < header.length) continue;

    const transaction = {
      date: dateIndex >= 0 ? parseDate(values[dateIndex]) : new Date().toISOString().split('T')[0],
      description: descIndex >= 0 ? values[descIndex].replace(/['"]/g, '') : '',
      amount: amountIndex >= 0 ? parseFloat(values[amountIndex].replace(/[^\d.-]/g, '')) : 0,
      type: typeIndex >= 0 ? parseType(values[typeIndex]) : 'expense',
      origin: 'import'
    };

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

  return new Date().toISOString().split('T')[0];
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
