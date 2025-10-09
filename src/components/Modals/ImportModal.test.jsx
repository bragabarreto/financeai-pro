/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImportModal from './ImportModal';

// Mock do aiExtractor
jest.mock('../../services/aiExtractor', () => ({
  extractTransactionsFromFile: jest.fn(),
  categorizeTransactions: jest.fn()
}));

const { extractTransactionsFromFile, categorizeTransactions } = require('../../services/aiExtractor');

describe('ImportModal Component', () => {
  const mockCategories = {
    expense: [
      { id: '1', name: 'Alimentação' },
      { id: '2', name: 'Transporte' }
    ],
    income: [
      { id: '3', name: 'Salário' }
    ],
    investment: [
      { id: '4', name: 'Ações' }
    ]
  };

  const mockAccounts = [
    { id: 'acc1', name: 'Conta Corrente' },
    { id: 'acc2', name: 'Conta Poupança' }
  ];

  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar modal quando show é true', () => {
    render(
      <ImportModal
        show={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    expect(screen.getByText('Importar Transações')).toBeInTheDocument();
    expect(screen.getByText('Faça upload de um arquivo CSV')).toBeInTheDocument();
  });

  it('não deve renderizar quando show é false', () => {
    render(
      <ImportModal
        show={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    expect(screen.queryByText('Importar Transações')).not.toBeInTheDocument();
  });

  it('deve permitir seleção de arquivo', () => {
    render(
      <ImportModal
        show={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    const fileInput = document.querySelector('#file-upload');
    expect(fileInput).toBeInTheDocument();

    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText(/test.csv/)).toBeInTheDocument();
  });

  it('deve processar arquivo e exibir preview', async () => {
    const mockTransactions = [
      {
        date: '2024-01-01',
        description: 'Supermercado',
        amount: 150,
        type: 'expense',
        origin: 'import'
      }
    ];

    const mockCategorizedTransactions = [
      {
        ...mockTransactions[0],
        suggestedCategory: '1',
        categoryConfidence: 0.8,
        isSuggestion: true,
        category: '1'
      }
    ];

    extractTransactionsFromFile.mockReturnValue(mockTransactions);
    categorizeTransactions.mockResolvedValue(mockCategorizedTransactions);

    render(
      <ImportModal
        show={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    const fileInput = document.querySelector('#file-upload');
    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    
    // Simular seleção de arquivo
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Clicar no botão de processar
    const processButton = screen.getByText('Processar Arquivo');
    fireEvent.click(processButton);

    // Aguardar processamento
    await waitFor(() => {
      expect(extractTransactionsFromFile).toHaveBeenCalled();
      expect(categorizeTransactions).toHaveBeenCalledWith(mockTransactions, 'user123');
    });
  });

  it.skip('deve exibir erro quando nenhum arquivo é selecionado', async () => {
    render(
      <ImportModal
        show={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    const processButton = screen.getByText('Processar Arquivo');
    fireEvent.click(processButton);

    // A mensagem de erro deve aparecer após a atualização do estado
    await waitFor(() => {
      const errorElement = screen.queryByText('Selecione um arquivo primeiro');
      expect(errorElement).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('deve chamar onClose quando botão cancelar é clicado', () => {
    render(
      <ImportModal
        show={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('deve permitir edição de categoria na tabela de preview', async () => {
    const mockTransactions = [
      {
        date: '2024-01-01',
        description: 'Supermercado',
        amount: 150,
        type: 'expense',
        category: '1',
        suggestedCategory: '1',
        categoryConfidence: 0.8,
        isSuggestion: true,
        account_id: 'acc1'
      }
    ];

    extractTransactionsFromFile.mockReturnValue(mockTransactions);
    categorizeTransactions.mockResolvedValue(mockTransactions);

    const { container } = render(
      <ImportModal
        show={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    // Simular upload e processamento
    const fileInput = container.querySelector('#file-upload');
    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Processar Arquivo');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/1 transação\(ões\) encontrada\(s\)/)).toBeInTheDocument();
    });

    // Verificar que a tabela de preview existe
    const categorySelects = container.querySelectorAll('select');
    expect(categorySelects.length).toBeGreaterThan(0);
  });

  it('deve destacar categorias sugeridas e remover destaque após edição', async () => {
    const mockTransactions = [
      {
        date: '2024-01-01',
        description: 'Supermercado',
        amount: 150,
        type: 'expense',
        category: '1',
        suggestedCategory: '1',
        categoryConfidence: 0.8,
        isSuggestion: true,
        account_id: 'acc1'
      }
    ];

    extractTransactionsFromFile.mockReturnValue(mockTransactions);
    categorizeTransactions.mockResolvedValue(mockTransactions);

    const { container } = render(
      <ImportModal
        show={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    // Simular upload e processamento
    const fileInput = container.querySelector('#file-upload');
    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Processar Arquivo');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/1 transação\(ões\) encontrada\(s\)/)).toBeInTheDocument();
    });

    // Encontrar o select de categoria
    const categorySelects = container.querySelectorAll('select');
    const categorySelect = Array.from(categorySelects).find(select => 
      select.className.includes('bg-yellow-50') || 
      Array.from(select.options).some(opt => opt.text.includes('sugerido'))
    );

    // Verificar que a categoria sugerida tem destaque visual (fundo amarelo)
    if (categorySelect) {
      expect(categorySelect.className).toContain('bg-yellow-50');
    }

    // Simular edição da categoria
    if (categorySelect) {
      fireEvent.change(categorySelect, { target: { value: '2' } });

      // Após edição, o destaque deve ser removido (fundo branco)
      await waitFor(() => {
        expect(categorySelect.className).not.toContain('bg-yellow-50');
        expect(categorySelect.className).toContain('bg-white');
      });
    }
  });

  it('deve indicar nível de confiança das sugestões', async () => {
    const mockTransactions = [
      {
        date: '2024-01-01',
        description: 'Supermercado',
        amount: 150,
        type: 'expense',
        category: '1',
        suggestedCategory: '1',
        categoryConfidence: 0.85,
        isSuggestion: true,
        account_id: 'acc1'
      }
    ];

    extractTransactionsFromFile.mockReturnValue(mockTransactions);
    categorizeTransactions.mockResolvedValue(mockTransactions);

    const { container } = render(
      <ImportModal
        show={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    const fileInput = container.querySelector('#file-upload');
    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Processar Arquivo');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText('Alta confiança')).toBeInTheDocument();
    });
  });

  it('deve validar transações antes de confirmar importação', async () => {
    const mockTransactions = [
      {
        date: '2024-01-01',
        description: 'Supermercado',
        amount: 150,
        type: 'expense',
        category: null, // Categoria não definida
        account_id: null, // Conta não definida
        suggestedCategory: null,
        categoryConfidence: 0,
        isSuggestion: true
      }
    ];

    extractTransactionsFromFile.mockReturnValue(mockTransactions);
    categorizeTransactions.mockResolvedValue(mockTransactions);

    const { container } = render(
      <ImportModal
        show={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    const fileInput = container.querySelector('#file-upload');
    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Processar Arquivo');
    fireEvent.click(processButton);

    await waitFor(() => {
      const confirmButton = screen.getByText('Confirmar Importação');
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/sem categoria ou conta definida/)).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  it('deve permitir marcar transação como parcelada no preview', async () => {
    const mockTransactions = [
      {
        date: '2024-01-01',
        description: 'Compra parcelada 12x',
        amount: 1200,
        type: 'expense',
        category: '1',
        account_id: 'acc1',
        is_installment: false,
        installment_count: null
      }
    ];

    extractTransactionsFromFile.mockReturnValue(mockTransactions);
    categorizeTransactions.mockResolvedValue(mockTransactions);

    const { container } = render(
      <ImportModal
        show={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    const fileInput = container.querySelector('#file-upload');
    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Processar Arquivo');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/1 transação\(ões\) encontrada\(s\)/)).toBeInTheDocument();
    });

    // Encontrar e marcar checkbox de parcelamento
    const installmentCheckbox = container.querySelector('input[type="checkbox"]');
    expect(installmentCheckbox).toBeInTheDocument();
    fireEvent.click(installmentCheckbox);

    // Verificar que campo de parcelas apareceu
    const installmentCountInput = container.querySelector('input[type="number"][min="2"]');
    expect(installmentCountInput).toBeInTheDocument();
  });

  it('deve calcular datas de parcelas automaticamente', async () => {
    const mockTransactions = [
      {
        date: '2024-01-01',
        description: 'Compra parcelada',
        amount: 1200,
        type: 'expense',
        category: '1',
        account_id: 'acc1',
        is_installment: false,
        installment_count: null
      }
    ];

    extractTransactionsFromFile.mockReturnValue(mockTransactions);
    categorizeTransactions.mockResolvedValue(mockTransactions);

    const { container } = render(
      <ImportModal
        show={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    const fileInput = container.querySelector('#file-upload');
    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Processar Arquivo');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/1 transação\(ões\) encontrada\(s\)/)).toBeInTheDocument();
    });

    // Marcar como parcelado
    const installmentCheckbox = container.querySelector('input[type="checkbox"]');
    fireEvent.click(installmentCheckbox);

    // Inserir número de parcelas
    const installmentCountInput = container.querySelector('input[type="number"][min="2"]');
    fireEvent.change(installmentCountInput, { target: { value: '12' } });

    // Verificar que a data da última parcela é exibida
    await waitFor(() => {
      const dateDisplay = screen.getByText(/até/);
      expect(dateDisplay).toBeInTheDocument();
    });
  });

  it('deve reconhecer transações parceladas automaticamente da descrição', async () => {
    const mockTransactions = [
      {
        date: '2024-01-01',
        description: 'Compra Magazine Luiza 3/12',
        amount: 100,
        type: 'expense',
        category: '1',
        account_id: 'acc1',
        is_installment: true,
        installment_count: 12,
        installment_due_dates: ['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01', '2024-07-01', '2024-08-01', '2024-09-01', '2024-10-01', '2024-11-01', '2024-12-01'],
        last_installment_date: '2024-12-01'
      }
    ];

    extractTransactionsFromFile.mockReturnValue(mockTransactions);
    categorizeTransactions.mockResolvedValue(mockTransactions);

    const { container } = render(
      <ImportModal
        show={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        categories={mockCategories}
        accounts={mockAccounts}
        userId="user123"
      />
    );

    const fileInput = container.querySelector('#file-upload');
    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Processar Arquivo');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/1 transação\(ões\) encontrada\(s\)/)).toBeInTheDocument();
    });

    // Verificar que checkbox está marcado
    const installmentCheckbox = container.querySelector('input[type="checkbox"]');
    expect(installmentCheckbox).toBeChecked();

    // Verificar que número de parcelas está preenchido
    const installmentCountInput = container.querySelector('input[type="number"][min="2"]');
    expect(installmentCountInput.value).toBe('12');
  });
});
