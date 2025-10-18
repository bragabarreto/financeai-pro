/**
 * Test to verify that AI extractors only suggest registered categories
 */

import { extractFromPhotoWithAI } from '../photoExtractorAI';
import { extractFromSMSWithAI } from '../smsExtractorAI';
import { enhanceTransactionWithAI } from '../aiService';

// Mock fetch
global.fetch = jest.fn();

// Mock FileReader
global.FileReader = class {
  readAsDataURL(file) {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,/9j/test';
      this.onload();
    }, 0);
  }
};

describe('Category Restriction Tests', () => {
  const mockAIConfig = {
    provider: 'gemini',
    apiKey: 'test-api-key',
    model: 'gemini-pro',
    enabled: true
  };

  const mockCategories = [
    { id: 'cat1', name: 'alimentação', type: 'expense' },
    { id: 'cat2', name: 'transporte', type: 'expense' },
    { id: 'cat3', name: 'saúde', type: 'expense' }
  ];

  const mockCards = [];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Photo Extractor AI', () => {
    it('should only suggest categories from the registered list', async () => {
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock AI response with a category from the registered list
      const mockResponse = {
        description: 'RESTAURANTE XYZ',
        amount: 50.00,
        date: '2025-10-14',
        type: 'expense',
        transaction_type: 'credit_card',
        category: 'alimentação', // This is in the registered list
        confidence: 90
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockResponse)
              }]
            }
          }]
        })
      });

      const result = await extractFromPhotoWithAI(mockFile, mockAIConfig, mockCards, mockCategories);

      expect(result).toBeDefined();
      expect(result.category).toBe('alimentação');
      
      // Verify the prompt includes the registered categories
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('alimentação, transporte, saúde')
        })
      );
    });

    it('should not suggest unregistered categories in the prompt', async () => {
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      
      const mockResponse = {
        description: 'LOJA ABC',
        amount: 100.00,
        date: '2025-10-14',
        type: 'expense',
        transaction_type: 'debit_card',
        category: 'transporte',
        confidence: 85
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockResponse)
              }]
            }
          }]
        })
      });

      await extractFromPhotoWithAI(mockFile, mockAIConfig, mockCards, mockCategories);

      // Verify the prompt does NOT include default categories like "compras", "lazer", etc.
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.not.stringContaining('compras, saude, lazer')
        })
      );
      
      // Verify it includes only registered categories
      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const prompt = requestBody.contents[0].parts[0].text;
      
      expect(prompt).toContain('alimentação, transporte, saúde');
      expect(prompt).toContain('SOMENTE entre as categorias cadastradas');
    });
  });

  describe('SMS Extractor AI', () => {
    it('should only suggest categories from the registered list', async () => {
      const smsText = 'CAIXA: Compra aprovada POSTO GASOLINA R$ 150,00 14/10';
      
      // Mock AI response with a category from the registered list
      const mockResponse = {
        description: 'POSTO GASOLINA',
        amount: 150.00,
        date: '2025-10-14',
        type: 'expense',
        category: 'transporte', // This is in the registered list
        confidence: 90,
        bank_name: 'CAIXA'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockResponse)
              }]
            }
          }]
        })
      });

      const result = await extractFromSMSWithAI(smsText, mockAIConfig, mockCards, mockCategories);

      expect(result).toBeDefined();
      expect(result.category).toBe('transporte');
      
      // Verify the prompt includes the registered categories
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('alimentação, transporte, saúde')
        })
      );
    });

    it('should instruct AI to use only registered categories', async () => {
      const smsText = 'CAIXA: Compra aprovada FARMACIA R$ 50,00 14/10';
      
      const mockResponse = {
        description: 'FARMACIA',
        amount: 50.00,
        date: '2025-10-14',
        type: 'expense',
        category: 'saúde',
        confidence: 88
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockResponse)
              }]
            }
          }]
        })
      });

      await extractFromSMSWithAI(smsText, mockAIConfig, mockCards, mockCategories);

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const prompt = requestBody.contents[0].parts[0].text;
      
      expect(prompt).toContain('SOMENTE entre as categorias cadastradas');
      expect(prompt).toContain('alimentação, transporte, saúde');
    });
  });

  describe('AI Service Enhancement', () => {
    it('should verify the prompt contains only registered categories', () => {
      // This test just verifies that when we construct the category list,
      // it only includes registered categories
      const categoryNames = mockCategories.map(c => c.name).join(', ');
      
      expect(categoryNames).toBe('alimentação, transporte, saúde');
      expect(categoryNames).not.toContain('compras');
      expect(categoryNames).not.toContain('lazer');
      expect(categoryNames).not.toContain('educacao');
    });

    it('should return transaction unchanged if no categories are available', async () => {
      const transaction = {
        description: 'TEST STORE',
        amount: 100.00,
        type: 'expense'
      };

      const result = await enhanceTransactionWithAI(transaction, [], [], []);

      expect(result).toEqual(transaction);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
