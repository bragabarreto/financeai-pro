/**
 * Transaction Matcher Service
 * Matches new transactions with historical data for better pre-filling
 * and identifies credit cards by last 4 digits
 */

import { supabase } from '../../supabaseClient';

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
    .replace(/\b(de|da|do|em|no|na|para|com|por|o|a|os|as|ltda|me|sa|eireli|ss)\b/g, ' ')
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
 * @returns {number} Score de similaridade (0 a 1)
 */
const calculateSimilarity = (desc1, desc2) => {
  if (!desc1 || !desc2) return 0;
  
  // Match exato
  if (desc1 === desc2) return 1.0;

  // Uma descrição contém a outra completamente
  if (desc1.includes(desc2) || desc2.includes(desc1)) {
    const shorter = desc1.length < desc2.length ? desc1 : desc2;
    const longer = desc1.length >= desc2.length ? desc1 : desc2;
    return shorter.length / longer.length * 0.95;
  }

  const keywords1 = extractKeywords(desc1);
  const keywords2 = extractKeywords(desc2);
  
  if (keywords1.length === 0 || keywords2.length === 0) return 0;

  // Contar palavras em comum
  const commonWords = keywords1.filter(word => keywords2.includes(word));
  
  if (commonWords.length === 0) return 0;

  // Jaccard similarity
  const union = new Set([...keywords1, ...keywords2]);
  const jaccardScore = commonWords.length / union.size;

  // Overlap coefficient
  const minSize = Math.min(keywords1.length, keywords2.length);
  const overlapScore = commonWords.length / minSize;

  // Score final ponderado
  return (jaccardScore * 0.4) + (overlapScore * 0.6);
};

/**
 * Encontra o cartão correspondente pelos últimos 4 dígitos
 * @param {string} cardDigits - Últimos 4 dígitos do cartão
 * @param {Array} cards - Lista de cartões do usuário
 * @returns {Object|null} Cartão encontrado ou null
 */
export const matchCardByDigits = (cardDigits, cards = []) => {
  if (!cardDigits || !cards || cards.length === 0) {
    return null;
  }

  // Normalizar dígitos (remover espaços e não-numéricos, garantir 4 caracteres)
  const normalizedDigits = String(cardDigits).replace(/\D/g, '').slice(-4);
  
  // Validar que temos exatamente 4 dígitos
  if (normalizedDigits.length !== 4) {
    return null;
  }
  
  for (const card of cards) {
    // Verificar dígitos principais
    if (card.last_digits === normalizedDigits) {
      return {
        card,
        matchType: 'primary',
        confidence: 1.0
      };
    }
    
    // Verificar lista de dígitos adicionais
    if (card.last_digits_list && Array.isArray(card.last_digits_list)) {
      if (card.last_digits_list.includes(normalizedDigits)) {
        return {
          card,
          matchType: 'additional',
          confidence: 0.95
        };
      }
    }
  }

  return null;
};

/**
 * Busca transações similares no histórico do usuário
 * @param {string} userId - ID do usuário
 * @param {string} description - Descrição da transação
 * @param {number} limit - Limite de resultados
 * @returns {Promise<Array>} Lista de transações similares ordenadas por similaridade
 */
export const findSimilarTransactions = async (userId, description, limit = 50) => {
  if (!userId || !description || description.trim().length < 3) {
    return [];
  }

  try {
    // Buscar transações anteriores do usuário com dados completos
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, description, category, type, payment_method, account_id, card_id, created_at')
      .eq('user_id', userId)
      .not('category', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!transactions || transactions.length === 0) {
      return [];
    }

    const normalizedInput = normalizeDescription(description);
    const results = [];

    for (const transaction of transactions) {
      const normalizedDesc = normalizeDescription(transaction.description);
      const similarity = calculateSimilarity(normalizedInput, normalizedDesc);
      
      if (similarity > 0.4) {
        results.push({
          ...transaction,
          similarity,
          normalizedDescription: normalizedDesc
        });
      }
    }

    // Ordenar por similaridade (maior primeiro)
    return results.sort((a, b) => b.similarity - a.similarity);
  } catch (error) {
    console.error('Erro ao buscar transações similares:', error);
    return [];
  }
};

