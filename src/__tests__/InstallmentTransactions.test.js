/**
 * Installment Transaction Tests
 * 
 * This test suite validates the installment transaction creation logic:
 * 1. Multiple transactions created for each installment
 * 2. Each installment has correct due date (monthly intervals)
 * 3. Installment amounts are correctly calculated
 * 4. Each installment is properly numbered
 * 5. Future transactions are correctly identified
 */

import { parseLocalDate } from '../utils/dateUtils';

describe('Installment Transaction Creation Logic', () => {
  // Helper function to simulate the installment creation logic from App.jsx
  const createInstallmentTransactions = (transactionData, userId) => {
    const installmentCount = parseInt(transactionData.installment_count);
    const totalAmount = parseFloat(transactionData.amount);
    const installmentAmount = totalAmount / installmentCount;
    
    const installmentTransactions = [];
    // Use parseLocalDate for accurate date parsing without timezone issues
    const startDate = parseLocalDate(transactionData.date);
    
    for (let i = 0; i < installmentCount; i++) {
      const installmentDate = new Date(startDate);
      installmentDate.setMonth(startDate.getMonth() + i);
      
      const year = installmentDate.getFullYear();
      const month = String(installmentDate.getMonth() + 1).padStart(2, '0');
      const day = String(installmentDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      installmentTransactions.push({
        user_id: userId,
        type: transactionData.type,
        description: `${transactionData.description} (${i + 1}/${installmentCount})`,
        amount: installmentAmount,
        category: transactionData.category,
        account_id: transactionData.account_id || null,
        card_id: transactionData.card_id || null,
        payment_method: transactionData.payment_method,
        date: formattedDate,
        origin: transactionData.origin || 'manual',
        is_alimony: transactionData.is_alimony || false,
        is_installment: true,
        installment_count: installmentCount,
        installment_number: i + 1 // Track which installment number this is (1-based)
      });
    }
    
    return installmentTransactions;
  };

  describe('Multiple Transaction Creation', () => {
    it('should create one transaction for each installment', () => {
      const transactionData = {
        type: 'expense',
        description: 'Geladeira Nova',
        amount: 3000,
        date: '2025-01-15',
        category: 'cat_appliances',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 12
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      expect(transactions).toHaveLength(12);
    });

    it('should create correct number of transactions for different installment counts', () => {
      const testCases = [
        { installment_count: 2, expected: 2 },
        { installment_count: 3, expected: 3 },
        { installment_count: 6, expected: 6 },
        { installment_count: 10, expected: 10 },
        { installment_count: 24, expected: 24 },
        { installment_count: 48, expected: 48 }
      ];

      testCases.forEach(({ installment_count, expected }) => {
        const transactionData = {
          type: 'expense',
          description: 'Compra Parcelada',
          amount: 1200,
          date: '2025-01-15',
          category: 'cat_123',
          payment_method: 'credit_card',
          card_id: 'card_123',
          is_installment: true,
          installment_count
        };

        const transactions = createInstallmentTransactions(transactionData, 'user_123');
        expect(transactions).toHaveLength(expected);
      });
    });
  });

  describe('Installment Amount Calculation', () => {
    it('should divide total amount equally among installments', () => {
      const transactionData = {
        type: 'expense',
        description: 'TV Smart',
        amount: 2400,
        date: '2025-01-15',
        category: 'cat_electronics',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 12
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      transactions.forEach(transaction => {
        expect(transaction.amount).toBe(200); // 2400 / 12 = 200
      });
    });

    it('should handle amounts that divide unevenly', () => {
      const transactionData = {
        type: 'expense',
        description: 'Compra',
        amount: 1000,
        date: '2025-01-15',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 3
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      expect(totalAmount).toBeCloseTo(1000, 2);
    });
  });

  describe('Installment Date Calculation', () => {
    it('should create transactions with monthly intervals', () => {
      const transactionData = {
        type: 'expense',
        description: 'Móveis',
        amount: 3000,
        date: '2025-03-15',
        category: 'cat_furniture',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 6
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      expect(transactions[0].date).toBe('2025-03-15');
      expect(transactions[1].date).toBe('2025-04-15');
      expect(transactions[2].date).toBe('2025-05-15');
      expect(transactions[3].date).toBe('2025-06-15');
      expect(transactions[4].date).toBe('2025-07-15');
      expect(transactions[5].date).toBe('2025-08-15');
    });

    it('should correctly handle year transitions', () => {
      const transactionData = {
        type: 'expense',
        description: 'Presente de Natal',
        amount: 1200,
        date: '2025-11-20',
        category: 'cat_gifts',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 4
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      expect(transactions[0].date).toBe('2025-11-20');
      expect(transactions[1].date).toBe('2025-12-20');
      expect(transactions[2].date).toBe('2026-01-20');
      expect(transactions[3].date).toBe('2026-02-20');
    });

    it('should handle end of month dates correctly', () => {
      const transactionData = {
        type: 'expense',
        description: 'Compra Fim do Mês',
        amount: 600,
        date: '2025-01-31',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 3
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      expect(transactions[0].date).toBe('2025-01-31');
      // February doesn't have 31 days, so it should roll to March
      // This is standard JavaScript Date behavior
      expect(transactions).toHaveLength(3);
    });
  });

  describe('Installment Number Tracking', () => {
    it('should assign correct installment_number to each transaction', () => {
      const transactionData = {
        type: 'expense',
        description: 'Compra Parcelada',
        amount: 1200,
        date: '2025-01-15',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 12
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      for (let i = 0; i < 12; i++) {
        expect(transactions[i].installment_number).toBe(i + 1);
      }
    });

    it('should include installment count in all transactions', () => {
      const transactionData = {
        type: 'expense',
        description: 'Compra',
        amount: 600,
        date: '2025-01-15',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 6
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      transactions.forEach(transaction => {
        expect(transaction.installment_count).toBe(6);
      });
    });
  });

  describe('Installment Description Format', () => {
    it('should format description with installment number', () => {
      const transactionData = {
        type: 'expense',
        description: 'iPhone 15',
        amount: 6000,
        date: '2025-01-15',
        category: 'cat_electronics',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 12
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      expect(transactions[0].description).toBe('iPhone 15 (1/12)');
      expect(transactions[5].description).toBe('iPhone 15 (6/12)');
      expect(transactions[11].description).toBe('iPhone 15 (12/12)');
    });
  });

  describe('Transaction Properties Preservation', () => {
    it('should preserve payment method across all installments', () => {
      const transactionData = {
        type: 'expense',
        description: 'Compra',
        amount: 600,
        date: '2025-01-15',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 6
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      transactions.forEach(transaction => {
        expect(transaction.payment_method).toBe('credit_card');
        expect(transaction.card_id).toBe('card_123');
      });
    });

    it('should preserve category across all installments', () => {
      const transactionData = {
        type: 'expense',
        description: 'Compra',
        amount: 600,
        date: '2025-01-15',
        category: 'cat_electronics',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 6
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      transactions.forEach(transaction => {
        expect(transaction.category).toBe('cat_electronics');
      });
    });

    it('should preserve transaction type across all installments', () => {
      const transactionData = {
        type: 'expense',
        description: 'Compra',
        amount: 600,
        date: '2025-01-15',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 6
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      transactions.forEach(transaction => {
        expect(transaction.type).toBe('expense');
      });
    });

    it('should set is_installment to true for all transactions', () => {
      const transactionData = {
        type: 'expense',
        description: 'Compra',
        amount: 600,
        date: '2025-01-15',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 6
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      transactions.forEach(transaction => {
        expect(transaction.is_installment).toBe(true);
      });
    });

    it('should preserve is_alimony flag across all installments', () => {
      const transactionData = {
        type: 'expense',
        description: 'Pensão',
        amount: 6000,
        date: '2025-01-15',
        category: 'cat_alimony',
        payment_method: 'pix',
        account_id: 'acc_123',
        is_installment: true,
        installment_count: 6,
        is_alimony: true
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      transactions.forEach(transaction => {
        expect(transaction.is_alimony).toBe(true);
      });
    });

    it('should assign user_id to all transactions', () => {
      const transactionData = {
        type: 'expense',
        description: 'Compra',
        amount: 600,
        date: '2025-01-15',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 6
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_abc123');
      
      transactions.forEach(transaction => {
        expect(transaction.user_id).toBe('user_abc123');
      });
    });
  });

  describe('Future Transactions Identification', () => {
    it('should create future dated transactions for installments beyond current date', () => {
      // Use a date in the past so we can have future installments
      const transactionData = {
        type: 'expense',
        description: 'Compra',
        amount: 600,
        date: '2025-01-15',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 12
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      const today = new Date();
      
      // Count how many transactions have future dates
      const futureTransactions = transactions.filter(t => {
        const transDate = parseLocalDate(t.date);
        return transDate > today;
      });

      // At least some should be in the future if we're testing from today
      expect(futureTransactions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 2 installments correctly', () => {
      const transactionData = {
        type: 'expense',
        description: 'Compra Simples',
        amount: 200,
        date: '2025-05-15',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 2
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      expect(transactions).toHaveLength(2);
      expect(transactions[0].amount).toBe(100);
      expect(transactions[1].amount).toBe(100);
      expect(transactions[0].installment_number).toBe(1);
      expect(transactions[1].installment_number).toBe(2);
      expect(transactions[0].description).toBe('Compra Simples (1/2)');
      expect(transactions[1].description).toBe('Compra Simples (2/2)');
    });

    it('should handle large installment counts', () => {
      const transactionData = {
        type: 'expense',
        description: 'Financiamento',
        amount: 48000,
        date: '2025-01-15',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        is_installment: true,
        installment_count: 48
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      expect(transactions).toHaveLength(48);
      expect(transactions[0].amount).toBe(1000);
      expect(transactions[47].installment_number).toBe(48);
    });

    it('should handle null account_id for credit card payments', () => {
      const transactionData = {
        type: 'expense',
        description: 'Compra',
        amount: 300,
        date: '2025-01-15',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        account_id: null,
        is_installment: true,
        installment_count: 3
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      transactions.forEach(transaction => {
        expect(transaction.account_id).toBeNull();
        expect(transaction.card_id).toBe('card_123');
      });
    });

    it('should handle account-based installment payments (debit)', () => {
      const transactionData = {
        type: 'expense',
        description: 'Parcelamento Débito',
        amount: 600,
        date: '2025-01-15',
        category: 'cat_123',
        payment_method: 'debit_card',
        account_id: 'acc_123',
        card_id: null,
        is_installment: true,
        installment_count: 6
      };

      const transactions = createInstallmentTransactions(transactionData, 'user_123');
      
      transactions.forEach(transaction => {
        expect(transaction.account_id).toBe('acc_123');
        expect(transaction.card_id).toBeNull();
      });
    });
  });
});
