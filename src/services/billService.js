import { supabase } from '../supabaseClient';

/**
 * Serviço de Gerenciamento de Faturas de Cartão de Crédito
 * 
 * Este serviço gerencia o ciclo de vida das faturas de cartão de crédito,
 * incluindo cálculo automático de valores, períodos e status.
 */

/**
 * Calcula o período de uma fatura com base no dia de fechamento
 * @param {number} closingDay - Dia de fechamento do cartão (1-31)
 * @param {number} month - Mês de referência (1-12)
 * @param {number} year - Ano de referência
 * @returns {Object} Objeto com period_start, period_end, closing_date, due_date
 */
export const calculateBillPeriod = (closingDay, month, year, dueDay) => {
  // Período começa no dia seguinte ao fechamento do mês anterior
  const periodStart = new Date(year, month - 2, closingDay + 1);
  
  // Período termina no dia de fechamento do mês atual
  const periodEnd = new Date(year, month - 1, closingDay);
  
  // Data de fechamento é o mesmo dia que period_end
  const closingDate = new Date(periodEnd);
  
  // Data de vencimento é baseada no due_day do cartão
  const dueDate = new Date(year, month - 1, dueDay);
  
  // Se o dia de vencimento for menor que o dia de fechamento, vencimento é no mês seguinte
  if (dueDay <= closingDay) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  
  return {
    period_start: formatDate(periodStart),
    period_end: formatDate(periodEnd),
    closing_date: formatDate(closingDate),
    due_date: formatDate(dueDate)
  };
};

/**
 * Formata data para o formato YYYY-MM-DD
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calcula o total de transações para uma fatura específica
 * @param {string} cardId - ID do cartão
 * @param {string} periodStart - Data de início do período
 * @param {string} periodEnd - Data de fim do período
 * @param {string} userId - ID do usuário
 * @returns {Promise<number>} Total das transações
 */
export const calculateBillTotal = async (cardId, periodStart, periodEnd, userId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('card_id', cardId)
      .eq('user_id', userId)
      .gte('date', periodStart)
      .lte('date', periodEnd);
    
    if (error) throw error;
    
    // Somar despesas e subtrair receitas (créditos no cartão)
    const total = data.reduce((sum, transaction) => {
      if (transaction.type === 'expense') {
        return sum + parseFloat(transaction.amount);
      } else if (transaction.type === 'income') {
        return sum - parseFloat(transaction.amount);
      }
      return sum;
    }, 0);
    
    return Math.max(0, total); // Não permitir valores negativos
  } catch (error) {
    console.error('Erro ao calcular total da fatura:', error);
    return 0;
  }
};

/**
 * Cria ou atualiza uma fatura para um cartão específico
 * @param {string} cardId - ID do cartão
 * @param {number} month - Mês (1-12)
 * @param {number} year - Ano
 * @param {string} userId - ID do usuário
 * @param {Object} card - Dados do cartão (closing_day, due_day)
 * @returns {Promise<Object>} Fatura criada/atualizada
 */
export const createOrUpdateBill = async (cardId, month, year, userId, card) => {
  try {
    // Calcular período da fatura
    const period = calculateBillPeriod(card.closing_day, month, year, card.due_day);
    
    // Calcular total de transações no período
    const totalAmount = await calculateBillTotal(cardId, period.period_start, period.period_end, userId);
    
    // Verificar se a fatura já existe
    const { data: existingBill, error: fetchError } = await supabase
      .from('credit_card_bills')
      .select('*')
      .eq('card_id', cardId)
      .eq('month', month)
      .eq('year', year)
      .eq('user_id', userId)
      .single();
    
    // Determinar status da fatura
    const today = new Date();
    const dueDateObj = new Date(period.due_date);
    const closingDateObj = new Date(period.closing_date);
    
    let status = 'open';
    if (today > closingDateObj) {
      status = 'closed';
    }
    if (today > dueDateObj && totalAmount > 0) {
      status = 'overdue';
    }
    
    const billData = {
      card_id: cardId,
      user_id: userId,
      month,
      year,
      total_amount: totalAmount,
      paid_amount: existingBill?.paid_amount || 0,
      is_paid: existingBill?.is_paid || false,
      due_date: period.due_date,
      closing_date: period.closing_date,
      period_start: period.period_start,
      period_end: period.period_end,
      status: existingBill?.is_paid ? 'paid' : status
    };
    
    if (existingBill && !fetchError) {
      // Atualizar fatura existente
      const { data, error } = await supabase
        .from('credit_card_bills')
        .update(billData)
        .eq('id', existingBill.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      // Criar nova fatura
      const { data, error } = await supabase
        .from('credit_card_bills')
        .insert([billData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Erro ao criar/atualizar fatura:', error);
    throw error;
  }
};

/**
 * Gera faturas para todos os cartões do usuário
 * @param {Array} cards - Lista de cartões
 * @param {string} userId - ID do usuário
 * @param {number} monthsBack - Quantos meses para trás gerar (padrão: 3)
 * @param {number} monthsForward - Quantos meses para frente gerar (padrão: 1)
 * @returns {Promise<Array>} Lista de faturas geradas
 */
export const generateBillsForAllCards = async (cards, userId, monthsBack = 3, monthsForward = 1) => {
  try {
    const bills = [];
    const today = new Date();
    
    for (const card of cards) {
      if (!card.is_active || !card.closing_day || !card.due_day) {
        continue; // Pular cartões inativos ou sem configuração
      }
      
      // Gerar faturas para os últimos meses e próximo mês
      for (let i = -monthsBack; i <= monthsForward; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        
        const bill = await createOrUpdateBill(card.id, month, year, userId, card);
        bills.push(bill);
      }
    }
    
    return bills;
  } catch (error) {
    console.error('Erro ao gerar faturas:', error);
    throw error;
  }
};

/**
 * Obtém todas as faturas de um usuário
 * @param {string} userId - ID do usuário
 * @param {string} status - Filtrar por status (opcional)
 * @returns {Promise<Array>} Lista de faturas
 */
export const getUserBills = async (userId, status = null) => {
  try {
    let query = supabase
      .from('credit_card_bills')
      .select(`
        *,
        credit_cards (
          name,
          brand,
          last_digits,
          color
        )
      `)
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar faturas:', error);
    return [];
  }
};

/**
 * Marca uma fatura como paga
 * @param {string} billId - ID da fatura
 * @param {number} paidAmount - Valor pago
 * @returns {Promise<Object>} Fatura atualizada
 */
export const markBillAsPaid = async (billId, paidAmount) => {
  try {
    const { data, error } = await supabase
      .from('credit_card_bills')
      .update({
        paid_amount: paidAmount,
        is_paid: true,
        status: 'paid'
      })
      .eq('id', billId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao marcar fatura como paga:', error);
    throw error;
  }
};

/**
 * Obtém transações de uma fatura específica
 * @param {string} cardId - ID do cartão
 * @param {string} periodStart - Data de início
 * @param {string} periodEnd - Data de fim
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>} Lista de transações
 */
export const getBillTransactions = async (cardId, periodStart, periodEnd, userId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('card_id', cardId)
      .eq('user_id', userId)
      .gte('date', periodStart)
      .lte('date', periodEnd)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar transações da fatura:', error);
    return [];
  }
};

