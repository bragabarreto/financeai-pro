/**
 * Tests for file parser service
 */

import { validateFile } from '../fileParser';
import { parseAmount, parseDate } from '../aiExtractor';

describe('fileParser', () => {
  describe('parseAmount', () => {
    test('should parse Brazilian format (1.234,56)', () => {
      expect(parseAmount('1.234,56')).toBe(1234.56);
    });

    test('should parse US format (1,234.56)', () => {
      expect(parseAmount('1,234.56')).toBe(1234.56);
    });

    test('should parse simple numbers', () => {
      expect(parseAmount('1234.56')).toBe(1234.56);
      expect(parseAmount(1234.56)).toBe(1234.56);
    });

    test('should handle currency symbols', () => {
      expect(parseAmount('R$ 1.234,56')).toBe(1234.56);
      expect(parseAmount('$ 1,234.56')).toBe(1234.56);
    });

    test('should handle negative amounts', () => {
      expect(parseAmount('-1.234,56')).toBe(1234.56);
      expect(parseAmount('(1.234,56)')).toBe(1234.56);
    });

    test('should return 0 for invalid input', () => {
      expect(parseAmount('')).toBe(0);
      expect(parseAmount(null)).toBe(0);
      expect(parseAmount('invalid')).toBe(0);
    });
  });

  describe('parseDate', () => {
    test('should parse DD/MM/YYYY format', () => {
      expect(parseDate('25/12/2023')).toBe('2023-12-25');
      expect(parseDate('01/01/2024')).toBe('2024-01-01');
    });

    test('should parse DD-MM-YYYY format', () => {
      expect(parseDate('25-12-2023')).toBe('2023-12-25');
    });

    test('should parse YYYY-MM-DD format', () => {
      expect(parseDate('2023-12-25')).toBe('2023-12-25');
    });

    test('should handle short year format', () => {
      expect(parseDate('25/12/23')).toBe('2023-12-25');
    });

    test('should return null for invalid dates', () => {
      expect(parseDate('')).toBe(null);
      expect(parseDate(null)).toBe(null);
      expect(parseDate('invalid')).toBe(null);
    });
  });

  describe('validateFile', () => {
    test('should validate CSV files', () => {
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    test('should validate Excel files', () => {
      const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    test('should reject files that are too large', () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const file = new File([largeContent], 'large.csv', { type: 'text/csv' });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muito grande');
    });

    test('should reject unsupported file types', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('não suportado');
    });

    test('should reject null file', () => {
      const result = validateFile(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Nenhum arquivo');
    });
  });
});
