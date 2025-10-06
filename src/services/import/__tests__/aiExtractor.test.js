/**
 * Tests for AI extractor service
 */

import {
  parseAmount,
  parseDate,
  detectFieldMapping,
  detectTransactionType,
  categorizeTransaction,
  calculateConfidence,
  extractTransactions,
  validateTransactions,
  detectPaymentMethod
} from '../aiExtractor';

describe('aiExtractor', () => {
  describe('detectFieldMapping', () => {
    test('should detect date field', () => {
      const headers = ['Data', 'Descricao', 'Valor'];
      const mapping = detectFieldMapping(headers);
      expect(mapping.date).toBe('Data');
    });

    test('should detect amount field', () => {
      const headers = ['Data', 'Descricao', 'Valor'];
      const mapping = detectFieldMapping(headers);
      expect(mapping.amount).toBe('Valor');
    });

    test('should detect description field', () => {
      const headers = ['Data', 'Descricao', 'Valor'];
      const mapping = detectFieldMapping(headers);
      expect(mapping.description).toBe('Descricao');
    });

    test('should handle case-insensitive headers', () => {
      const headers = ['data', 'DESCRIÇÃO', 'valor'];
      const mapping = detectFieldMapping(headers);
      expect(mapping.date).toBe('data');
      expect(mapping.description).toBe('DESCRIÇÃO');
      expect(mapping.amount).toBe('valor');
    });
  });

  describe('detectTransactionType', () => {
    test('should detect expense from keyword', () => {
      expect(detectTransactionType('débito', 100)).toBe('expense');
      expect(detectTransactionType('saída', 100)).toBe('expense');
    });

    test('should detect income from keyword', () => {
      expect(detectTransactionType('crédito', 100)).toBe('income');
      expect(detectTransactionType('entrada', 100)).toBe('income');
    });

    test('should detect investment from keyword', () => {
      expect(detectTransactionType('investimento', 100)).toBe('investment');
      expect(detectTransactionType('aplicação', 100)).toBe('investment');
      expect(detectTransactionType('resgate', 100)).toBe('investment');
    });

    test('should detect investment when user is both beneficiary and depositor', () => {
      expect(detectTransactionType('', 100, 'João Silva', 'João Silva', 'João Silva')).toBe('investment');
    });

    test('should detect income when user is beneficiary', () => {
      expect(detectTransactionType('', 100, 'João Silva', 'Empresa X', 'João Silva')).toBe('income');
    });

    test('should detect type from amount sign', () => {
      expect(detectTransactionType('', -100)).toBe('expense');
      expect(detectTransactionType('', 100)).toBe('income');
    });
  });

  describe('categorizeTransaction', () => {
    test('should categorize food transactions', () => {
      expect(categorizeTransaction('RESTAURANTE ABC')).toBe('alimentacao');
      expect(categorizeTransaction('SUPERMERCADO XYZ')).toBe('alimentacao');
      expect(categorizeTransaction('IFOOD')).toBe('alimentacao');
    });

    test('should categorize transportation', () => {
      expect(categorizeTransaction('UBER TRIP')).toBe('transporte');
      expect(categorizeTransaction('POSTO GASOLINA')).toBe('transporte');
    });

    test('should categorize shopping', () => {
      expect(categorizeTransaction('MAGAZINE LUIZA')).toBe('compras');
      expect(categorizeTransaction('MERCADO LIVRE')).toBe('compras');
    });

    test('should categorize bills', () => {
      expect(categorizeTransaction('CONTA DE LUZ')).toBe('contas');
      expect(categorizeTransaction('INTERNET VIVO')).toBe('contas');
    });

    test('should categorize health', () => {
      expect(categorizeTransaction('FARMACIA DROGASIL')).toBe('saude');
      expect(categorizeTransaction('PLANO DE SAUDE')).toBe('saude');
    });

    test('should categorize salary', () => {
      expect(categorizeTransaction('PAGAMENTO SALARIO')).toBe('salario');
    });

    test('should default to others for unknown', () => {
      expect(categorizeTransaction('UNKNOWN TRANSACTION')).toBe('outros');
    });
  });

  describe('detectPaymentMethod', () => {
    test('should detect PIX from payment field', () => {
      expect(detectPaymentMethod('PIX', '', 'expense')).toBe('pix');
    });

    test('should detect credit card from payment field', () => {
      expect(detectPaymentMethod('Cartão de Crédito', '', 'expense')).toBe('credit_card');
    });

    test('should detect debit card from payment field', () => {
      expect(detectPaymentMethod('Cartão Débito', '', 'expense')).toBe('debit_card');
    });

    test('should detect transfer from payment field', () => {
      expect(detectPaymentMethod('TED', '', 'expense')).toBe('transfer');
      expect(detectPaymentMethod('Transferência', '', 'expense')).toBe('transfer');
    });

    test('should detect payment method from description', () => {
      expect(detectPaymentMethod('', 'Pagamento via PIX', 'expense')).toBe('pix');
      expect(detectPaymentMethod('', 'Compra no cartão de crédito', 'expense')).toBe('credit_card');
    });

    test('should return null for investment without explicit method', () => {
      expect(detectPaymentMethod('', 'Aplicação CDB', 'investment')).toBe(null);
    });

    test('should return null when unable to detect', () => {
      expect(detectPaymentMethod('', '', 'expense')).toBe(null);
    });
  });

  describe('calculateConfidence', () => {
    test('should give 100% for complete transaction', () => {
      const transaction = {
        date: '2024-01-15',
        amount: 100,
        description: 'Test transaction',
        type: 'expense',
        category: 'alimentacao',
        payment_method: 'credit_card'
      };
      expect(calculateConfidence(transaction)).toBe(100);
    });

    test('should give lower score for incomplete transaction', () => {
      const transaction = {
        date: '2024-01-15',
        amount: 100
      };
      const score = calculateConfidence(transaction);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(0);
    });

    test('should give 0% for empty transaction', () => {
      const transaction = {};
      expect(calculateConfidence(transaction)).toBe(0);
    });
  });

  describe('extractTransactions', () => {
    test('should extract transactions from data', () => {
      const data = [
        {
          Data: '15/01/2024',
          Descricao: 'RESTAURANTE ABC',
          Valor: '150,00'
        },
        {
          Data: '16/01/2024',
          Descricao: 'SUPERMERCADO XYZ',
          Valor: '250,00'
        }
      ];

      const transactions = extractTransactions(data);
      expect(transactions.length).toBe(2);
      expect(transactions[0].description).toBe('RESTAURANTE ABC');
      expect(transactions[0].amount).toBe(150);
      expect(transactions[1].description).toBe('SUPERMERCADO XYZ');
      expect(transactions[1].amount).toBe(250);
    });

    test('should filter out invalid transactions', () => {
      const data = [
        {
          Data: '15/01/2024',
          Descricao: 'VALID TRANSACTION',
          Valor: '150,00'
        },
        {
          Data: 'invalid',
          Descricao: 'INVALID DATE',
          Valor: '250,00'
        },
        {
          Data: '17/01/2024',
          Descricao: 'INVALID AMOUNT',
          Valor: '0'
        }
      ];

      const transactions = extractTransactions(data);
      expect(transactions.length).toBe(1);
      expect(transactions[0].description).toBe('VALID TRANSACTION');
    });
  });

  describe('validateTransactions', () => {
    test('should validate correct transactions', () => {
      const transactions = [
        {
          date: '2024-01-15',
          amount: 150,
          description: 'Test',
          confidence: 100
        }
      ];

      const result = validateTransactions(transactions);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should detect missing date', () => {
      const transactions = [
        {
          amount: 150,
          description: 'Test'
        }
      ];

      const result = validateTransactions(transactions);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('date');
    });

    test('should detect invalid amount', () => {
      const transactions = [
        {
          date: '2024-01-15',
          amount: 0,
          description: 'Test'
        }
      ];

      const result = validateTransactions(transactions);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('amount');
    });

    test('should warn about missing description', () => {
      const transactions = [
        {
          date: '2024-01-15',
          amount: 150,
          description: '',
          confidence: 60
        }
      ];

      const result = validateTransactions(transactions);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should warn about low confidence', () => {
      const transactions = [
        {
          date: '2024-01-15',
          amount: 150,
          description: 'Test',
          confidence: 30
        }
      ];

      const result = validateTransactions(transactions);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