/**
 * Obtém a melhor transação correspondente do histórico
 * @param {string} userId - ID do usuário
 * @param {string} description - Descrição da transação
 * @returns {Promise<Object|null>} Melhor correspondência ou null
 */
export const getBestHistoricalMatch = async (userId, description) => {
  const similarTransactions = await findSimilarTransactions(userId, description, 100);
  
  if (similarTransactions.length === 0) {
    return null;
  }

  // Agrupar por categoria para encontrar a mais frequente
  const categoryFrequency = {};
  const paymentMethodFrequency = {};
  const cardFrequency = {};
  const accountFrequency = {};

  for (const t of similarTransactions) {
    // Ponderar por similaridade
    const weight = t.similarity;

    if (t.category) {
      categoryFrequency[t.category] = (categoryFrequency[t.category] || 0) + weight;
    }
    if (t.payment_method) {
      paymentMethodFrequency[t.payment_method] = (paymentMethodFrequency[t.payment_method] || 0) + weight;
    }
    if (t.card_id) {
      cardFrequency[t.card_id] = (cardFrequency[t.card_id] || 0) + weight;
    }
    if (t.account_id) {
      accountFrequency[t.account_id] = (accountFrequency[t.account_id] || 0) + weight;
    }
  }

  // Encontrar os mais frequentes
  const bestCategory = findBestMatch(categoryFrequency);
  const bestPaymentMethod = findBestMatch(paymentMethodFrequency);
  const bestCard = findBestMatch(cardFrequency);
  const bestAccount = findBestMatch(accountFrequency);

  // Calcular confiança geral baseada na melhor similaridade e frequência
  const topMatch = similarTransactions[0];
  const confidence = Math.min(topMatch.similarity * 1.1, 1.0); // Máximo 1.0

  return {
    categoryId: bestCategory?.key || null,
    categoryConfidence: bestCategory?.score || 0,
    paymentMethod: bestPaymentMethod?.key || null,
    paymentMethodConfidence: bestPaymentMethod?.score || 0,
    cardId: bestCard?.key || null,
    cardConfidence: bestCard?.score || 0,
    accountId: bestAccount?.key || null,
    accountConfidence: bestAccount?.score || 0,
    overallConfidence: confidence,
    matchCount: similarTransactions.length,
    topSimilarity: topMatch.similarity,
    source: 'history'
  };
};

/**
 * Encontra a chave com maior pontuação em um objeto de frequência
 * @param {Object} frequencyMap - Mapa de frequências
 * @returns {Object|null} Objeto com key e score
 */
