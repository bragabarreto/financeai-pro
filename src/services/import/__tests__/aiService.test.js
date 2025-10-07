/**
 * @jest-environment jsdom
 */

import {
  isAIAvailable,
  getAvailableProviders,
  getAIStatus,
  enhanceTransactionWithAI,
  enhanceTransactionsWithAI
} from '../aiService';

// Mock fetch
global.fetch = jest.fn();

describe('AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.REACT_APP_OPENAI_API_KEY;
    delete process.env.REACT_APP_GEMINI_API_KEY;
    delete process.env.REACT_APP_ANTHROPIC_API_KEY;
  });

  describe('isAIAvailable', () => {
    it('deve retornar false quando nenhuma API está configurada', () => {
      expect(isAIAvailable()).toBe(false);
    });

    it('deve retornar true quando pelo menos uma API está configurada', () => {
      process.env.REACT_APP_GEMINI_API_KEY = 'test-key';
      
      // Need to re-import to pick up new env vars
      jest.resetModules();
      const { isAIAvailable } = require('../aiService');
      
      expect(isAIAvailable()).toBe(true);
    });
  });

  describe('getAvailableProviders', () => {
    it('deve retornar array vazio quando nenhum provedor está configurado', () => {
      const providers = getAvailableProviders();
      expect(providers).toEqual([]);
    });
  });

  describe('getAIStatus', () => {
    it('deve retornar status correto dos provedores', () => {
      const status = getAIStatus();
      
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('providers');
      expect(status.providers).toHaveProperty('openai');
      expect(status.providers).toHaveProperty('gemini');
      expect(status.providers).toHaveProperty('anthropic');
    });

    it('deve mostrar provedores como desabilitados quando não configurados', () => {
      const status = getAIStatus();
      
      expect(status.available).toBe(false);
      expect(status.providers.openai.enabled).toBe(false);
      expect(status.providers.gemini.enabled).toBe(false);
      expect(status.providers.anthropic.enabled).toBe(false);
    });
  });

  describe('enhanceTransactionWithAI', () => {
    it('deve retornar transação inalterada quando AI não está disponível', async () => {
      const transaction = {
        description: 'SUPERMERCADO ABC',
        amount: 150,
        type: 'expense'
      };

      const result = await enhanceTransactionWithAI(transaction, []);
      expect(result).toEqual(transaction);
    });

    it('deve retornar transação inalterada em caso de erro da API', async () => {
      // Simulate AI being available but API failing
      process.env.REACT_APP_GEMINI_API_KEY = 'test-key';
      jest.resetModules();
      const { enhanceTransactionWithAI } = require('../aiService');

      global.fetch.mockRejectedValue(new Error('API Error'));

      const transaction = {
        description: 'SUPERMERCADO ABC',
        amount: 150,
        type: 'expense'
      };

      const result = await enhanceTransactionWithAI(transaction, []);
      expect(result).toEqual(transaction);
    });
  });

  describe('enhanceTransactionsWithAI', () => {
    it('deve retornar array inalterado quando AI não está disponível', async () => {
      const transactions = [
        { description: 'LOJA1', amount: 100, type: 'expense' },
        { description: 'LOJA2', amount: 200, type: 'expense' }
      ];

      const result = await enhanceTransactionsWithAI(transactions, []);
      expect(result).toEqual(transactions);
    });

    it('deve retornar array vazio para entrada vazia', async () => {
      const result = await enhanceTransactionsWithAI([], []);
      expect(result).toEqual([]);
    });

    it('deve retornar entrada inalterada para não-array', async () => {
      const result = await enhanceTransactionsWithAI(null, []);
      expect(result).toBeNull();
    });
  });
});
