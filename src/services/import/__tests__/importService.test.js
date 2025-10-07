/**
 * Tests for SMS Extractor - New Patterns
 * Testing investment and salary patterns
 */

import { extractFromSMS, calculateSMSConfidence } from '../smsExtractor';

describe('SMS Extractor Service - New Patterns', () => {
  describe('extractFromSMS - Investment patterns', () => {
    it('should extract investment application transaction', () => {
      const sms = 'Aplicação de R$ 1.000,00 realizada com sucesso';
      const result = extractFromSMS(sms);

      expect(result).not.toBeNull();
      expect(result.type).toBe('investment');
      expect(result.payment_method).toBe('application');
      expect(result.amount).toBe(1000);
      expect(result.description).toContain('Aplicação');
    });

    it('should extract investment redemption transaction', () => {
      const sms = 'Resgate de R$ 500,00 processado';
      const result = extractFromSMS(sms);

      expect(result).not.toBeNull();
      expect(result.type).toBe('investment');
      expect(result.payment_method).toBe('redemption');
      expect(result.amount).toBe(500);
      expect(result.description).toContain('Resgate');
    });

    it('should extract salary transaction', () => {
      const sms = 'Crédito salarial de R$ 5.000,00';
      const result = extractFromSMS(sms);

      expect(result).not.toBeNull();
      expect(result.type).toBe('income');
      expect(result.payment_method).toBe('transfer');
      expect(result.amount).toBe(5000);
      expect(result.description).toBe('Salário');
    });
  });

  describe('calculateSMSConfidence - completeness', () => {
    it('should give high confidence for complete transaction', () => {
      const transaction = {
        amount: 100,
        description: 'Test transaction with good description',
        payment_method: 'credit_card',
        date: '2024-01-01',
        type: 'expense'
      };

      const confidence = calculateSMSConfidence(transaction);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should give lower confidence for minimal transaction', () => {
      const transaction = {
        amount: 50,
        type: 'expense'
      };

      const confidence = calculateSMSConfidence(transaction);
      expect(confidence).toBeLessThan(60);
    });
  });
});
