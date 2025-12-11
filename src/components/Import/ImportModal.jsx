import React, { useState, useEffect } from 'react';
import { 
  X, Upload, FileText, AlertCircle, CheckCircle, 
  Loader, Download, Eye, Edit2, Trash2, Save,
  AlertTriangle, MessageSquare, Sparkles, DollarSign,
  History, CreditCard
} from 'lucide-react';
import { processImportFile, importTransactions } from '../../services/import/importService';
import { formatDateLocal, formatBrazilianDate } from '../../utils/dateUtils';
import { extractMultipleFromText, validateSMSExtraction, calculateSMSConfidence } from '../../services/import/smsExtractor';
import { isAIAvailable, enhanceTransactionsWithAI, getAIStatus, getAIConfig } from '../../services/import/aiService';
import { extractFromPhoto } from '../../services/import/photoExtractorAI';
import { extractFromPaycheck } from '../../services/import/paycheckExtractorAI';
import { useAIConfig, checkAIAvailability } from '../../hooks/useAIConfig';
import { enrichTransactionsWithHistory, matchCardByDigits } from '../../services/import/transactionMatcher';
import { createImportHistory, updateImportHistory } from '../../services/supabase';
import PaycheckPreview from './PaycheckPreview';

const ImportModal = ({ show, onClose, user, accounts, categories, cards = [] }) => {
  // Carregar configuração de IA do Supabase automaticamente
  const { config: aiConfig, loading: aiConfigLoading, isConfigured } = useAIConfig(user?.id, show);
  
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Result
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processResult, setProcessResult] = useState(null);
  const [editingTransactions, setEditingTransactions] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [bulkEditField, setBulkEditField] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [importMode, setImportMode] = useState('file'); // 'file', 'text', 'photo', or 'paycheck'
  const [smsText, setSmsText] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [paycheckFile, setPaycheckFile] = useState(null);
  const [paycheckData, setPaycheckData] = useState(null);
  const [useAI, setUseAI] = useState(isAIAvailable());
  
  // Atualizar useAI quando aiConfig carregar
  useEffect(() => {
    if (aiConfig && isConfigured) {
      setUseAI(true);
      console.log('✅ IA configurada e disponível para uso');
    } else if (!aiConfigLoading && !isConfigured) {
      setUseAI(isAIAvailable()); // Fallback para variáveis de ambiente
    }
  }, [aiConfig, isConfigured, aiConfigLoading]);

  const getPaymentMethodLabel = (method) => {
    const labels = {
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      pix: 'PIX',
      transfer: 'Transferência',
      boleto_bancario: 'Boleto Bancário',
      paycheck: 'Contracheque',
      application: 'Aplicação',
      redemption: 'Resgate'
    };
    return labels[method] || method;
  };

  useEffect(() => {
    if (show) {
      resetState();
    }
  }, [show]);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setLoading(false);
    setError('');
    setProcessResult(null);
    setEditingTransactions([]);
    setImportResult(null);
    setImportMode('file');
    setSmsText('');
    setPhotoFile(null);
    setPaycheckFile(null);
    setPaycheckData(null);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleProcessSMS = async () => {
    if (!smsText || smsText.trim().length < 10) {
      setError('Cole o texto do SMS ou notificação');
      return;
    }

    // Validar se usuário tem contas ou cartões cadastrados
    if (accounts.length === 0 && cards.length === 0) {
      setError(
        'Você precisa cadastrar pelo menos uma conta bancária ou cartão de crédito antes de importar transações. ' +
        'Vá para a aba "Contas" ou "Cartões" para cadastrar.'
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Extract transactions from SMS text
      let transactions = extractMultipleFromText(smsText);
      
      // Validate extraction
      const validation = validateSMSExtraction(transactions);
      
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return;
      }

      // Add confidence scores and initialize extra flags (alimony, installments)
      transactions = transactions.map(t => ({
        ...t,
        confidence: calculateSMSConfidence(t),
        selected: true,
        is_alimony: false,
        // Installment defaults
        is_installment: t.is_installment || false,
        installment_count: t.installment_count || null,
        installment_due_dates: t.installment_due_dates || [],
        last_installment_date: t.last_installment_date || null
      }));

      // Use AI enhancement if available and enabled
      if (useAI && isAIAvailable()) {
        const categoryList = Object.values(categories.expense || [])
          .concat(Object.values(categories.income || []))
          .concat(Object.values(categories.investment || []));
        
        transactions = await enhanceTransactionsWithAI(transactions, categoryList, cards, accounts, user?.id);
      }

      // Build flat category list for enrichment
      const allCategories = Object.values(categories.expense || [])
        .concat(Object.values(categories.income || []))
        .concat(Object.values(categories.investment || []));

      // Enrich transactions with historical data and card matching
      let enrichedTransactions = transactions;
      if (user && user.id) {
        console.log('🔍 Enriquecendo transações com histórico do usuário...');
        enrichedTransactions = await enrichTransactionsWithHistory(
          transactions,
          user.id,
          cards,
          accounts,
          allCategories
        );
      }

      // Map categories with pattern learning
      const transactionsWithCategoryMapping = await Promise.all(enrichedTransactions.map(async (t) => {
        const categoryList = Object.values(categories[t.type] || []);
        
        // Check if category was already set by enrichment
        let matchedCategory = null;
        let suggestionSource = t.suggestionSource || null;
        
        if (t.categoryId) {
          matchedCategory = categoryList.find(c => c.id === t.categoryId);
          if (matchedCategory && !suggestionSource) {
            suggestionSource = 'history';
          }
        }
        
        // Try AI suggestion if no category yet
        if (!matchedCategory && t.aiSuggestedCategory) {
          matchedCategory = categoryList.find(c => c.id === t.aiSuggestedCategory);
          suggestionSource = 'ai';
        }
        
        // If no category yet, try pattern learning from history
        if (!matchedCategory && user && user.id) {
          const { suggestCategoryFromHistory } = await import('../../services/import/patternLearning');
          const historyMatch = await suggestCategoryFromHistory(user.id, t.description);
          
          if (historyMatch && historyMatch.confidence > 0.5) {
            matchedCategory = categoryList.find(c => c.id === historyMatch.categoryId);
            suggestionSource = 'history';
          }
        }
        
        // Auto-assign account or card based on payment method with intelligent fallback
        // Prefer values already set by enrichment (from historical match or card digit match)
        let defaultAccountId = t.account_id || null;
        let defaultCardId = t.card_id || null;
        let needsReview = false;
        let cardMatchedByDigits = t.cardMatchedByDigits || false;
        
        if (t.payment_method === 'credit_card') {
          // Tentar atribuir cartão se for crédito
          if (!defaultCardId) {
            // Try to match by card digits if available
            if (t.card_last_digits && cards.length > 0) {
              const cardMatch = matchCardByDigits(t.card_last_digits, cards);
              if (cardMatch) {
                defaultCardId = cardMatch.card.id;
                cardMatchedByDigits = true;
                console.log(`💳 SMS: Cartão ${cardMatch.card.name} identificado pelos dígitos ${t.card_last_digits}`);
              }
            }
            // Fallback to first card
            if (!defaultCardId && cards.length > 0) {
              defaultCardId = cards[0].id;
            } else if (!defaultCardId) {
              // Fallback: se não tem cartão, tentar conta (usuário pode ajustar depois)
              defaultAccountId = accounts.length > 0 ? accounts[0].id : null;
              needsReview = true;
            }
          }
        } else if (t.payment_method === 'debit_card' || t.payment_method === 'pix' || 
                   t.payment_method === 'transfer' || t.payment_method === 'application' || 
                   t.payment_method === 'redemption') {
          // Tentar atribuir conta para outros métodos (se não já definida por enrichment)
          if (!defaultAccountId) {
            if (accounts.length > 0) {
              // Preferir conta principal se existir
              const primaryAcc = accounts.find(a => a.is_primary);
              defaultAccountId = primaryAcc ? primaryAcc.id : accounts[0].id;
            } else {
              // Sem contas disponíveis - marcar como erro
              needsReview = true;
            }
          }
        }
        
        return {
          ...t,
          categoryId: matchedCategory?.id || null,
          // Normalize category name to exactly match registered option
          category: matchedCategory?.name || (t.category ?? null),
          isSuggestion: !!matchedCategory,
          suggestionSource: suggestionSource, // 'ai', 'history', or null
          manuallyEdited: false,
          account_id: defaultAccountId,
          card_id: defaultCardId,
          cardMatchedByDigits: cardMatchedByDigits,
          needsReview: needsReview, // Marcar transações que precisam de revisão manual
          // Ensure installment fields exist in preview
          is_installment: t.is_installment || false,
          installment_count: t.installment_count || null,
          installment_due_dates: t.installment_due_dates || [],
          last_installment_date: t.last_installment_date || null
        };
      }));

      // Log enrichment summary
      const historyMatches = transactionsWithCategoryMapping.filter(t => t.suggestionSource === 'history').length;
      const cardDigitMatches = transactionsWithCategoryMapping.filter(t => t.cardMatchedByDigits).length;
      console.log(`✅ Processamento SMS concluído: ${historyMatches} categorias do histórico, ${cardDigitMatches} cartões identificados por dígitos`);

      setProcessResult({
        transactions: transactionsWithCategoryMapping,
        validation,
        metadata: {
          source: 'sms',
          processedAt: new Date().toISOString(),
          totalRows: transactions.length,
          extractedTransactions: transactions.length,
          validTransactions: validation.validTransactions,
          aiEnhanced: useAI && isAIAvailable(),
          historyMatches: historyMatches,
          cardDigitMatches: cardDigitMatches
        }
      });
      
      setEditingTransactions(transactionsWithCategoryMapping);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Erro ao processar SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPhoto = async () => {
    if (!photoFile) {
      setError('Selecione uma foto');
      return;
    }

    // Verificar se IA está configurada usando o hook
    if (!aiConfig || !isConfigured) {
      setError(
        'Extração de fotos requer IA configurada. ' +
        'Vá em Configurações → Configuração de IA para configurar sua chave de API.'
      );
      return;
    }
    
    console.log('🔄 Processando foto com configuração:', {
      provider: aiConfig.provider,
      model: aiConfig.model,
      enabled: aiConfig.enabled
    });

    // Validar se usuário tem contas ou cartões cadastrados
    if (accounts.length === 0 && cards.length === 0) {
      setError(
        'Você precisa cadastrar pelo menos uma conta bancária ou cartão de crédito antes de importar transações. ' +
        'Vá para a aba "Contas" ou "Cartões" para cadastrar.'
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Build category list for AI extraction
      const categoryList = Object.values(categories.expense || [])
        .concat(Object.values(categories.income || []))
        .concat(Object.values(categories.investment || []));
      
      // Extract transaction from photo (pass userId for historical context)
      const transaction = await extractFromPhoto(photoFile, aiConfig, cards, categoryList, user?.id);
      
      if (!transaction) {
        setError('Não foi possível extrair dados da foto. Tente outra imagem.');
        return;
      }

      // Wrap in array for consistency
      let transactions = [transaction];

      // Add confidence scores and initialize extra flags (alimony, installments)
      transactions = transactions.map(t => ({
        ...t,
        confidence: t.confidence || 90,
        selected: true,
        is_alimony: false,
        // Installment defaults
        is_installment: t.is_installment || false,
        installment_count: t.installment_count || null,
        installment_due_dates: t.installment_due_dates || [],
        last_installment_date: t.last_installment_date || null
      }));

      // Use AI enhancement if available and enabled
      if (useAI && isAIAvailable()) {
        transactions = await enhanceTransactionsWithAI(transactions, categoryList, cards, accounts, user?.id);
      }

      // Enrich transactions with historical data and card matching
      let enrichedTransactions = transactions;
      if (user && user.id) {
        console.log('🔍 Enriquecendo transação de foto com histórico do usuário...');
        
        // Build flat category list for enrichment
        const allCategories = Object.values(categories.expense || [])
          .concat(Object.values(categories.income || []))
          .concat(Object.values(categories.investment || []));
          
        enrichedTransactions = await enrichTransactionsWithHistory(
          transactions,
          user.id,
          cards,
          accounts,
          allCategories
        );
      }

      // Map categories with pattern learning
      const transactionsWithCategoryMapping = await Promise.all(enrichedTransactions.map(async (t) => {
        const categoryList = Object.values(categories[t.type] || []);
        
        // Check if category was already set by enrichment
        let matchedCategory = null;
        let suggestionSource = t.suggestionSource || null;
        
        if (t.categoryId) {
          matchedCategory = categoryList.find(c => c.id === t.categoryId);
          if (matchedCategory && !suggestionSource) {
            suggestionSource = 'history';
          }
        }
        
        // Try AI suggestion if no category yet
        if (!matchedCategory && t.aiSuggestedCategory) {
          matchedCategory = categoryList.find(c => c.id === t.aiSuggestedCategory);
          suggestionSource = 'ai';
        }
        
        // If no category yet, try pattern learning from history
        if (!matchedCategory && user && user.id) {
          const { suggestCategoryFromHistory } = await import('../../services/import/patternLearning');
          const historyMatch = await suggestCategoryFromHistory(user.id, t.description);
          
          if (historyMatch && historyMatch.confidence > 0.5) {
            matchedCategory = categoryList.find(c => c.id === historyMatch.categoryId);
            suggestionSource = 'history';
          }
        }
        
        // Auto-assign account or card based on payment method with intelligent fallback
        // Prefer values already set by enrichment (from historical match or card digit match)
        let defaultAccountId = t.account_id || null;
        let defaultCardId = t.card_id || null;
        let needsReview = false;
        let cardMatchedByDigits = t.cardMatchedByDigits || false;
        
        if (t.payment_method === 'credit_card') {
          // Tentar atribuir cartão se for crédito
          if (!defaultCardId) {
            // Try to match by card digits if available
            if (t.card_last_digits && cards.length > 0) {
              const cardMatch = matchCardByDigits(t.card_last_digits, cards);
              if (cardMatch) {
                defaultCardId = cardMatch.card.id;
                cardMatchedByDigits = true;
                console.log(`💳 Foto: Cartão ${cardMatch.card.name} identificado pelos dígitos ${t.card_last_digits}`);
              }
            }
            // Fallback to first card
            if (!defaultCardId && cards.length > 0) {
              defaultCardId = cards[0].id;
            } else if (!defaultCardId) {
              // Fallback: se não tem cartão, tentar conta (usuário pode ajustar depois)
              defaultAccountId = accounts.length > 0 ? accounts[0].id : null;
              needsReview = true;
            }
          }
        } else if (t.payment_method === 'debit_card' || t.payment_method === 'pix' || 
                   t.payment_method === 'transfer' || t.payment_method === 'application' || 
                   t.payment_method === 'redemption') {
          // Tentar atribuir conta para outros métodos (se não já definida por enrichment)
          if (!defaultAccountId) {
            if (accounts.length > 0) {
              // Preferir conta principal se existir
              const primaryAcc = accounts.find(a => a.is_primary);
              defaultAccountId = primaryAcc ? primaryAcc.id : accounts[0].id;
            } else {
              // Sem contas disponíveis - marcar como erro
              needsReview = true;
            }
          }
        }
        
        return {
          ...t,
          categoryId: matchedCategory?.id || null,
          // Normalize category name to exactly match registered option
          category: matchedCategory?.name || (t.category ?? null),
          isSuggestion: !!matchedCategory,
          suggestionSource: suggestionSource, // 'ai', 'history', or null
          manuallyEdited: false,
          account_id: defaultAccountId,
          card_id: defaultCardId,
          cardMatchedByDigits: cardMatchedByDigits,
          needsReview: needsReview, // Marcar transações que precisam de revisão manual
          // Ensure installment fields exist in preview
          is_installment: t.is_installment || false,
          installment_count: t.installment_count || null,
          installment_due_dates: t.installment_due_dates || [],
          last_installment_date: t.last_installment_date || null
        };
      }));

      // Log enrichment summary
      const historyMatches = transactionsWithCategoryMapping.filter(t => t.suggestionSource === 'history').length;
      const cardDigitMatches = transactionsWithCategoryMapping.filter(t => t.cardMatchedByDigits).length;
      console.log(`✅ Processamento Foto concluído: ${historyMatches} categorias do histórico, ${cardDigitMatches} cartões identificados por dígitos`);

      const validation = {
        valid: true,
        validTransactions: 1,
        warnings: []
      };

      setProcessResult({
        transactions: transactionsWithCategoryMapping,
        validation,
        metadata: {
          source: 'photo',
          processedAt: new Date().toISOString(),
          totalRows: 1,
          extractedTransactions: 1,
          validTransactions: 1,
          aiEnhanced: useAI && isAIAvailable(),
          historyMatches: historyMatches,
          cardDigitMatches: cardDigitMatches
        }
      });
      
      setEditingTransactions(transactionsWithCategoryMapping);
      setStep(2);
    } catch (err) {
      console.error('Erro ao processar foto:', err);
      
      // Provide more helpful error messages
      let errorMessage = 'Erro ao processar foto';
      
      if (err.message.includes('API error') || err.message.includes('API key')) {
        errorMessage = 'Erro na API de IA. Verifique se sua chave de API está correta em Configurações → Configuração de IA';
      } else if (err.message.includes('rate limit') || err.message.includes('quota')) {
        errorMessage = 'Limite de uso da API de IA atingido. Tente novamente mais tarde ou use outra chave de API';
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente';
      } else if (err.message.includes('JSON')) {
        errorMessage = 'Erro ao interpretar resposta da IA. A imagem pode não conter dados de transação válidos. Tente outra foto';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPaycheck = async () => {
    if (!paycheckFile) {
      setError('Selecione um arquivo de contracheque (PDF ou imagem)');
      return;
    }

    // Verificar se IA está configurada
    if (!aiConfig || !isConfigured) {
      setError(
        'Extração de contracheques requer IA configurada. ' +
        'Vá em Configurações → Configuração de IA para configurar sua chave de API.'
      );
      return;
    }
    
    console.log('🔄 Processando contracheque com configuração:', {
      provider: aiConfig.provider,
      model: aiConfig.model,
      enabled: aiConfig.enabled
    });

    // Validar se usuário tem contas cadastradas
    if (accounts.length === 0) {
      setError(
        'Você precisa cadastrar pelo menos uma conta bancária antes de importar contracheques. ' +
        'Vá para a aba "Contas" para cadastrar.'
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Extrair dados do contracheque (pass userId for historical context)
      const categoryList = Object.values(categories.expense || [])
        .concat(Object.values(categories.income || []));
      
      const result = await extractFromPaycheck(paycheckFile, aiConfig, categoryList, user?.id);
      
      if (!result || !result.transactions || result.transactions.length === 0) {
        setError('Não foi possível extrair dados do contracheque. Verifique se o arquivo é válido.');
        return;
      }

      console.log(`✅ ${result.transactions.length} transações extraídas do contracheque`);

      // Atribuir conta padrão para transações sem conta
      const primaryAccount = accounts.find(a => a.is_primary) || accounts[0];
      const transactionsWithAccounts = result.transactions.map(t => ({
        ...t,
        account_id: t.account_id || primaryAccount.id,
        // Ensure installment fields exist in preview
        is_installment: t.is_installment || false,
        installment_count: t.installment_count || null,
        installment_due_dates: t.installment_due_dates || [],
        last_installment_date: t.last_installment_date || null
      }));

      // Salvar dados do contracheque para o preview
      setPaycheckData({
        ...result,
        transactions: transactionsWithAccounts
      });
      
      setEditingTransactions(transactionsWithAccounts);
      setStep(2);
    } catch (err) {
      console.error('Erro ao processar contracheque:', err);
      
      let errorMessage = 'Erro ao processar contracheque';
      
      if (err.message.includes('API error') || err.message.includes('API key')) {
        errorMessage = 'Erro na API de IA. Verifique se sua chave de API está correta em Configurações → Configuração de IA';
      } else if (err.message.includes('rate limit') || err.message.includes('quota')) {
        errorMessage = 'Limite de uso da API de IA atingido. Tente novamente mais tarde';
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente';
      } else if (err.message.includes('JSON')) {
        errorMessage = 'Erro ao interpretar resposta da IA. O arquivo pode não ser um contracheque válido';
      } else if (err.message.includes('Gemini')) {
        errorMessage = 'Extração de contracheque requer Google Gemini. Configure em Configurações → Configuração de IA';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessFile = async () => {
    if (!file) {
      setError('Selecione um arquivo');
      return;
    }

    // Validar se usuário tem contas ou cartões cadastrados
    if (accounts.length === 0 && cards.length === 0) {
      setError(
        'Você precisa cadastrar pelo menos uma conta bancária ou cartão de crédito antes de importar transações. ' +
        'Vá para a aba "Contas" ou "Cartões" para cadastrar.'
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await processImportFile(file);
      
      // Check if any transactions were extracted
      if (!result.transactions || result.transactions.length === 0) {
        setError(
          'Não foi possível extrair transações do arquivo. ' +
          'Verifique se o arquivo contém dados no formato correto (colunas: data, descrição, valor).'
        );
        setLoading(false);
        return;
      }
      
      setProcessResult(result);
      
      // Build flat category list for enrichment
      const allCategories = Object.values(categories.expense || [])
        .concat(Object.values(categories.income || []))
        .concat(Object.values(categories.investment || []));
      
      // Map category names to IDs and mark auto-categorized items as suggestions
      let transactionsWithCategoryMapping = result.transactions.map(t => {
        const categoryList = Object.values(categories[t.type] || []);
        const matchedCategory = categoryList.find(c => 
          c.name.toLowerCase() === (t.category || '').toLowerCase()
        );
        
        return {
          ...t,
          categoryId: matchedCategory ? matchedCategory.id : null,
          // Normalize category name to the exact registered option (avoid variants)
          category: matchedCategory ? matchedCategory.name : (t.category ?? null),
          isSuggestion: matchedCategory ? true : false, // Mark as suggestion if auto-categorized
          manuallyEdited: false,
          selected: true,
          is_alimony: false,
          // Ensure installment fields exist in preview
          is_installment: t.is_installment || false,
          installment_count: t.installment_count || null,
          installment_due_dates: t.installment_due_dates || [],
          last_installment_date: t.last_installment_date || null
        };
      });

      // Use AI enhancement if available and enabled
      if (useAI && isAIAvailable()) {
        transactionsWithCategoryMapping = await enhanceTransactionsWithAI(
          transactionsWithCategoryMapping, 
          allCategories,
          cards,
          accounts,
          user?.id
        );

        // Normalize AI suggestions to match existing categories exactly
        transactionsWithCategoryMapping = transactionsWithCategoryMapping.map(t => {
          // Skip if already has a categoryId
          if (t.categoryId) return t;
          const typeCategories = Object.values(categories[t.type] || []);
          // Prefer type-specific list; if not found, fallback to any list
          let matched = typeCategories.find(c => c.id === t.aiSuggestedCategory);
          if (!matched) {
            matched = allCategories.find(c => c.id === t.aiSuggestedCategory);
          }
          if (matched) {
            return {
              ...t,
              categoryId: matched.id,
              category: matched.name,
              isSuggestion: true,
              suggestionSource: 'ai',
              manuallyEdited: false
            };
          }
          return t;
        });
      }
      
      // Enrich transactions with historical data and card matching
      if (user && user.id) {
        console.log('🔍 Enriquecendo transações de arquivo com histórico do usuário...');
        transactionsWithCategoryMapping = await enrichTransactionsWithHistory(
          transactionsWithCategoryMapping,
          user.id,
          cards,
          accounts,
          allCategories
        );
      }
      
      // Final processing: apply account/card assignments and pattern learning
      transactionsWithCategoryMapping = await Promise.all(
        transactionsWithCategoryMapping.map(async (t) => {
          const categoryList = Object.values(categories[t.type] || []);
          
          // Try pattern learning if no category yet
          let matchedCategory = t.categoryId ? categoryList.find(c => c.id === t.categoryId) : null;
          let suggestionSource = t.suggestionSource || null;
          
          if (!matchedCategory && user && user.id) {
            const { suggestCategoryFromHistory } = await import('../../services/import/patternLearning');
            const historyMatch = await suggestCategoryFromHistory(user.id, t.description);
            
            if (historyMatch && historyMatch.confidence > 0.5) {
              matchedCategory = categoryList.find(c => c.id === historyMatch.categoryId);
              if (matchedCategory) {
                suggestionSource = 'history';
              }
            }
          }
          
          // Auto-assign account or card based on payment method with intelligent fallback
          // Prefer values already set by enrichment (from historical match or card digit match)
          let defaultAccountId = t.account_id || null;
          let defaultCardId = t.card_id || null;
          let needsReview = false;
          let cardMatchedByDigits = t.cardMatchedByDigits || false;
          
          if (t.payment_method === 'credit_card') {
            // Tentar atribuir cartão se for crédito
            if (!defaultCardId) {
              // Try to match by card digits if available
              if (t.card_last_digits && cards.length > 0) {
                const cardMatch = matchCardByDigits(t.card_last_digits, cards);
                if (cardMatch) {
                  defaultCardId = cardMatch.card.id;
                  cardMatchedByDigits = true;
                  console.log(`💳 Arquivo: Cartão ${cardMatch.card.name} identificado pelos dígitos ${t.card_last_digits}`);
                }
              }
              // Fallback to first card
              if (!defaultCardId && cards.length > 0) {
                defaultCardId = cards[0].id;
              } else if (!defaultCardId) {
                // Fallback: se não tem cartão, tentar conta (usuário pode ajustar depois)
                defaultAccountId = accounts.length > 0 ? accounts[0].id : null;
                needsReview = true;
              }
            }
          } else if (t.payment_method === 'debit_card' || t.payment_method === 'pix' || 
                     t.payment_method === 'transfer' || t.payment_method === 'application' || 
                     t.payment_method === 'redemption') {
            // Tentar atribuir conta para outros métodos (se não já definida por enrichment)
            if (!defaultAccountId) {
              if (accounts.length > 0) {
                // Preferir conta principal se existir
                const primaryAcc = accounts.find(a => a.is_primary);
                defaultAccountId = primaryAcc ? primaryAcc.id : accounts[0].id;
              } else {
                // Sem contas disponíveis - marcar como erro
                needsReview = true;
              }
            }
          }
          
          return {
            ...t,
            categoryId: matchedCategory?.id || t.categoryId || null,
            category: matchedCategory?.name || t.category || null,
            isSuggestion: !!(matchedCategory || t.isSuggestion),
            suggestionSource: suggestionSource || t.suggestionSource,
            account_id: defaultAccountId,
            card_id: defaultCardId,
            cardMatchedByDigits: cardMatchedByDigits,
            needsReview: needsReview
          };
        })
      );
      
      // Log enrichment summary
      const historyMatches = transactionsWithCategoryMapping.filter(t => t.suggestionSource === 'history').length;
      const cardDigitMatches = transactionsWithCategoryMapping.filter(t => t.cardMatchedByDigits).length;
      console.log(`✅ Processamento Arquivo concluído: ${historyMatches} categorias do histórico, ${cardDigitMatches} cartões identificados por dígitos`);
      
      setEditingTransactions(transactionsWithCategoryMapping);
      setStep(2);
    } catch (err) {
      console.error('File processing error:', err);
      
      // Provide user-friendly error messages
      let errorMessage = err.message || 'Erro ao processar arquivo';
      
      if (errorMessage.includes('PDF') || errorMessage.includes('DOC')) {
        errorMessage = err.message; // Use the specific message for PDF/DOC
      } else if (errorMessage.includes('Arquivo vazio')) {
        errorMessage = 'O arquivo está vazio ou corrompido. Tente outro arquivo.';
      } else if (errorMessage.includes('parse') || errorMessage.includes('processar')) {
        errorMessage = 'Erro ao ler o arquivo. Verifique se o arquivo não está corrompido e está em um formato válido.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const selectedTransactions = editingTransactions.filter(t => t.selected);
    if (selectedTransactions.length === 0) {
      setError('Selecione pelo menos uma transação');
      return;
    }

    // Validate that all transactions have account_id or card_id
    const missingLinkage = selectedTransactions.filter(t => !t.account_id && !t.card_id);
    if (missingLinkage.length > 0) {
      // Destacar transações sem vinculação
      const updatedTransactions = editingTransactions.map(t => ({
        ...t,
        hasError: !t.account_id && !t.card_id && t.selected
      }));
      setEditingTransactions(updatedTransactions);
      
      setError(
        `${missingLinkage.length} transação(ões) sem conta ou cartão vinculado. ` +
        `Por favor, selecione uma conta ou cartão para cada transação destacada em vermelho na tabela abaixo. ` +
        `Você também pode desmarcar as transações inválidas para importar apenas as válidas.`
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create import_history record
      const importHistoryData = {
        user_id: user.id,
        file_name: file?.name || (importMode === 'text' ? 'SMS Import' : importMode === 'photo' ? 'Photo Import' : 'Paycheck Import'),
        file_size: file?.size || 0,
        total_rows: processResult?.metadata?.totalRows || editingTransactions.length,
        extracted_transactions: processResult?.metadata?.extractedTransactions || editingTransactions.length,
        imported_transactions: 0,
        failed_transactions: 0,
        status: 'processing',
        metadata: {
          import_type: importMode,
          source: processResult?.metadata?.source || importMode,
          ai_enhanced: processResult?.metadata?.aiEnhanced || false,
          history_matches: processResult?.metadata?.historyMatches || 0,
          card_digit_matches: processResult?.metadata?.cardDigitMatches || 0
        }
      };
      
      const { data: importHistoryRecord, error: importHistoryError } = await createImportHistory(importHistoryData);
      
      if (importHistoryError) {
        console.error('Failed to create import history:', importHistoryError);
      }
      
      const importId = importHistoryRecord?.[0]?.id;
      
      // Create category mapping (normalized for robust lookups)
      const categoryMapping = {};
      Object.values(categories).flat().forEach(cat => {
        const exact = (cat.name || '').trim();
        const lower = exact.toLowerCase();
        categoryMapping[lower] = cat.id;
        categoryMapping[exact] = cat.id;
      });

      // Use the first account as fallback (not used since we validate above)
      const fallbackAccountId = accounts.length > 0 ? accounts[0].id : null;

      // Add import_id to metadata for each transaction
      const transactionsWithImportId = selectedTransactions.map(t => ({
        ...t,
        metadata: {
          ...(t.metadata || {}),
          import_id: importId
        }
      }));

      const result = await importTransactions(
        transactionsWithImportId,
        user.id,
        fallbackAccountId,
        categoryMapping
      );

      // Update import_history with results
      if (importId) {
        await updateImportHistory(importId, {
          imported_transactions: result.imported || 0,
          failed_transactions: result.failed || 0,
          status: result.failed > 0 ? 'partial' : 'completed',
          metadata: {
            ...importHistoryData.metadata,
            errors: result.errors || []
          }
        });
      }

      setImportResult(result);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Erro ao importar transações');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate installment dates
  const calculateInstallmentDates = (startDate, count) => {
    const dates = [];
    const date = new Date(startDate);
    for (let i = 0; i < count; i++) {
      const installmentDate = new Date(date);
      installmentDate.setMonth(date.getMonth() + i);
      dates.push(formatDateLocal(installmentDate));
    }
    return dates;
  };

  const handleTransactionEdit = (index, field, value) => {
    const updated = [...editingTransactions];
    updated[index][field] = value;
    
    // If editing category, mark as manually edited (remove suggestion flag)
    if (field === 'categoryId' || field === 'category') {
      updated[index].isSuggestion = false;
      updated[index].manuallyEdited = true;
      
      // Update both category and categoryId for consistency
      if (field === 'categoryId') {
        // Find category name from ID
        const categoryList = Object.values(categories[updated[index].type] || []);
        const selectedCategory = categoryList.find(c => c.id === value);
        updated[index].category = selectedCategory ? selectedCategory.name : value;
        updated[index].categoryId = value;
      }
    }

    // If updating installment-related fields, recalculate dates
    if (field === 'is_installment' && !value) {
      // Reset installment fields when unchecking
      updated[index].installment_count = null;
      updated[index].installment_due_dates = [];
      updated[index].last_installment_date = null;
    } else if (field === 'installment_count' || (field === 'date' && updated[index].is_installment)) {
      const count = field === 'installment_count' ? parseInt(value) : updated[index].installment_count;
      const startDate = field === 'date' ? value : updated[index].date;
      if (count && count > 0 && startDate) {
        const dates = calculateInstallmentDates(startDate, count);
        updated[index].installment_due_dates = dates;
        updated[index].last_installment_date = dates[dates.length - 1];
      }
    }
    
    setEditingTransactions(updated);
  };

  const toggleTransactionSelection = (index) => {
    const updated = [...editingTransactions];
    updated[index].selected = !updated[index].selected;
    setEditingTransactions(updated);
  };

  const toggleSelectAll = () => {
    const allSelected = editingTransactions.every(t => t.selected);
    const updated = editingTransactions.map(t => ({ ...t, selected: !allSelected }));
    setEditingTransactions(updated);
  };

  const deleteTransaction = (index) => {
    const updated = editingTransactions.filter((_, i) => i !== index);
    setEditingTransactions(updated);
  };

  const handleBulkEdit = () => {
    if (!bulkEditField || !bulkEditValue) {
      setError('Selecione um campo e valor para edição em lote');
      return;
    }

    const selectedIndices = editingTransactions
      .map((t, idx) => (t.selected ? idx : -1))
      .filter(idx => idx !== -1);

    if (selectedIndices.length === 0) {
      setError('Selecione pelo menos uma transação para editar em lote');
      return;
    }

    const updated = [...editingTransactions];
    selectedIndices.forEach(idx => {
      updated[idx][bulkEditField] = bulkEditValue;
    });

    setEditingTransactions(updated);
    setShowBulkEdit(false);
    setBulkEditField('');
    setBulkEditValue('');
    setError('');
  };

  if (!show) return null;

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Importar Transações</h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 1 && 'Faça upload do arquivo'}
              {step === 2 && 'Revise os dados extraídos'}
              {step === 3 && 'Resultado da importação'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, label: 'Upload' },
              { num: 2, label: 'Revisão' },
              { num: 3, label: 'Concluído' }
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step > s.num ? <CheckCircle className="w-6 h-6" /> : s.num}
                  </div>
                  <span className="ml-2 hidden sm:block">{s.label}</span>
                </div>
                {idx < 2 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step > s.num ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto">
              {/* Mode Selection */}
              <div className="mb-6 flex gap-4">
                <button
                  onClick={() => setImportMode('file')}
                  className={`flex-1 p-4 rounded-lg border-2 transition ${
                    importMode === 'file' 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold">Arquivo</h3>
                  <p className="text-sm text-gray-600 mt-1">CSV, Excel, PDF, DOC</p>
                </button>
                
                <button
                  onClick={() => setImportMode('text')}
                  className={`flex-1 p-4 rounded-lg border-2 transition ${
                    importMode === 'text' 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold">SMS/Texto</h3>
                  <p className="text-sm text-gray-600 mt-1">Notificações bancárias</p>
                </button>
                
                <button
                  onClick={() => setImportMode('photo')}
                  className={`flex-1 p-4 rounded-lg border-2 transition ${
                    importMode === 'photo' 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Eye className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold">Foto</h3>
                  <p className="text-sm text-gray-600 mt-1">Comprovantes e notificações</p>
                </button>
                
                <button
                  onClick={() => setImportMode('paycheck')}
                  className={`flex-1 p-4 rounded-lg border-2 transition ${
                    importMode === 'paycheck' 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold">Contracheque</h3>
                  <p className="text-sm text-gray-600 mt-1">PDF ou imagem</p>
                </button>
              </div>

              {/* File Upload Mode */}
              {importMode === 'file' && (
                <>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition">
                    <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Selecione um arquivo para importar
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Formatos suportados: CSV, XLS, XLSX, PDF, DOC
                    </p>
                    <input
                      type="file"
                      accept=".csv,.xls,.xlsx,.pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Escolher Arquivo
                    </label>
                  </div>

                  {file && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                      <FileText className="w-8 h-8 text-blue-600 mr-3" />
                      <div>
                        <p className="font-semibold">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-2 hover:bg-blue-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">💡 Dicas para melhor importação:</h4>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Use arquivos CSV ou Excel com cabeçalhos claros</li>
                  <li>Certifique-se de que as colunas incluam: data, descrição e valor</li>
                  <li>PDFs e DOCs requerem conversão para CSV/Excel ou uso de SMS/Texto</li>
                  <li>Tamanho máximo do arquivo: 10MB</li>
                </ul>
              </div>
                </>
              )}

              {/* SMS/Text Input Mode */}
              {importMode === 'text' && (
                <>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                    <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-center">
                      Cole o texto de SMS ou notificação bancária
                    </h3>
                    <p className="text-gray-600 mb-4 text-center text-sm">
                      Suporta notificações de CAIXA, Nubank, PIX e outros bancos
                    </p>
                    
                    <textarea
                      value={smsText}
                      onChange={(e) => setSmsText(e.target.value)}
                      placeholder="Exemplo:&#10;CAIXA: Compra aprovada COLSANTACECIL R$ 450,00 06/10 às 16:45, ELO VIRTUAL final 6539&#10;&#10;Você pode colar múltiplas notificações, uma por linha..."
                      className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    
                    {(isConfigured || isAIAvailable()) && (
                      <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useAI}
                            onChange={(e) => setUseAI(e.target.checked)}
                            className="mr-3 w-4 h-4"
                          />
                          <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                          <span className="text-sm font-medium text-gray-800">
                            Usar IA avançada para melhor categorização
                          </span>
                        </label>
                        <p className="text-xs text-gray-600 mt-1 ml-9">
                          {isConfigured ? (
                            `IA configurada: ${aiConfig.provider} (${aiConfig.model || 'modelo padrão'})`
                          ) : (
                            `APIs configuradas: ${getAIStatus().providers.gemini.enabled ? 'Gemini' : ''} ${getAIStatus().providers.openai.enabled ? ', ChatGPT' : ''} ${getAIStatus().providers.anthropic.enabled ? ', Claude' : ''}`
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">💡 Exemplos de SMS suportados:</h4>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li className="bg-white p-2 rounded">
                        <span className="font-medium">CAIXA:</span> Compra aprovada LOJA R$ 450,00 06/10 às 16:45
                      </li>
                      <li className="bg-white p-2 rounded">
                        <span className="font-medium">Santander:</span> Compra no cartão final 0405, de R$ 66,00, em 17/10/25, às 18:53, em COMERCIAL CASA, aprovada.
                      </li>
                      <li className="bg-white p-2 rounded">
                        <span className="font-medium">PIX:</span> Você recebeu um Pix de R$ 250,00 de João Silva
                      </li>
                      <li className="bg-white p-2 rounded">
                        <span className="font-medium">Nubank:</span> Compra aprovada: R$ 150,00 em RESTAURANTE XYZ
                      </li>
                    </ul>
                  </div>
                </>
              )}

              {/* Photo Upload Mode */}
              {importMode === 'photo' && (
                <>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                    <Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-center">
                      Envie foto de comprovante ou notificação
                    </h3>
                    <p className="text-gray-600 mb-4 text-center text-sm">
                      Suporta comprovantes PIX, notificações de cartão, recibos
                    </p>
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files[0])}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer mx-auto block w-fit"
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      Escolher Foto
                    </label>
                    
                    {photoFile && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Eye className="w-8 h-8 text-blue-600 mr-3" />
                            <div>
                              <p className="font-semibold">{photoFile.name}</p>
                              <p className="text-sm text-gray-600">
                                {(photoFile.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setPhotoFile(null)}
                            className="p-2 hover:bg-blue-100 rounded-lg"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {/* Preview da foto */}
                        <div className="mt-4">
                          <img 
                            src={URL.createObjectURL(photoFile)} 
                            alt="Preview" 
                            className="max-h-64 mx-auto rounded-lg border"
                          />
                        </div>
                      </div>
                    )}
                    
                    {(isConfigured || isAIAvailable()) && (
                      <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useAI}
                            onChange={(e) => setUseAI(e.target.checked)}
                            className="mr-3 w-4 h-4"
                          />
                          <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                          <span className="text-sm font-medium text-gray-800">
                            Usar IA para extração automática de dados
                          </span>
                        </label>
                        <p className="text-xs text-gray-600 mt-1 ml-9">
                          {isConfigured ? (
                            `IA configurada: ${aiConfig.provider} (${aiConfig.model || 'modelo padrão'})`
                          ) : (
                            `APIs configuradas: ${getAIStatus().providers.gemini.enabled ? 'Gemini' : ''} ${getAIStatus().providers.openai.enabled ? ', ChatGPT' : ''} ${getAIStatus().providers.anthropic.enabled ? ', Claude' : ''}`
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">💡 Tipos de foto suportados:</h4>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li className="bg-white p-2 rounded">
                        <span className="font-medium">📱 Notificações:</span> Screenshots de notificações de cartão
                      </li>
                      <li className="bg-white p-2 rounded">
                        <span className="font-medium">🧾 Comprovantes PIX:</span> Tela de confirmação de PIX
                      </li>
                      <li className="bg-white p-2 rounded">
                        <span className="font-medium">📄 Recibos:</span> Fotos de recibos e notas fiscais
                      </li>
                    </ul>
                  </div>
                </>
              )}

              {/* Paycheck Upload Mode */}
              {importMode === 'paycheck' && (
                <>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                    <DollarSign className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-center">
                      Envie seu contracheque (PDF ou imagem)
                    </h3>
                    <p className="text-gray-600 mb-4 text-center text-sm">
                      A IA irá extrair automaticamente todas as receitas e descontos
                    </p>
                    
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => setPaycheckFile(e.target.files[0])}
                      className="hidden"
                      id="paycheck-upload"
                    />
                    <label
                      htmlFor="paycheck-upload"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer mx-auto block w-fit"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      Escolher Arquivo
                    </label>
                    
                    {paycheckFile && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="w-8 h-8 text-blue-600 mr-3" />
                            <div>
                              <p className="font-semibold">{paycheckFile.name}</p>
                              <p className="text-sm text-gray-600">
                                {(paycheckFile.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setPaycheckFile(null)}
                            className="p-2 hover:bg-blue-100 rounded-lg"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {(isConfigured || isAIAvailable()) && (
                      <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                        <div className="flex items-center">
                          <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                          <span className="text-sm font-medium text-gray-800">
                            Extração automática com IA
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {isConfigured ? (
                            `IA configurada: ${aiConfig.provider} (${aiConfig.model || 'modelo padrão'})`
                          ) : (
                            'Configure a IA em Configurações para usar este recurso'
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">📊 O que será extraído:</h4>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li className="bg-white p-2 rounded">
                        <span className="font-medium">💵 Receitas:</span> Salário, subsídio, auxílios, gratificações
                      </li>
                      <li className="bg-white p-2 rounded">
                        <span className="font-medium">💸 Descontos:</span> INSS, IR, plano de saúde, empréstimos, pensão
                      </li>
                      <li className="bg-white p-2 rounded">
                        <span className="font-medium">🎯 Categorização:</span> Automática baseada em suas categorias
                      </li>
                      <li className="bg-white p-2 rounded">
                        <span className="font-medium">✏️ Edição:</span> Você poderá revisar e editar tudo antes de importar
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && paycheckData && (
            <div>
              <PaycheckPreview
                data={paycheckData}
                categories={categories}
                accounts={accounts}
                cards={cards}
                onTransactionsChange={(updatedTransactions) => {
                  setEditingTransactions(updatedTransactions);
                  setPaycheckData(prev => ({
                    ...prev,
                    transactions: updatedTransactions
                  }));
                }}
                onValidationChange={(validation) => {
                  console.log('📊 Validação atualizada:', validation);
                }}
              />
            </div>
          )}

          {step === 2 && processResult && !paycheckData && (
            <div>
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total de Linhas</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {processResult.metadata.totalRows}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Extraídas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {processResult.transactions.length}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Válidas</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {processResult.validation.validTransactions}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Selecionadas</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {editingTransactions.filter(t => t.selected).length}
                  </p>
                </div>
              </div>

              {processResult.validation.warnings.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-800">Avisos de Validação</p>
                      <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                        {processResult.validation.warnings.slice(0, 5).map((w, i) => (
                          <li key={i}>{w.message}</li>
                        ))}
                        {processResult.validation.warnings.length > 5 && (
                          <li>... e mais {processResult.validation.warnings.length - 5} avisos</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800">Atenção: Revise as categorias e formas de pagamento</p>
                    <p className="text-sm text-blue-700 mt-1">
                      A IA extraiu os <strong>nomes completos</strong> dos estabelecimentos/envolvidos nas transações.
                      As categorias foram automaticamente classificadas usando essas descrições completas para maior precisão. 
                      Campos com <span className="bg-yellow-100 px-1 rounded">fundo amarelo</span> são sugestões da IA.
                      Campos com <span className="bg-purple-100 px-1 rounded">fundo roxo</span> são baseados no seu histórico de transações.
                      Você pode editar qualquer categoria antes de confirmar a importação.
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                      <span className="flex items-center gap-1"><CreditCard className="w-4 h-4 inline" /> Cartões identificados pelos últimos 4 dígitos têm indicador <span className="text-green-600">verde</span>.</span>
                      ✓ Transações similares ao seu histórico foram pré-preenchidas automaticamente.<br/>
                      ✓ Verifique se a vinculação está correta na coluna "Forma de Pagamento".
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary of automatic matches */}
              {processResult.metadata && (processResult.metadata.historyMatches > 0 || processResult.metadata.cardDigitMatches > 0) && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center text-sm text-green-800">
                    <History className="w-4 h-4 mr-2" />
                    <span>
                      <strong>Preenchimento Inteligente:</strong>{' '}
                      {processResult.metadata.historyMatches > 0 && (
                        <span>{processResult.metadata.historyMatches} categoria(s) do histórico</span>
                      )}
                      {processResult.metadata.historyMatches > 0 && processResult.metadata.cardDigitMatches > 0 && ' • '}
                      {processResult.metadata.cardDigitMatches > 0 && (
                        <span>{processResult.metadata.cardDigitMatches} cartão(ões) identificado(s) pelos dígitos</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div className="mb-4 flex justify-between items-center">
                <div className="flex space-x-3">
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {editingTransactions.every(t => t.selected) ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </button>
                  <button
                    onClick={() => setShowBulkEdit(!showBulkEdit)}
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    {showBulkEdit ? 'Fechar Edição em Lote' : 'Edição em Lote'}
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  {editingTransactions.filter(t => t.selected).length} de {editingTransactions.length} selecionadas
                </p>
              </div>

              {showBulkEdit && (
                <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold mb-3 text-purple-900">Edição em Lote</h4>
                  <p className="text-sm text-purple-700 mb-3">
                    Aplicar alterações a todas as transações selecionadas
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={bulkEditField}
                      onChange={(e) => {
                        setBulkEditField(e.target.value);
                        setBulkEditValue('');
                      }}
                      className="p-2 border rounded-lg"
                    >
                      <option value="">Selecione o campo...</option>
                      <option value="type">Tipo</option>
                      <option value="payment_method">Meio de Pagamento</option>
                    </select>
                    
                    {bulkEditField === 'type' && (
                      <select
                        value={bulkEditValue}
                        onChange={(e) => setBulkEditValue(e.target.value)}
                        className="p-2 border rounded-lg"
                      >
                        <option value="">Selecione o valor...</option>
                        <option value="expense">Gasto</option>
                        <option value="income">Receita</option>
                        <option value="investment">Investimento</option>
                      </select>
                    )}
                    
                    {bulkEditField === 'payment_method' && (
                      <select
                        value={bulkEditValue}
                        onChange={(e) => setBulkEditValue(e.target.value)}
                        className="p-2 border rounded-lg"
                      >
                        <option value="">Selecione o valor...</option>
                        <option value="credit_card">Cartão de Crédito</option>
                        <option value="debit_card">Cartão de Débito</option>
                        <option value="pix">PIX</option>
                        <option value="transfer">Transferência</option>
                        <option value="paycheck">Contracheque</option>
                        <option value="application">Aplicação</option>
                        <option value="redemption">Resgate</option>
                      </select>
                    )}
                    
                    <button
                      onClick={handleBulkEdit}
                      disabled={!bulkEditField || !bulkEditValue}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2 text-left w-10"></th>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Descrição</th>
                      <th className="p-2 text-left">Valor</th>
                      <th className="p-2 text-left">Tipo</th>
                      <th className="p-2 text-left">Categoria</th>
                      <th className="p-2 text-left">Meio Pgto.</th>
                      <th className="p-2 text-left">Forma de Pagamento</th>
                      <th className="p-2 text-left">Parcelado</th>
                      <th className="p-2 text-left">Parcelas</th>
                      <th className="p-2 text-left">Pensão</th>
                      <th className="p-2 text-left">Confiança</th>
                      <th className="p-2 text-left w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingTransactions.map((transaction, index) => (
                      <tr key={index} className={`border-b ${!transaction.selected ? 'opacity-50' : ''}`}>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={transaction.selected}
                            onChange={() => toggleTransactionSelection(index)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={transaction.date || ''}
                            onChange={(e) => handleTransactionEdit(index, 'date', e.target.value)}
                            className="w-full p-1 border rounded text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={transaction.description || ''}
                            onChange={(e) => handleTransactionEdit(index, 'description', e.target.value)}
                            className="w-full p-1 border rounded text-xs"
                            title="Nome completo do estabelecimento ou envolvido na transação"
                            placeholder="Nome completo..."
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={transaction.amount || 0}
                            onChange={(e) => handleTransactionEdit(index, 'amount', parseFloat(e.target.value))}
                            className="w-full p-1 border rounded text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={transaction.type || 'expense'}
                            onChange={(e) => handleTransactionEdit(index, 'type', e.target.value)}
                            className="w-full p-1 border rounded text-xs"
                          >
                            <option value="expense">Gasto</option>
                            <option value="income">Receita</option>
                            <option value="investment">Investimento</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <div className="relative">
                            <select
                              value={transaction.categoryId || ''}
                              onChange={(e) => handleTransactionEdit(index, 'categoryId', e.target.value)}
                              className={`w-full p-1 border rounded text-xs ${
                                transaction.isSuggestion && !transaction.manuallyEdited 
                                  ? (transaction.suggestionSource === 'history' 
                                      ? 'bg-purple-50 border-purple-300' 
                                      : 'bg-yellow-50 border-yellow-300')
                                  : 'bg-white'
                              }`}
                              title={transaction.suggestionSource === 'history' 
                                ? 'Categoria sugerida com base no seu histórico de transações'
                                : transaction.suggestionSource === 'ai'
                                  ? 'Categoria sugerida pela IA'
                                  : ''
                              }
                            >
                              <option value="">Selecione...</option>
                              {Object.values(categories[transaction.type] || []).map(cat => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                            {transaction.suggestionSource === 'history' && !transaction.manuallyEdited && (
                              <History className="absolute right-6 top-1/2 -translate-y-1/2 w-3 h-3 text-purple-500" title="Do histórico" />
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <select
                            value={transaction.payment_method || ''}
                            onChange={(e) => handleTransactionEdit(index, 'payment_method', e.target.value)}
                            className="w-full p-1 border rounded text-xs"
                          >
                            <option value="">Selecionar...</option>
                            {transaction.type === 'expense' && (
                              <>
                                <option value="credit_card">Cartão de Crédito</option>
                                <option value="debit_card">Cartão de Débito</option>
                                <option value="pix">PIX</option>
                                <option value="transfer">Transferência</option>
                                <option value="paycheck">Contracheque</option>
                              </>
                            )}
                            {transaction.type === 'income' && (
                              <>
                                <option value="transfer">Transferência</option>
                                <option value="pix">PIX</option>
                                <option value="credit_card">Crédito em Cartão</option>
                                <option value="paycheck">Contracheque</option>
                              </>
                            )}
                            {transaction.type === 'investment' && (
                              <>
                                <option value="application">Aplicação</option>
                                <option value="redemption">Resgate</option>
                              </>
                            )}
                          </select>
                        </td>
                        <td className="p-2">
                          {transaction.payment_method === 'credit_card' ? (
                            <div className="relative">
                              <select
                                value={transaction.card_id || ''}
                                onChange={(e) => handleTransactionEdit(index, 'card_id', e.target.value)}
                                className={`w-full p-1 border rounded text-xs ${
                                  transaction.cardMatchedByDigits 
                                    ? 'bg-green-50 border-green-300' 
                                    : ''
                                }`}
                                title={transaction.cardMatchedByDigits 
                                  ? `Cartão identificado pelos últimos 4 dígitos: ${transaction.card_last_digits}`
                                  : ''
                                }
                              >
                                <option value="">Selecione cartão...</option>
                                {cards.map(card => (
                                  <option key={card.id} value={card.id}>
                                    {card.name} {card.last_digits ? `(*${card.last_digits})` : ''}
                                  </option>
                                ))}
                              </select>
                              {transaction.cardMatchedByDigits && (
                                <CreditCard className="absolute right-6 top-1/2 -translate-y-1/2 w-3 h-3 text-green-500" title={`Identificado pelos dígitos ${transaction.card_last_digits}`} />
                              )}
                              {transaction.card_last_digits && (
                                <span className="block text-[10px] text-gray-500 mt-0.5">
                                  Dígitos: {transaction.card_last_digits}
                                </span>
                              )}
                            </div>
                          ) : (transaction.payment_method === 'debit_card' || transaction.payment_method === 'pix' || transaction.payment_method === 'transfer' || transaction.payment_method === 'bank_account' || transaction.payment_method === 'application' || transaction.payment_method === 'redemption') ? (
                            <select
                              value={transaction.account_id || ''}
                              onChange={(e) => handleTransactionEdit(index, 'account_id', e.target.value)}
                              className="w-full p-1 border rounded text-xs"
                            >
                              <option value="">Selecione conta...</option>
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name}
                                </option>
                              ))}
                            </select>
                          ) : (transaction.payment_method === 'boleto_bancario') ? (
                            <div className="space-y-1">
                              <select
                                value={transaction.account_id || transaction.card_id || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Check if it's a card or account
                                  const isCard = cards.find(c => c.id === value);
                                  if (isCard) {
                                    handleTransactionEdit(index, 'card_id', value);
                                    handleTransactionEdit(index, 'account_id', null);
                                  } else {
                                    handleTransactionEdit(index, 'account_id', value);
                                    handleTransactionEdit(index, 'card_id', null);
                                  }
                                }}
                                className="w-full p-1 border rounded text-xs"
                              >
                                <option value="">Selecione...</option>
                                <optgroup label="Cartões">
                                  {cards.map(card => (
                                    <option key={card.id} value={card.id}>
                                      {card.name}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Contas">
                                  {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                      {acc.name}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">N/A</span>
                          )}
                        </td>
                        {/* Parcelado */}
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={transaction.is_installment || false}
                            onChange={(e) => handleTransactionEdit(index, 'is_installment', e.target.checked)}
                            className="w-4 h-4"
                            title="Transação Parcelada"
                          />
                        </td>
                        {/* Parcelas */}
                        <td className="p-2">
                          {transaction.is_installment ? (
                            <div className="space-y-1">
                              <input
                                type="number"
                                min="2"
                                max="48"
                                value={transaction.installment_count || ''}
                                onChange={(e) => handleTransactionEdit(index, 'installment_count', parseInt(e.target.value))}
                                className="w-16 p-1 border rounded text-xs"
                                placeholder="12"
                              />
                              {transaction.installment_count > 0 && (
                                <div className="text-[10px] space-y-0.5">
                                  <div className="text-green-600 font-medium">
                                    R$ {(transaction.amount / transaction.installment_count).toFixed(2)}/mês
                                  </div>
                                  {transaction.last_installment_date && (
                                    <div className="text-gray-600">
                                      até {formatBrazilianDate(transaction.last_installment_date)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {transaction.type === 'expense' && (
                            <input
                              type="checkbox"
                              checked={transaction.is_alimony || false}
                              onChange={(e) => handleTransactionEdit(index, 'is_alimony', e.target.checked)}
                              className="w-4 h-4"
                              title="Pensão Alimentícia"
                            />
                          )}
                        </td>
                        <td className="p-2">
                          <span className={`text-xs px-2 py-1 rounded ${getConfidenceBadge(transaction.confidence)}`}>
                            {transaction.confidence}%
                          </span>
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => deleteTransaction(index)}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && importResult && (
            <div className="max-w-2xl mx-auto text-center">
              <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                importResult.success ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                {importResult.success ? (
                  <CheckCircle className="w-12 h-12 text-green-600" />
                ) : (
                  <AlertTriangle className="w-12 h-12 text-yellow-600" />
                )}
              </div>

              <h3 className="text-2xl font-bold mb-2">
                {importResult.success ? 'Importação Concluída!' : 'Importação Parcial'}
              </h3>
              <p className="text-gray-600 mb-6">
                {importResult.success 
                  ? 'Todas as transações foram importadas com sucesso.'
                  : 'Algumas transações não puderam ser importadas.'}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Importadas</p>
                  <p className="text-3xl font-bold text-green-600">{importResult.imported}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Falharam</p>
                  <p className="text-3xl font-bold text-red-600">{importResult.failed}</p>
                </div>
              </div>

              {importResult.failed > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg text-left">
                  <p className="font-semibold text-yellow-800 mb-2">Transações com erro:</p>
                  <ul className="text-sm text-yellow-700 space-y-1 max-h-40 overflow-y-auto">
                    {importResult.failedTransactions.map((t, i) => (
                      <li key={i}>
                        {t.description}: {t.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 border rounded-lg hover:bg-gray-100"
          >
            {step === 3 ? 'Fechar' : 'Cancelar'}
          </button>

          <div className="flex space-x-3">
            {step > 1 && step < 3 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 border rounded-lg hover:bg-gray-100"
                disabled={loading}
              >
                Voltar
              </button>
            )}

            {step === 1 && (
              <button
                onClick={
                  importMode === 'file' ? handleProcessFile : 
                  importMode === 'text' ? handleProcessSMS : 
                  importMode === 'photo' ? handleProcessPhoto :
                  handleProcessPaycheck
                }
                disabled={
                  (importMode === 'file' && !file) || 
                  (importMode === 'text' && !smsText.trim()) || 
                  (importMode === 'photo' && !photoFile) ||
                  (importMode === 'paycheck' && !paycheckFile) ||
                  loading
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5 mr-2" />
                    {importMode === 'file' ? 'Processar Arquivo' : 
                     importMode === 'text' ? 'Processar SMS' : 
                     importMode === 'photo' ? 'Processar Foto' :
                     'Processar Contracheque'}
                  </>
                )}
              </button>
            )}

            {step === 2 && (
              <button
                onClick={handleImport}
                disabled={editingTransactions.filter(t => t.selected).length === 0 || loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Importar Transações
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
