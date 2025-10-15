/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImportModal from '../ImportModal';

// Mock SMS extractor
jest.mock('../../../services/import/smsExtractor', () => ({
  extractMultipleFromText: jest.fn(),
  validateSMSExtraction: jest.fn(),
  calculateSMSConfidence: jest.fn()
}));

// Mock AI service (disabled for these tests)
jest.mock('../../../services/import/aiService', () => ({
  isAIAvailable: jest.fn(() => false),
  enhanceTransactionsWithAI: jest.fn(async (txs) => txs),
  getAIStatus: jest.fn(() => ({ available: false, providers: { gemini: { enabled: false }, openai: { enabled: false }, anthropic: { enabled: false } } }))
}));

const { extractMultipleFromText, validateSMSExtraction, calculateSMSConfidence } = require('../../../services/import/smsExtractor');

describe('ImportModal - Preview parity and category label', () => {
  const mockUser = { id: 'user123', email: 'test@test.com' };
  const mockAccounts = [
    { id: 'acc1', name: 'Conta Corrente', is_primary: true }
  ];
  const mockCards = [
    { id: 'card1', name: 'Cartão Visa' }
  ];
  const mockCategories = {
    expense: [
      { id: '1', name: 'Alimentação', type: 'expense' },
      { id: '2', name: 'Transporte', type: 'expense' }
    ],
    income: [],
    investment: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show installment controls in SMS preview and recalc dates', async () => {
    extractMultipleFromText.mockReturnValue([
      {
        date: '2025-10-10',
        description: 'Compra parcelada',
        amount: 1200,
        type: 'expense',
        payment_method: 'credit_card',
        card_id: 'card1'
      }
    ]);
    validateSMSExtraction.mockReturnValue({ valid: true, errors: [], warnings: [], validTransactions: 1 });
    calculateSMSConfidence.mockReturnValue(90);

    const { container } = render(
      <ImportModal
        show={true}
        onClose={jest.fn()}
        user={mockUser}
        accounts={mockAccounts}
        categories={mockCategories}
        cards={mockCards}
      />
    );

    // Go to SMS tab
    fireEvent.click(screen.getByText('SMS/Texto'));

    // Paste some SMS text and process
    const textarea = container.querySelector('textarea');
    fireEvent.change(textarea, { target: { value: 'CAIXA: Compra aprovada R$ 1.200,00 em 10/10 às 10:00, ELO final 1234' } });
    fireEvent.click(screen.getByText('Processar SMS'));

    // Wait for preview
    await waitFor(() => {
      expect(screen.getByText('Revisão')).toBeInTheDocument();
    });

    // Find installment checkbox by title
    const installmentCheckbox = container.querySelector('input[title="Transação Parcelada"]');
    expect(installmentCheckbox).toBeInTheDocument();

    // Enable installments
    fireEvent.click(installmentCheckbox);

    // Parcel count input should appear
    const installmentCountInput = container.querySelector('input[type="number"][min="2"]');
    expect(installmentCountInput).toBeInTheDocument();

    // Enter 12 and expect helper text "até DD/MM/YYYY"
    fireEvent.change(installmentCountInput, { target: { value: '12' } });
    await waitFor(() => {
      expect(screen.getByText(/até/)).toBeInTheDocument();
    });
  });

  it('should not append (sugerido) to category option labels', async () => {
    extractMultipleFromText.mockReturnValue([
      {
        date: '2025-10-10',
        description: 'Mercado',
        amount: 100,
        type: 'expense',
        // Simulate AI-suggested category mapping by ID
        aiSuggestedCategory: '1'
      }
    ]);
    validateSMSExtraction.mockReturnValue({ valid: true, errors: [], warnings: [], validTransactions: 1 });
    calculateSMSConfidence.mockReturnValue(85);

    const { container } = render(
      <ImportModal
        show={true}
        onClose={jest.fn()}
        user={mockUser}
        accounts={mockAccounts}
        categories={mockCategories}
        cards={mockCards}
      />
    );

    fireEvent.click(screen.getByText('SMS/Texto'));
    const textarea = container.querySelector('textarea');
    fireEvent.change(textarea, { target: { value: 'Teste' } });
    fireEvent.click(screen.getByText('Processar SMS'));

    await waitFor(() => {
      expect(screen.getByText('Revisão')).toBeInTheDocument();
    });

    // Locate category select and ensure no option contains "(sugerido)"
    const selects = container.querySelectorAll('select');
    const categorySelect = Array.from(selects).find(sel => sel.className.includes('border') && sel.options.length > 0);
    expect(categorySelect).toBeTruthy();
    const optionTexts = Array.from(categorySelect.options).map(o => o.textContent || '');
    expect(optionTexts.some(t => t.includes('(sugerido)') || t.includes('(sugestão)'))).toBe(false);
  });
});
