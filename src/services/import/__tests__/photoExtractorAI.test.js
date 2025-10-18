/**
 * @jest-environment jsdom
 */

import { extractFromPhotoWithAI } from '../photoExtractorAI';

// Mock fetch
global.fetch = jest.fn();

// Mock FileReader
global.FileReader = class {
  readAsDataURL(file) {
    // Simulate successful read with a fake base64 image
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
      this.onload();
    }, 0);
  }
};

describe('Photo Extractor AI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractFromPhotoWithAI', () => {
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const mockAIConfig = {
      provider: 'gemini',
      apiKey: 'test-api-key',
      model: 'gemini-2.5-flash',
      enabled: true
    };
    const mockCards = [
      { id: 'card1', last_digits: '1234', name: 'Cartão Teste 1' },
      { id: 'card2', last_digits: '5678', name: 'Cartão Teste 2' }
    ];

    const mockCategories = [
      { id: 'cat1', name: 'alimentacao', type: 'expense' },
      { id: 'cat2', name: 'transporte', type: 'expense' },
      { id: 'cat3', name: 'saude', type: 'expense' },
      { id: 'cat4', name: 'compras', type: 'expense' },
      { id: 'cat5', name: 'outros', type: 'expense' }
    ];

    it('deve lançar erro quando aiConfig não é fornecida', async () => {
      await expect(extractFromPhotoWithAI(mockFile, null, mockCards, mockCategories))
        .rejects.toThrow('Configuração de IA não fornecida');
    });

    it('deve lançar erro quando apiKey está faltando', async () => {
      const invalidConfig = { ...mockAIConfig, apiKey: null };
      await expect(extractFromPhotoWithAI(mockFile, invalidConfig, mockCards, mockCategories))
        .rejects.toThrow('Configuração de IA não fornecida');
    });

    it('deve extrair transação com sucesso usando Gemini', async () => {
      const mockResponse = {
        description: 'SUPERMERCADO XYZ',
        amount: 150.50,
        date: '2025-10-14',
        time: '14:30',
        type: 'expense',
        transaction_type: 'credit_card',
        category: 'alimentacao',
        card_last_digits: '1234',
        confidence: 95
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
      expect(result.description).toBe('SUPERMERCADO XYZ');
      expect(result.amount).toBe(150.50);
      expect(result.type).toBe('expense');
      expect(result.card_id).toBe('card1'); // Should match card with last_digits 1234
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.source).toBe('ai_vision');
    });

    it('deve extrair transação com sucesso usando OpenAI', async () => {
      const openAIConfig = { ...mockAIConfig, provider: 'openai' };
      const mockResponse = {
        description: 'LOJA ABC',
        amount: 250.00,
        date: '2025-10-14',
        type: 'expense',
        transaction_type: 'debit_card',
        category: 'compras',
        confidence: 90
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify(mockResponse)
            }
          }]
        })
      });

      const result = await extractFromPhotoWithAI(mockFile, openAIConfig, mockCards, mockCategories);

      expect(result).toBeDefined();
      expect(result.description).toBe('LOJA ABC');
      expect(result.amount).toBe(250.00);
    });

    it('deve extrair transação com sucesso usando Claude', async () => {
      const claudeConfig = { ...mockAIConfig, provider: 'claude' };
      const mockResponse = {
        description: 'RESTAURANTE DEF',
        amount: 89.90,
        date: '2025-10-14',
        type: 'expense',
        transaction_type: 'credit_card',
        category: 'alimentacao',
        confidence: 92
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify(mockResponse)
          }]
        })
      });

      const result = await extractFromPhotoWithAI(mockFile, claudeConfig, mockCards, mockCategories);

      expect(result).toBeDefined();
      expect(result.description).toBe('RESTAURANTE DEF');
      expect(result.amount).toBe(89.90);
    });

    it('deve lançar erro quando provedor é inválido', async () => {
      const invalidConfig = { ...mockAIConfig, provider: 'invalid-provider' };
      
      await expect(extractFromPhotoWithAI(mockFile, invalidConfig, mockCards, mockCategories))
        .rejects.toThrow('Provedor de IA não suportado');
    });

    it('deve lançar erro quando API retorna erro', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        json: async () => ({
          error: { message: 'Invalid API key' }
        })
      });

      await expect(extractFromPhotoWithAI(mockFile, mockAIConfig, mockCards, mockCategories))
        .rejects.toThrow();
    });

    it('deve validar campos obrigatórios e lançar erro se ausentes', async () => {
      const incompleteResponse = {
        description: 'LOJA',
        // missing amount
        date: '2025-10-14',
        // missing type
        confidence: 80
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(incompleteResponse)
              }]
            }
          }]
        })
      });

      await expect(extractFromPhotoWithAI(mockFile, mockAIConfig, mockCards, mockCategories))
        .rejects.toThrow('não conseguiu extrair todas as informações necessárias');
    });

    it('deve processar resposta com markdown code blocks', async () => {
      const mockResponse = {
        description: 'FARMACIA XYZ',
        amount: 45.00,
        date: '2025-10-14',
        type: 'expense',
        transaction_type: 'credit_card',
        category: 'saude',
        confidence: 88
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: '```json\n' + JSON.stringify(mockResponse) + '\n```'
              }]
            }
          }]
        })
      });

      const result = await extractFromPhotoWithAI(mockFile, mockAIConfig, mockCards, mockCategories);

      expect(result).toBeDefined();
      expect(result.description).toBe('FARMACIA XYZ');
    });

    it('deve converter valor string para número', async () => {
      const mockResponse = {
        description: 'POSTO GASOLINA',
        amount: 'R$ 180,50', // String format
        date: '2025-10-14',
        type: 'expense',
        transaction_type: 'debit_card',
        category: 'transporte',
        confidence: 91
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
      expect(result.amount).toBe(180.50);
      expect(typeof result.amount).toBe('number');
    });

    it('deve usar data atual quando data não é fornecida', async () => {
      const mockResponse = {
        description: 'LOJA SEM DATA',
        amount: 99.99,
        // date missing
        type: 'expense',
        transaction_type: 'credit_card',
        category: 'outros',
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

      const result = await extractFromPhotoWithAI(mockFile, mockAIConfig, mockCards, mockCategories);

      expect(result).toBeDefined();
      expect(result.date).toBeDefined();
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // ISO date format
    });
  });
});
