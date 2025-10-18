/**
 * Pattern Learning Service
 * Aprende padrões de categorização baseado no histórico de transações do usuário
 */

import { supabase } from '../../supabaseClient';

/**
 * Busca histórico de transações do usuário para aprender padrões
 * @param {string} userId - ID do usuário
 * @param {string} description - Descrição da transação a categorizar
 * @param {number} limit - Número máximo de transações a buscar
 * @returns {Promise<Object|null>} Categoria sugerida baseada em padrões ou null
 */
export const suggestCategoryFromHistory = async (userId, description, limit = 100) => {
  if (!description || description.trim().length < 3) {
    return null;
  }

  try {
    // Buscar transações anteriores do usuário com categoria definida
    // Priorizar transações mais recentes e mais frequentes
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('description, category, type, created_at')
      .eq('user_id', userId)
      .not('category', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!transactions || transactions.length === 0) {
      return null;
    }

    // Normalizar descrição de entrada
    const normalizedInput = normalizeDescription(description);
    const inputWords = extractKeywords(normalizedInput);

    // Mapear categorias encontradas com seus scores
    const categoryScores = {};

    for (const [index, transaction] of transactions.entries()) {
      const normalizedDesc = normalizeDescription(transaction.description);
      
      // Calcular similaridade
      const similarity = calculateSimilarity(normalizedInput, normalizedDesc, inputWords);
      
      if (similarity > 0.3) {
        const categoryId = transaction.category;
        
        // Calcular peso baseado na recência (transações mais recentes têm maior peso)
        const recencyWeight = 1 - (index / transactions.length) * 0.3; // 0.7 a 1.0
        const weightedSimilarity = similarity * recencyWeight;
        
        if (!categoryScores[categoryId]) {
          categoryScores[categoryId] = {
            totalScore: 0,
            count: 0,
            maxSimilarity: 0,
            recentCount: 0 // Count of matches in last 10 transactions
          };
        }
        
        categoryScores[categoryId].totalScore += weightedSimilarity;
        categoryScores[categoryId].count += 1;
        categoryScores[categoryId].maxSimilarity = Math.max(
          categoryScores[categoryId].maxSimilarity,
          similarity
        );
        
        // Contar matches recentes (dão bonus)
        if (index < 10) {
          categoryScores[categoryId].recentCount += 1;
        }
      }
    }

    // Encontrar a melhor categoria
    let bestCategory = null;
    let bestScore = 0;

    for (const [categoryId, scores] of Object.entries(categoryScores)) {
      // Score ponderado: média de similaridade + bônus por frequência
      const avgScore = scores.totalScore / scores.count;
      const frequencyBonus = Math.min(scores.count / 10, 0.2); // Máximo 0.2 de bônus
      const finalScore = avgScore + frequencyBonus;

      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestCategory = {
          categoryId,
          confidence: Math.min(finalScore, 1),
          matchCount: scores.count,
          maxSimilarity: scores.maxSimilarity
        };
      }
    }

    // Retornar apenas se confiança for razoável
    if (bestCategory && bestCategory.confidence > 0.4) {
      return bestCategory;
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar padrões de categorização:', error);
    return null;
  }
};

/**
 * Normaliza descrição para comparação
 * @param {string} description - Descrição original
 * @returns {string} Descrição normalizada
 */
const normalizeDescription = (description) => {
  if (!description) return '';
  
  return description
    .toLowerCase()
    .trim()
    // Remover caracteres especiais, manter apenas letras, números e espaços
    .replace(/[^\w\s]/g, ' ')
    // Remover múltiplos espaços
    .replace(/\s+/g, ' ')
    // Remover palavras muito comuns que não agregam significado
    .replace(/\b(de|da|do|em|no|na|para|com|por|o|a|os|as)\b/g, ' ')
    .trim();
};

/**
 * Extrai palavras-chave relevantes da descrição
 * @param {string} normalizedDescription - Descrição normalizada
 * @returns {Array<string>} Array de palavras-chave
 */
const extractKeywords = (normalizedDescription) => {
  return normalizedDescription
    .split(/\s+/)
    .filter(word => word.length >= 3) // Palavras com pelo menos 3 caracteres
    .filter(word => !/^\d+$/.test(word)); // Remover números puros
};

