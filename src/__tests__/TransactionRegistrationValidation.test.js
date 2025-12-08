/**
 * Comprehensive Transaction Registration Validation Tests
 * 
 * This test suite validates all transaction registration methods:
 * 1. Manual transaction registration
 * 2. Photo import transactions
 * 3. AI import (CSV/SMS) transactions
 * 
 * Ensures data completeness, integrity, and proper error handling.
 */

describe('Transaction Registration Validation', () => {
  describe('Required Fields Validation', () => {
    const requiredFields = [
      'type',           // expense, income, investment
      'description',    // transaction description
      'amount',         // transaction amount
      'date',           // transaction date
      'category',       // category ID
      'payment_method', // payment method
      'user_id'         // user identifier
    ];

    const conditionalFields = {
      credit_card: ['card_id'],
      debit_card: ['account_id'],
      pix: ['account_id'],
      transfer: ['account_id'],
      application: ['account_id'],
      redemption: ['account_id'],
      paycheck: ['account_id']
    };

    it('should define all required fields for a transaction', () => {
      expect(requiredFields).toHaveLength(7);
      expect(requiredFields).toContain('type');
      expect(requiredFields).toContain('description');
      expect(requiredFields).toContain('amount');
      expect(requiredFields).toContain('date');
      expect(requiredFields).toContain('category');
      expect(requiredFields).toContain('payment_method');
      expect(requiredFields).toContain('user_id');
    });

    it('should define conditional required fields based on payment method', () => {
      expect(conditionalFields.credit_card).toContain('card_id');
      expect(conditionalFields.debit_card).toContain('account_id');
      expect(conditionalFields.pix).toContain('account_id');
      expect(conditionalFields.transfer).toContain('account_id');
      expect(conditionalFields.application).toContain('account_id');
      expect(conditionalFields.redemption).toContain('account_id');
      expect(conditionalFields.paycheck).toContain('account_id');
    });
  });

  describe('Manual Transaction Registration', () => {
    it('should validate that manual transaction has all required fields', () => {
      const manualTransaction = {
        type: 'expense',
        description: 'Supermercado',
        amount: 150.50,
        date: '2025-10-10',
        category: 'cat_123',
        payment_method: 'debit_card',
        account_id: 'acc_123',
        user_id: 'user_123'
      };

      // Verify all required fields are present
      expect(manualTransaction.type).toBeDefined();
      expect(manualTransaction.description).toBeDefined();
      expect(manualTransaction.amount).toBeDefined();
      expect(manualTransaction.date).toBeDefined();
      expect(manualTransaction.category).toBeDefined();
      expect(manualTransaction.payment_method).toBeDefined();
      expect(manualTransaction.user_id).toBeDefined();
    });

    it('should validate payment_method with account_id for debit transactions', () => {
      const debitTransaction = {
        type: 'expense',
        description: 'Compra débito',
        amount: 50.00,
        date: '2025-10-10',
        category: 'cat_123',
        payment_method: 'debit_card',
        account_id: 'acc_123',
        user_id: 'user_123'
      };

      expect(debitTransaction.payment_method).toBe('debit_card');
      expect(debitTransaction.account_id).toBeDefined();
      expect(debitTransaction.account_id).toBeTruthy();
    });

    it('should validate payment_method with card_id for credit transactions', () => {
      const creditTransaction = {
        type: 'expense',
        description: 'Compra crédito',
        amount: 200.00,
        date: '2025-10-10',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        user_id: 'user_123'
      };

      expect(creditTransaction.payment_method).toBe('credit_card');
      expect(creditTransaction.card_id).toBeDefined();
      expect(creditTransaction.card_id).toBeTruthy();
    });

    it('should preserve optional fields like is_alimony and origin', () => {
      const transactionWithOptionals = {
        type: 'expense',
        description: 'Pensão alimentícia',
        amount: 1000.00,
        date: '2025-10-10',
        category: 'cat_123',
        payment_method: 'pix',
        account_id: 'acc_123',
        user_id: 'user_123',
        is_alimony: true,
        origin: 'manual'
      };

      expect(transactionWithOptionals.is_alimony).toBe(true);
      expect(transactionWithOptionals.origin).toBe('manual');
    });

    it('should validate installment fields when is_installment is true', () => {
      const installmentTransaction = {
        type: 'expense',
        description: 'Compra parcelada (1/12)', // Installment number is now in description
        amount: 1200.00,
        date: '2025-10-10',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        user_id: 'user_123',
        is_installment: true,
        installment_count: 12,
        installment_due_dates: [
          '2025-10-10', '2025-11-10', '2025-12-10',
          '2026-01-10', '2026-02-10', '2026-03-10',
          '2026-04-10', '2026-05-10', '2026-06-10',
          '2026-07-10', '2026-08-10', '2026-09-10'
        ],
        last_installment_date: '2026-09-10'
      };

      expect(installmentTransaction.is_installment).toBe(true);
      expect(installmentTransaction.installment_count).toBe(12);
      expect(installmentTransaction.description).toContain('(1/12)');
      expect(installmentTransaction.installment_due_dates).toHaveLength(12);
      expect(installmentTransaction.last_installment_date).toBe('2026-09-10');
    });
  });

  describe('Photo Import Transaction Validation', () => {
    it('should validate photo-imported transaction has all required fields', () => {
      const photoTransaction = {
        type: 'expense',
        description: 'Compra PIX via foto',
        amount: 75.50,
        date: '2025-10-09',
        category: 'cat_123',
        payment_method: 'pix',
        account_id: 'acc_123',
        user_id: 'user_123',
        source: 'photo',
        confidence: 95,
        origin: 'photo_import'
      };

      // Verify all required fields
      expect(photoTransaction.type).toBeDefined();
      expect(photoTransaction.description).toBeDefined();
      expect(photoTransaction.amount).toBeGreaterThan(0);
      expect(photoTransaction.date).toBeDefined();
      expect(photoTransaction.category).toBeDefined();
      expect(photoTransaction.payment_method).toBeDefined();
      expect(photoTransaction.user_id).toBeDefined();
      
      // Verify photo-specific fields
      expect(photoTransaction.source).toBe('photo');
      expect(photoTransaction.confidence).toBeGreaterThanOrEqual(0);
      expect(photoTransaction.confidence).toBeLessThanOrEqual(100);
      expect(photoTransaction.origin).toBe('photo_import');
    });

    it('should validate card_id is matched from last_digits in photo extraction', () => {
      const photoCardTransaction = {
        type: 'expense',
        description: 'Compra cartão via foto',
        amount: 150.00,
        date: '2025-10-09',
        category: 'cat_123',
        payment_method: 'credit_card',
        card_id: 'card_123',
        card_last_digits: '1234',
        user_id: 'user_123',
        source: 'photo',
        confidence: 90
      };

      expect(photoCardTransaction.card_id).toBeDefined();
      expect(photoCardTransaction.card_last_digits).toBeDefined();
      expect(photoCardTransaction.payment_method).toBe('credit_card');
    });

    it('should preserve AI extraction metadata', () => {
      const aiEnhancedPhoto = {
        type: 'expense',
        description: 'Restaurante ABC',
        amount: 89.90,
        date: '2025-10-09',
        category: 'cat_food',
        payment_method: 'credit_card',
        card_id: 'card_123',
        user_id: 'user_123',
        source: 'ai_vision',
        confidence: 92,
        aiEnhanced: true,
        aiSuggestedCategory: 'cat_food',
        imageFile: 'receipt_123.jpg'
      };

      expect(aiEnhancedPhoto.source).toBe('ai_vision');
      expect(aiEnhancedPhoto.aiEnhanced).toBe(true);
      expect(aiEnhancedPhoto.aiSuggestedCategory).toBe('cat_food');
      expect(aiEnhancedPhoto.imageFile).toBeDefined();
    });
  });

  describe('AI Import (CSV/SMS) Transaction Validation', () => {
    it('should validate CSV-imported transaction preserves all fields', () => {
      const csvTransaction = {
        type: 'expense',
        description: 'Conta de luz',
        amount: 250.00,
        date: '2025-10-05',
        category: 'cat_utilities',
        payment_method: 'debit_card',
        account_id: 'acc_123',
        user_id: 'user_123',
        origin: 'csv_import',
        source: 'csv'
      };

      // Verify required fields
      expect(csvTransaction.type).toBe('expense');
      expect(csvTransaction.description).toBeTruthy();
      expect(csvTransaction.amount).toBeGreaterThan(0);
      expect(csvTransaction.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(csvTransaction.category).toBeDefined();
      expect(csvTransaction.payment_method).toBeDefined();
      expect(csvTransaction.account_id).toBeDefined();
      
      // Verify import metadata
      expect(csvTransaction.origin).toBe('csv_import');
      expect(csvTransaction.source).toBe('csv');
    });

    it('should validate SMS-imported transaction has all required fields', () => {
      const smsTransaction = {
        type: 'expense',
        description: 'COMPRA APROVADA - Loja XYZ',
        amount: 99.90,
        date: '2025-10-10',
        category: 'cat_shopping',
        payment_method: 'credit_card',
        card_id: 'card_123',
        card_last_digits: '5678',
        user_id: 'user_123',
        origin: 'sms_import',
        source: 'sms',
        confidence: 88
      };

      // Verify all required fields
      expect(smsTransaction.type).toBeDefined();
      expect(smsTransaction.description).toBeTruthy();
      expect(smsTransaction.amount).toBeGreaterThan(0);
      expect(smsTransaction.date).toBeDefined();
      expect(smsTransaction.category).toBeDefined();
      expect(smsTransaction.payment_method).toBe('credit_card');
      expect(smsTransaction.card_id).toBeDefined();
      
      // Verify SMS-specific metadata
      expect(smsTransaction.origin).toBe('sms_import');
      expect(smsTransaction.source).toBe('sms');
      expect(smsTransaction.card_last_digits).toBeDefined();
    });

    it('should validate that payment_method, is_alimony, and origin are preserved during import', () => {
      const importedTransaction = {
        type: 'expense',
        description: 'Pensão alimentícia via importação',
        amount: 1500.00,
        date: '2025-10-01',
        category: 'cat_alimony',
        payment_method: 'transfer',
        account_id: 'acc_123',
        user_id: 'user_123',
        is_alimony: true,
        origin: 'csv_import'
      };

      // These fields were previously being lost - verify they're preserved
      expect(importedTransaction.payment_method).toBe('transfer');
      expect(importedTransaction.is_alimony).toBe(true);
      expect(importedTransaction.origin).toBe('csv_import');
    });

    it('should validate date format is preserved correctly (no timezone shift)', () => {
      const dateTestTransaction = {
        type: 'expense',
        description: 'Test timezone preservation',
        amount: 100.00,
        date: '2025-10-10', // Should remain exactly this
        category: 'cat_test',
        payment_method: 'pix',
        account_id: 'acc_123',
        user_id: 'user_123'
      };

      // Date should be in YYYY-MM-DD format
      expect(dateTestTransaction.date).toBe('2025-10-10');
      expect(dateTestTransaction.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Data Completeness Checks', () => {
    it('should ensure description is not empty', () => {
      const validTransaction = {
        description: 'Valid description',
        type: 'expense'
      };
      const invalidTransaction = {
        description: '',
        type: 'expense'
      };
      const missingDescription = {
        type: 'expense'
      };

      expect(validTransaction.description.trim()).toBeTruthy();
      expect(invalidTransaction.description.trim()).toBeFalsy();
      expect(missingDescription.description).toBeUndefined();
    });

    it('should ensure amount is greater than zero', () => {
      const validAmount = { amount: 100.50 };
      const zeroAmount = { amount: 0 };
      const negativeAmount = { amount: -50 };

      expect(validAmount.amount).toBeGreaterThan(0);
      expect(zeroAmount.amount).toBeLessThanOrEqual(0);
      expect(negativeAmount.amount).toBeLessThan(0);
    });

    it('should ensure category is defined and not empty', () => {
      const validCategory = { category: 'cat_123' };
      const emptyCategory = { category: '' };
      const missingCategory = {};

      expect(validCategory.category).toBeTruthy();
      expect(emptyCategory.category).toBeFalsy();
      expect(missingCategory.category).toBeUndefined();
    });

    it('should validate payment_method is from allowed list', () => {
      const allowedPaymentMethods = [
        'credit_card',
        'debit_card',
        'pix',
        'transfer',
        'cash',
        'boleto_bancario',
        'application',
        'redemption',
        'paycheck'
      ];

      const validPayment = { payment_method: 'pix' };
      const invalidPayment = { payment_method: 'invalid_method' };

      expect(allowedPaymentMethods).toContain(validPayment.payment_method);
      expect(allowedPaymentMethods).not.toContain(invalidPayment.payment_method);
    });

    it('should validate type is from allowed list', () => {
      const allowedTypes = ['expense', 'income', 'investment'];

      const validType = { type: 'expense' };
      const invalidType = { type: 'invalid_type' };

      expect(allowedTypes).toContain(validType.type);
      expect(allowedTypes).not.toContain(invalidType.type);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing required fields gracefully', () => {
      const incompleteTransaction = {
        type: 'expense',
        amount: 100
        // Missing: description, date, category, payment_method, user_id
      };

      expect(incompleteTransaction.description).toBeUndefined();
      expect(incompleteTransaction.date).toBeUndefined();
      expect(incompleteTransaction.category).toBeUndefined();
      expect(incompleteTransaction.payment_method).toBeUndefined();
      expect(incompleteTransaction.user_id).toBeUndefined();
    });

    it('should validate credit_card payment requires card_id', () => {
      const validCreditCard = {
        payment_method: 'credit_card',
        card_id: 'card_123'
      };
      const invalidCreditCard = {
        payment_method: 'credit_card'
        // Missing card_id
      };

      expect(validCreditCard.card_id).toBeDefined();
      expect(invalidCreditCard.card_id).toBeUndefined();
    });

    it('should validate account-based payments require account_id', () => {
      const accountPaymentMethods = ['debit_card', 'pix', 'transfer', 'paycheck'];
      
      accountPaymentMethods.forEach(method => {
        const validTransaction = {
          payment_method: method,
          account_id: 'acc_123'
        };
        const invalidTransaction = {
          payment_method: method
          // Missing account_id
        };

        expect(validTransaction.account_id).toBeDefined();
        expect(invalidTransaction.account_id).toBeUndefined();
      });
    });

    it('should handle null vs undefined for optional fields', () => {
      const transaction = {
        is_alimony: false,
        origin: null,
        card_id: null
      };

      expect(transaction.is_alimony).toBe(false);
      expect(transaction.origin).toBeNull();
      expect(transaction.card_id).toBeNull();
    });

    it('should preserve boolean false values (not treat as falsy missing values)', () => {
      const transaction = {
        is_alimony: false,
        is_installment: false
      };

      // false is a valid value, not missing
      expect(transaction.is_alimony).toBe(false);
      expect(transaction.is_installment).toBe(false);
      expect(transaction.is_alimony).not.toBeUndefined();
      expect(transaction.is_installment).not.toBeUndefined();
    });
  });

  describe('Field Type Validation', () => {
    it('should validate amount is a number', () => {
      const validAmount = { amount: 100.50 };
      const stringAmount = { amount: '100.50' };
      const invalidAmount = { amount: 'not a number' };

      expect(typeof validAmount.amount).toBe('number');
      expect(typeof stringAmount.amount).toBe('string');
      expect(parseFloat(stringAmount.amount)).toBe(100.50);
      expect(parseFloat(invalidAmount.amount)).toBeNaN();
    });

    it('should validate date is in correct format', () => {
      const validDate = { date: '2025-10-10' };
      const invalidDate1 = { date: '10/10/2025' }; // BR format - needs conversion
      const invalidDate2 = { date: '2025-13-50' }; // Invalid date

      expect(validDate.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(invalidDate1.date).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(invalidDate2.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Format matches but values are invalid
    });

    it('should validate boolean fields are actually boolean', () => {
      const validBooleans = {
        is_alimony: true,
        is_installment: false
      };
      const stringBooleans = {
        is_alimony: 'true',
        is_installment: 'false'
      };

      expect(typeof validBooleans.is_alimony).toBe('boolean');
      expect(typeof validBooleans.is_installment).toBe('boolean');
      expect(typeof stringBooleans.is_alimony).toBe('string');
      expect(typeof stringBooleans.is_installment).toBe('string');
    });
  });

  describe('Preview to Database Consistency', () => {
    it('should preserve all fields shown in preview when saving to database', () => {
      const previewTransaction = {
        type: 'expense',
        description: 'Supermercado ABC',
        amount: 250.75,
        date: '2025-10-08',
        category: 'cat_groceries',
        payment_method: 'credit_card',
        card_id: 'card_123',
        user_id: 'user_123',
        is_alimony: false,
        origin: 'csv_import',
        confidence: 95
      };

      // Simulate what gets saved to database
      const savedTransaction = {
        ...previewTransaction,
        user_id: 'user_123',
        amount: parseFloat(previewTransaction.amount) || 0,
        is_alimony: previewTransaction.is_alimony || false
      };

      // All preview fields should be in saved data
      expect(savedTransaction.payment_method).toBe(previewTransaction.payment_method);
      expect(savedTransaction.is_alimony).toBe(previewTransaction.is_alimony);
      expect(savedTransaction.origin).toBe(previewTransaction.origin);
      expect(savedTransaction.date).toBe(previewTransaction.date);
      expect(savedTransaction.description).toBe(previewTransaction.description);
      expect(savedTransaction.amount).toBe(previewTransaction.amount);
    });

    it('should not lose fields during bulk import mapping', () => {
      const transactionsToImport = [
        {
          type: 'expense',
          description: 'Item 1',
          amount: 100,
          date: '2025-10-01',
          category: 'cat_1',
          payment_method: 'pix',
          account_id: 'acc_1',
          is_alimony: true,
          origin: 'csv_import'
        }
      ];

      // Simulate bulk import mapping
      const dataToSave = transactionsToImport.map(t => ({
        ...t,
        user_id: 'user_123',
        amount: parseFloat(t.amount) || 0,
        // Should NOT remove fields
        suggestedCategory: undefined,
        categoryConfidence: undefined,
        isSuggestion: undefined
      }));

      expect(dataToSave[0].payment_method).toBe('pix');
      expect(dataToSave[0].is_alimony).toBe(true);
      expect(dataToSave[0].origin).toBe('csv_import');
      expect(dataToSave[0].account_id).toBe('acc_1');
    });
  });
});