const findBestMatch = (frequencyMap) => {
  if (!frequencyMap || Object.keys(frequencyMap).length === 0) {
    return null;
  }

  let bestKey = null;
  let bestScore = 0;
  let totalScore = 0;

  for (const [key, score] of Object.entries(frequencyMap)) {
    totalScore += score;
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  // Normalizar score como proporção do total
  const normalizedScore = totalScore > 0 ? bestScore / totalScore : 0;

  return {
    key: bestKey,
    score: normalizedScore
  };
};

/**
 * Enriquece uma transação com dados históricos e identificação de cartão
 * @param {Object} transaction - Transação a ser enriquecida
 * @param {string} userId - ID do usuário
 * @param {Array} cards - Lista de cartões do usuário
 * @param {Array} accounts - Lista de contas do usuário
 * @param {Array} categories - Categorias do usuário
 * @returns {Promise<Object>} Transação enriquecida
 */
export const enrichTransactionWithHistory = async (transaction, userId, cards = [], accounts = [], categories = []) => {
  let enrichedTransaction = { ...transaction };
  let matchInfo = {
    hasHistoricalMatch: false,
    cardMatchedByDigits: false,
    source: null
  };

  // 1. Tentar identificar cartão pelos últimos 4 dígitos (PRIORIDADE MÁXIMA)
  if (transaction.card_last_digits && transaction.payment_method === 'credit_card') {
    const cardMatch = matchCardByDigits(transaction.card_last_digits, cards);
    
    if (cardMatch) {
      enrichedTransaction.card_id = cardMatch.card.id;
      enrichedTransaction.cardMatchedByDigits = true;
      matchInfo.cardMatchedByDigits = true;
      matchInfo.cardMatchType = cardMatch.matchType;
      matchInfo.cardMatchConfidence = cardMatch.confidence;
      console.log(`💳 Cartão identificado pelos dígitos ${transaction.card_last_digits}: ${cardMatch.card.name}`);
    }
  }

  // 2. Buscar correspondência histórica pela descrição
  if (transaction.description && userId) {
    const historicalMatch = await getBestHistoricalMatch(userId, transaction.description);
    
    if (historicalMatch && historicalMatch.overallConfidence > 0.5) {
      matchInfo.hasHistoricalMatch = true;
      matchInfo.source = 'history';
      matchInfo.historicalConfidence = historicalMatch.overallConfidence;
      
      // Aplicar categoria do histórico SE não tiver categoria ou tiver baixa confiança
      if (!enrichedTransaction.categoryId || 
          (enrichedTransaction.aiConfidence && enrichedTransaction.aiConfidence < historicalMatch.categoryConfidence * 100)) {
        if (historicalMatch.categoryId && historicalMatch.categoryConfidence > 0.4) {
          enrichedTransaction.categoryId = historicalMatch.categoryId;
          enrichedTransaction.suggestionSource = 'history';
          enrichedTransaction.historyConfidence = historicalMatch.categoryConfidence;
          
          // Encontrar nome da categoria
          const category = categories.find(c => c.id === historicalMatch.categoryId);
          if (category) {
            enrichedTransaction.category = category.name;
          }
        }
      }
      
      // Aplicar método de pagamento do histórico SE não tiver
      if (!enrichedTransaction.payment_method && historicalMatch.paymentMethod && 
          historicalMatch.paymentMethodConfidence > 0.5) {
        enrichedTransaction.payment_method = historicalMatch.paymentMethod;
      }
      
      // Aplicar cartão do histórico SE for cartão de crédito e não foi identificado pelos dígitos
      if (enrichedTransaction.payment_method === 'credit_card' && 
          !enrichedTransaction.card_id && 
          historicalMatch.cardId && 
          historicalMatch.cardConfidence > 0.5) {
        // Verificar se o cartão ainda existe
        const cardExists = cards.find(c => c.id === historicalMatch.cardId);
        if (cardExists) {
          enrichedTransaction.card_id = historicalMatch.cardId;
          matchInfo.cardMatchType = 'history';
        }
      }
      
      // Aplicar conta do histórico SE não for cartão de crédito e não tiver conta
      if (enrichedTransaction.payment_method !== 'credit_card' && 
          !enrichedTransaction.account_id && 
          historicalMatch.accountId && 
          historicalMatch.accountConfidence > 0.5) {
        // Verificar se a conta ainda existe
        const accountExists = accounts.find(a => a.id === historicalMatch.accountId);
        if (accountExists) {
          enrichedTransaction.account_id = historicalMatch.accountId;
        }
      }
      
      console.log(`📊 Match histórico encontrado para "${transaction.description}" com ${(historicalMatch.overallConfidence * 100).toFixed(0)}% de confiança`);
    }
  }

  // Adicionar info de match à transação
  enrichedTransaction._matchInfo = matchInfo;
  
  return enrichedTransaction;
};

/**
 * Enriquece múltiplas transações com dados históricos
 * @param {Array} transactions - Lista de transações
 * @param {string} userId - ID do usuário
 * @param {Array} cards - Lista de cartões
 * @param {Array} accounts - Lista de contas
 * @param {Array} categories - Lista de categorias
 * @returns {Promise<Array>} Transações enriquecidas
 */
export const enrichTransactionsWithHistory = async (transactions, userId, cards = [], accounts = [], categories = []) => {
  if (!transactions || transactions.length === 0) {
    return transactions;
  }

  const enrichedTransactions = [];
  
  for (const transaction of transactions) {
    try {
      const enriched = await enrichTransactionWithHistory(
        transaction, 
        userId, 
        cards, 
        accounts,
        categories
      );
      enrichedTransactions.push(enriched);
    } catch (error) {
      console.error('Erro ao enriquecer transação:', error);
      enrichedTransactions.push(transaction);
    }
  }
  
  return enrichedTransactions;
};

export default {
  matchCardByDigits,
  findSimilarTransactions,
  getBestHistoricalMatch,
  enrichTransactionWithHistory,
  enrichTransactionsWithHistory
};