/**
 * Calcula similaridade entre duas descrições
 * @param {string} desc1 - Primeira descrição normalizada
 * @param {string} desc2 - Segunda descrição normalizada
 * @param {Array<string>} keywords1 - Palavras-chave da primeira descrição
 * @returns {number} Score de similaridade (0 a 1)
 */
const calculateSimilarity = (desc1, desc2, keywords1) => {
  // 1. Match exato
  if (desc1 === desc2) {
    return 1.0;
  }

  // 2. Uma descrição contém a outra completamente
  if (desc1.includes(desc2) || desc2.includes(desc1)) {
    return 0.9;
  }

  // 3. Similaridade baseada em palavras-chave
  const keywords2 = extractKeywords(desc2);
  
  if (keywords1.length === 0 || keywords2.length === 0) {
    return 0;
  }

  // Contar palavras em comum
  const commonWords = keywords1.filter(word => keywords2.includes(word));
  
  if (commonWords.length === 0) {
    return 0;
  }

  // Calcular Jaccard similarity (interseção / união)
  const union = new Set([...keywords1, ...keywords2]);
  const jaccardScore = commonWords.length / union.size;

  // Calcular overlap coefficient (interseção / menor conjunto)
  const minSize = Math.min(keywords1.length, keywords2.length);
  const overlapScore = commonWords.length / minSize;

  // Score final é a média ponderada
  const finalScore = (jaccardScore * 0.4) + (overlapScore * 0.6);

  return finalScore;
};

/**
 * Sugere categoria combinando padrões históricos e palavras-chave
 * @param {string} userId - ID do usuário
 * @param {string} description - Descrição da transação
 * @param {string} type - Tipo da transação (expense, income, investment)
 * @param {Array} categories - Categorias disponíveis do usuário
 * @returns {Promise<Object|null>} Melhor sugestão de categoria
 */
export const suggestCategoryHybrid = async (userId, description, type, categories) => {
  // 1. Tentar aprender do histórico primeiro (prioridade)
  const historyMatch = await suggestCategoryFromHistory(userId, description);
  
  if (historyMatch && historyMatch.confidence > 0.6) {
    // Buscar detalhes da categoria
    const category = categories.find(c => c.id === historyMatch.categoryId);
    if (category) {
      return {
        category,
        confidence: historyMatch.confidence,
        source: 'history',
        matchCount: historyMatch.matchCount
      };
    }
  }

  // 2. Se não encontrou no histórico ou confiança baixa, usar palavras-chave
  const keywordMatch = suggestCategoryByKeywords(description, type, categories);
  
  if (keywordMatch) {
    return {
      ...keywordMatch,
      source: 'keywords'
    };
  }

  // 3. Se ainda assim não encontrou, retornar match do histórico mesmo com confiança baixa
  if (historyMatch) {
    const category = categories.find(c => c.id === historyMatch.categoryId);
    if (category) {
      return {
        category,
        confidence: historyMatch.confidence,
        source: 'history_low_confidence',
        matchCount: historyMatch.matchCount
      };
    }
  }

  return null;
};

/**
 * Função auxiliar de palavras-chave (copiada do aiExtractor.js)
 * Mantida aqui para evitar dependência circular
 */
const suggestCategoryByKeywords = (description, type, categories) => {
  if (!categories || categories.length === 0) {
    return null;
  }

  const lowerDesc = description.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

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
 * Calcula score de similaridade entre texto e categoria
 */
const calculateCategoryScore = (text, category) => {
  const lowerText = text.toLowerCase();
  const categoryName = category.name.toLowerCase();
  
  let score = 0;

  if (lowerText.includes(categoryName)) {
    score += 0.8;
  }

  const textWords = lowerText.split(/\s+/).filter(word => word.length > 2);
  const categoryWords = categoryName.split(/\s+/).filter(word => word.length > 2);
  
  if (categoryWords.length > 0 && textWords.length > 0) {
    const textInCategory = textWords.filter(word => categoryName.includes(word));
    if (textInCategory.length > 0) {
      score += (textInCategory.length / textWords.length) * 0.5;
    }
    
    const categoryInText = categoryWords.filter(word => lowerText.includes(word));
    if (categoryInText.length > 0) {
      score += (categoryInText.length / categoryWords.length) * 0.3;
    }
  }

  return Math.min(score, 1);
};

