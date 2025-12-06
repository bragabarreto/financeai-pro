/**
 * Tests for transactionMatcher service
 */

import { matchCardByDigits } from '../transactionMatcher';

describe('Transaction Matcher', () => {
  describe('matchCardByDigits', () => {
    const mockCards = [
      { 
        id: 'card1', 
        name: 'Cartão Nubank', 
        last_digits: '1234',
        last_digits_list: ['5678', '9012']
      },
      { 
        id: 'card2', 
        name: 'Cartão Inter', 
        last_digits: '4567' 
      },
      { 
        id: 'card3', 
        name: 'Cartão Itaú', 
        last_digits: '8901',
        last_digits_list: ['3456']
      }
    ];

    it('should match card by primary last_digits', () => {
      const result = matchCardByDigits('1234', mockCards);
      
      expect(result).not.toBeNull();
      expect(result.card.id).toBe('card1');
      expect(result.card.name).toBe('Cartão Nubank');
      expect(result.matchType).toBe('primary');
      expect(result.confidence).toBe(1.0);
    });

    it('should match card by last_digits_list', () => {
      const result = matchCardByDigits('5678', mockCards);
      
      expect(result).not.toBeNull();
      expect(result.card.id).toBe('card1');
      expect(result.matchType).toBe('additional');
      expect(result.confidence).toBe(0.95);
    });

    it('should match card by last_digits_list (second card)', () => {
      const result = matchCardByDigits('3456', mockCards);
      
      expect(result).not.toBeNull();
      expect(result.card.id).toBe('card3');
      expect(result.matchType).toBe('additional');
    });

    it('should return null for non-existent digits', () => {
      const result = matchCardByDigits('0000', mockCards);
      
      expect(result).toBeNull();
    });

    it('should return null for empty digits', () => {
      const result = matchCardByDigits('', mockCards);
      
      expect(result).toBeNull();
    });

    it('should return null for null digits', () => {
      const result = matchCardByDigits(null, mockCards);
      
      expect(result).toBeNull();
    });

    it('should return null for empty cards array', () => {
      const result = matchCardByDigits('1234', []);
      
      expect(result).toBeNull();
    });

    it('should normalize digits with spaces', () => {
      const result = matchCardByDigits(' 1234 ', mockCards);
      
      // The function should still match after normalization
      expect(result).not.toBeNull();
      expect(result.card.id).toBe('card1');
    });

    it('should handle cards without last_digits_list', () => {
      const result = matchCardByDigits('4567', mockCards);
      
      expect(result).not.toBeNull();
      expect(result.card.id).toBe('card2');
      expect(result.matchType).toBe('primary');
    });
  });
});
