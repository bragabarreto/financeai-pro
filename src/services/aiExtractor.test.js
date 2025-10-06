/**
 * @jest-environment jsdom
 */

import { 
  extractTransactionsFromFile, 
  categorizeTransactions,
  fetchUserCategories 
} from './aiExtractor';
import { supabase } from '../supabaseClient';

// Mock do Supabase
jest.mock('../supabaseClient', () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe('aiExtractor Service', () => {
  describe('extractTransactionsFromFile', () => {
    it('deve extrair transações de um CSV válido', () => {
      const csvContent = `Data,Descrição,Valor,Tipo
01/01/2024,Supermercado ABC,150.50,despesa
02/01/2024,Salário,3000.00,receita`;

      const transactions = extractTransactionsFromFile(csvContent, 'csv');

      expect(transactions).toHaveLength(2);
      expect(transactions[0]).toMatchObject({
        description: 'Supermercado ABC',
        amount: 150.50,
        type: 'expense',
        origin: 'import'
      });
      expect(transactions[1]).toMatchObject({
        description: 'Salário',
        amount: 3000.00,
        type: 'income',
        origin: 'import'
      });
    });

    it('deve retornar array vazio para CSV inválido', () => {
      const csvContent = '';
      const transactions = extractTransactionsFromFile(csvContent, 'csv');
      expect(transactions).toEqual([]);
    });

    it('deve ignorar linhas inválidas no CSV', () => {
      const csvContent = `Data,Descrição,Valor,Tipo
01/01/2024,Supermercado ABC,150.50,despesa
,,0,
02/01/2024,Salário,3000.00,receita`;

      const transactions = extractTransactionsFromFile(csvContent, 'csv');
      expect(transactions).toHaveLength(2);
    });

    it('deve parsear diferentes formatos de data', () => {
      const csvContent = `Data,Descrição,Valor,Tipo
2024-01-01,Item 1,100.00,despesa
01-01-2024,Item 2,200.00,despesa`;

      const transactions = extractTransactionsFromFile(csvContent, 'csv');
      
      expect(transactions[0].date).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(transactions[1].date).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('fetchUserCategories', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('deve buscar e agrupar categorias por tipo', async () => {
      const mockCategories = [
        { id: '1', name: 'Alimentação', type: 'expense', user_id: 'user123' },
        { id: '2', name: 'Salário', type: 'income', user_id: 'user123' },
        { id: '3', name: 'Ações', type: 'investment', user_id: 'user123' }
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: mockCategories, error: null });

      supabase.from = jest.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq
      });

      mockSelect.mockReturnValue({
        eq: mockEq
      });

      const result = await fetchUserCategories('user123');

      expect(supabase.from).toHaveBeenCalledWith('categories');
      expect(result).toHaveProperty('expense');
      expect(result).toHaveProperty('income');
      expect(result).toHaveProperty('investment');
      expect(result.expense).toHaveLength(1);
      expect(result.income).toHaveLength(1);
      expect(result.investment).toHaveLength(1);
    });

    it('deve retornar estrutura vazia em caso de erro', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      supabase.from = jest.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq
      });

      mockSelect.mockReturnValue({
        eq: mockEq
      });

      const result = await fetchUserCategories('user123');

      expect(result).toEqual({
        expense: [],
        income: [],
        investment: []
      });
    });
  });

  describe('categorizeTransactions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('deve sugerir categorias para transações baseado em palavras-chave', async () => {
      const mockCategories = [
        { id: '1', name: 'Alimentação', type: 'expense' },
        { id: '2', name: 'Transporte', type: 'expense' }
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: mockCategories, error: null });

      supabase.from = jest.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq
      });

      mockSelect.mockReturnValue({
        eq: mockEq
      });

      const transactions = [
        { description: 'Uber para o trabalho', amount: 25, type: 'expense' },
        { description: 'Supermercado Extra', amount: 150, type: 'expense' }
      ];

      const result = await categorizeTransactions(transactions, 'user123');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('suggestedCategory');
      expect(result[0]).toHaveProperty('categoryConfidence');
      expect(result[0]).toHaveProperty('isSuggestion', true);
    });

    it('deve retornar null para categoria quando não há correspondência', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: [], error: null });

      supabase.from = jest.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq
      });

      mockSelect.mockReturnValue({
        eq: mockEq
      });

      const transactions = [
        { description: 'Compra desconhecida', amount: 100, type: 'expense' }
      ];

      const result = await categorizeTransactions(transactions, 'user123');

      expect(result[0].suggestedCategory).toBeNull();
      expect(result[0].category).toBeNull();
      expect(result[0].categoryConfidence).toBe(0);
    });

    it('deve calcular score de confiança correto', async () => {
      const mockCategories = [
        { id: '1', name: 'Alimentação', type: 'expense' }
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: mockCategories, error: null });

      supabase.from = jest.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq
      });

      mockSelect.mockReturnValue({
        eq: mockEq
      });

      const transactions = [
        { description: 'Despesa com alimentação no restaurante', amount: 50, type: 'expense' }
      ];

      const result = await categorizeTransactions(transactions, 'user123');

      expect(result[0].categoryConfidence).toBeGreaterThan(0);
      expect(result[0].categoryConfidence).toBeLessThanOrEqual(1);
    });
  });
});
