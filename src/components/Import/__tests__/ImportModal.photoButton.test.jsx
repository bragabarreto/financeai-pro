/**
 * Test suite specifically for photo import button behavior
 * Ensures the "Processar Foto" button correctly triggers photo processing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImportModal from '../ImportModal';
import * as photoExtractor from '../../../services/import/photoExtractorAI';
import * as aiService from '../../../services/import/aiService';

// Mock the services
jest.mock('../../../services/import/photoExtractorAI');
jest.mock('../../../services/import/aiService');

describe('ImportModal - Photo Processing Button', () => {
  const mockUser = { id: '1', email: 'test@example.com' };
  const mockAccounts = [
    { id: '1', name: 'Conta Corrente', balance: 1000, is_primary: true }
  ];
  const mockCards = [
    { id: '1', name: 'Cartão Visa', last_digits: '1234' }
  ];
  const mockCategories = {
    expense: [
      { id: '1', name: 'Alimentação', type: 'expense' }
    ],
    income: [],
    investment: []
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock URL.createObjectURL for browser APIs
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock AI availability
    aiService.isAIAvailable.mockReturnValue(true);
    aiService.getAIStatus.mockReturnValue({
      available: true,
      providers: {
        gemini: { enabled: true, model: 'gemini-pro' },
        openai: { enabled: false, model: '' },
        anthropic: { enabled: false, model: '' }
      }
    });
    
    // Mock AI config
    aiService.getAIConfig.mockReturnValue({
      enabled: true,
      provider: 'gemini',
      apiKey: 'test-api-key',
      model: 'gemini-pro'
    });
  });

  test('button should be present when photo mode is selected', () => {
    render(
      <ImportModal
        show={true}
        onClose={jest.fn()}
        user={mockUser}
        accounts={mockAccounts}
        categories={mockCategories}
        cards={mockCards}
      />
    );

    // Click on photo tab
    const photoTab = screen.getByText('Foto');
    fireEvent.click(photoTab);

    // Button should be present but disabled (no file selected yet)
    const processButton = screen.getByText('Processar Foto');
    expect(processButton).toBeInTheDocument();
    expect(processButton).toBeDisabled();
  });

  test('button should be enabled after photo is selected', async () => {
    render(
      <ImportModal
        show={true}
        onClose={jest.fn()}
        user={mockUser}
        accounts={mockAccounts}
        categories={mockCategories}
        cards={mockCards}
      />
    );

    // Click on photo tab
    const photoTab = screen.getByText('Foto');
    fireEvent.click(photoTab);

    // Create a mock file
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    
    // Find and trigger file input
    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });
    fireEvent.change(fileInput);

    // Wait for state update
    await waitFor(() => {
      const processButton = screen.getByText('Processar Foto');
      expect(processButton).not.toBeDisabled();
    });
  });

  test('button click should call handleProcessPhoto and trigger extraction', async () => {
    // Mock successful extraction
    const mockTransaction = {
      description: 'Test Store',
      amount: 100.50,
      date: '2025-10-14',
      type: 'expense',
      payment_method: 'credit_card'
    };
    photoExtractor.extractFromPhoto.mockResolvedValue(mockTransaction);

    render(
      <ImportModal
        show={true}
        onClose={jest.fn()}
        user={mockUser}
        accounts={mockAccounts}
        categories={mockCategories}
        cards={mockCards}
      />
    );

    // Click on photo tab
    const photoTab = screen.getByText('Foto');
    fireEvent.click(photoTab);

    // Create a mock file
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    
    // Find and trigger file input
    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });
    fireEvent.change(fileInput);

    // Wait for button to be enabled
    await waitFor(() => {
      const processButton = screen.getByText('Processar Foto');
      expect(processButton).not.toBeDisabled();
    });

    // Click the process button
    const processButton = screen.getByText('Processar Foto');
    fireEvent.click(processButton);

    // Verify loading state
    await waitFor(() => {
      expect(screen.getByText('Processando...')).toBeInTheDocument();
    });

    // Verify extractFromPhoto was called with correct parameters
    await waitFor(() => {
      expect(photoExtractor.extractFromPhoto).toHaveBeenCalledWith(
        file,
        expect.objectContaining({
          enabled: true,
          provider: 'gemini',
          apiKey: 'test-api-key'
        }),
        mockCards
      );
    });
  });

  test('button should show error if no AI config is found', async () => {
    // Mock no AI config
    aiService.getAIConfig.mockReturnValue(null);

    render(
      <ImportModal
        show={true}
        onClose={jest.fn()}
        user={mockUser}
        accounts={mockAccounts}
        categories={mockCategories}
        cards={mockCards}
      />
    );

    // Click on photo tab
    const photoTab = screen.getByText('Foto');
    fireEvent.click(photoTab);

    // Create a mock file
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    
    // Find and trigger file input
    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });
    fireEvent.change(fileInput);

    // Wait for button and click it
    const processButton = await screen.findByText('Processar Foto');
    fireEvent.click(processButton);

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/Configuração de IA não encontrada/i)).toBeInTheDocument();
    });

    // Verify extractFromPhoto was NOT called
    expect(photoExtractor.extractFromPhoto).not.toHaveBeenCalled();
  });

  test('button should show error if extraction fails', async () => {
    // Mock failed extraction
    photoExtractor.extractFromPhoto.mockRejectedValue(
      new Error('API error: Invalid API key')
    );

    render(
      <ImportModal
        show={true}
        onClose={jest.fn()}
        user={mockUser}
        accounts={mockAccounts}
        categories={mockCategories}
        cards={mockCards}
      />
    );

    // Click on photo tab
    const photoTab = screen.getByText('Foto');
    fireEvent.click(photoTab);

    // Create a mock file
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    
    // Find and trigger file input
    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });
    fireEvent.change(fileInput);

    // Wait for button and click it
    const processButton = await screen.findByText('Processar Foto');
    fireEvent.click(processButton);

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/Erro na API de IA/i)).toBeInTheDocument();
    });
  });

  test('button should require accounts or cards before processing', async () => {
    render(
      <ImportModal
        show={true}
        onClose={jest.fn()}
        user={mockUser}
        accounts={[]} // No accounts
        categories={mockCategories}
        cards={[]} // No cards
      />
    );

    // Click on photo tab
    const photoTab = screen.getByText('Foto');
    fireEvent.click(photoTab);

    // Create a mock file
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    
    // Find and trigger file input
    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });
    fireEvent.change(fileInput);

    // Wait for button to be enabled, then click it
    const processButton = await screen.findByText('Processar Foto');
    fireEvent.click(processButton);

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/cadastrar pelo menos uma conta bancária ou cartão/i)).toBeInTheDocument();
    });

    // Verify extractFromPhoto was NOT called
    expect(photoExtractor.extractFromPhoto).not.toHaveBeenCalled();
  });

  test('button should complete full flow and show preview', async () => {
    // Mock successful extraction
    const mockTransaction = {
      description: 'Test Store',
      amount: 100.50,
      date: '2025-10-14',
      type: 'expense',
      payment_method: 'credit_card',
      confidence: 95
    };
    photoExtractor.extractFromPhoto.mockResolvedValue(mockTransaction);

    render(
      <ImportModal
        show={true}
        onClose={jest.fn()}
        user={mockUser}
        accounts={mockAccounts}
        categories={mockCategories}
        cards={mockCards}
      />
    );

    // Click on photo tab
    const photoTab = screen.getByText('Foto');
    fireEvent.click(photoTab);

    // Create a mock file
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    
    // Find and trigger file input
    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });
    fireEvent.change(fileInput);

    // Wait for button and click it
    const processButton = await screen.findByText('Processar Foto');
    fireEvent.click(processButton);

    // Verify processing completes and step advances to preview
    // Look for elements that appear in step 2 (preview)
    await waitFor(() => {
      // Should show metadata like "Total de Linhas"
      expect(screen.getByText('Total de Linhas')).toBeInTheDocument();
      expect(screen.getByText('Extraídas')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify extractFromPhoto was called with correct parameters
    expect(photoExtractor.extractFromPhoto).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        enabled: true,
        provider: 'gemini',
        apiKey: 'test-api-key'
      }),
      mockCards
    );
  });
});
