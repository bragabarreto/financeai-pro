import React, { useState, useEffect } from 'react';
import { 
  X, Upload, FileText, AlertCircle, CheckCircle, 
  Loader, Download, Eye, Edit2, Trash2, Save,
  AlertTriangle
} from 'lucide-react';
import { processImportFile, importTransactions } from '../../services/import/importService';

const ImportModal = ({ show, onClose, user, accounts, categories, cards = [] }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Confirm, 4: Result
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processResult, setProcessResult] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [editingTransactions, setEditingTransactions] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [bulkEditField, setBulkEditField] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [showBulkEdit, setShowBulkEdit] = useState(false);

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
    setSelectedAccount(accounts.length > 0 ? accounts[0].id : '');
    setEditingTransactions([]);
    setImportResult(null);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleProcessFile = async () => {
    if (!file) {
      setError('Selecione um arquivo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await processImportFile(file);
      setProcessResult(result);
      
      // Map category names to IDs and mark auto-categorized items as suggestions
      const transactionsWithCategoryMapping = result.transactions.map(t => {
        const categoryList = Object.values(categories[t.type] || []);
        const matchedCategory = categoryList.find(c => 
          c.name.toLowerCase() === (t.category || '').toLowerCase()
        );
        
        return {
          ...t,
          categoryId: matchedCategory ? matchedCategory.id : null,
          isSuggestion: matchedCategory ? true : false, // Mark as suggestion if auto-categorized
          manuallyEdited: false,
          selected: true
        };
      });
      
      setEditingTransactions(transactionsWithCategoryMapping);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Erro ao processar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedAccount) {
      setError('Selecione uma conta');
      return;
    }

    const selectedTransactions = editingTransactions.filter(t => t.selected);
    if (selectedTransactions.length === 0) {
      setError('Selecione pelo menos uma transação');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create category mapping
      const categoryMapping = {};
      Object.values(categories).flat().forEach(cat => {
        categoryMapping[cat.name.toLowerCase()] = cat.id;
        categoryMapping[cat.name] = cat.id;
      });

      const result = await importTransactions(
        selectedTransactions,
        user.id,
        selectedAccount,
        categoryMapping
      );

      setImportResult(result);
      setStep(4);
    } catch (err) {
      setError(err.message || 'Erro ao importar transações');
    } finally {
      setLoading(false);
    }
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
              {step === 3 && 'Confirme a importação'}
              {step === 4 && 'Resultado da importação'}
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
              { num: 3, label: 'Confirmar' },
              { num: 4, label: 'Concluído' }
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
                {idx < 3 && (
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition">
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Selecione um arquivo para importar
                </h3>
                <p className="text-gray-600 mb-4">
                  Formatos suportados: CSV, XLS, XLSX, PDF
                </p>
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx,.pdf"
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
                  <li>Para PDFs, a extração pode exigir revisão manual</li>
                  <li>Tamanho máximo do arquivo: 10MB</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && processResult && (
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
                    <p className="font-semibold text-blue-800">Atenção: Revise as categorias sugeridas</p>
                    <p className="text-sm text-blue-700 mt-1">
                      As categorias foram automaticamente classificadas com base nas descrições. 
                      Campos com <span className="bg-yellow-100 px-1 rounded">fundo amarelo</span> são sugestões automáticas. 
                      Você pode editar qualquer categoria antes de confirmar a importação.
                      Após editar, o campo perderá o destaque amarelo.
                    </p>
                  </div>
                </div>
              </div>

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
                        <option value="boleto_bancario">Boleto Bancário</option>
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
                          <select
                            value={transaction.categoryId || ''}
                            onChange={(e) => handleTransactionEdit(index, 'categoryId', e.target.value)}
                            className={`w-full p-1 border rounded text-xs ${
                              transaction.isSuggestion && !transaction.manuallyEdited ? 'bg-yellow-50 border-yellow-300' : 'bg-white'
                            }`}
                          >
                            <option value="">Selecione...</option>
                            {Object.values(categories[transaction.type] || []).map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}{transaction.isSuggestion && !transaction.manuallyEdited && transaction.categoryId === cat.id ? ' (sugerido)' : ''}
                              </option>
                            ))}
                          </select>
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
                                <option value="boleto_bancario">Boleto Bancário</option>
                                <option value="paycheck">Contracheque</option>
                              </>
                            )}
                            {transaction.type === 'income' && (
                              <>
                                <option value="pix">PIX</option>
                                <option value="transfer">Transferência</option>
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
                          {(transaction.payment_method === 'credit_card') ? (
                            <select
                              value={transaction.card_id || ''}
                              onChange={(e) => handleTransactionEdit(index, 'card_id', e.target.value)}
                              className="w-full p-1 border rounded text-xs"
                            >
                              <option value="">Selecione cartão...</option>
                              {cards.map(card => (
                                <option key={card.id} value={card.id}>
                                  {card.name}
                                </option>
                              ))}
                            </select>
                          ) : (transaction.payment_method === 'pix' || transaction.payment_method === 'debit_card' || transaction.payment_method === 'transfer' || transaction.payment_method === 'application' || transaction.payment_method === 'redemption') ? (
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

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Selecione a conta de destino *
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="">Selecione uma conta</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} - R$ {account.balance?.toFixed(2) || '0.00'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-4">Resumo da Importação</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Transações a importar:</span>
                    <span className="font-semibold">
                      {editingTransactions.filter(t => t.selected).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Receitas:</span>
                    <span className="font-semibold text-green-600">
                      {editingTransactions.filter(t => t.selected && t.type === 'income').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos:</span>
                    <span className="font-semibold text-red-600">
                      {editingTransactions.filter(t => t.selected && t.type === 'expense').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Investimentos:</span>
                    <span className="font-semibold text-purple-600">
                      {editingTransactions.filter(t => t.selected && t.type === 'investment').length}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>Valor total:</span>
                    <span className="font-semibold">
                      R$ {editingTransactions
                        .filter(t => t.selected)
                        .reduce((sum, t) => {
                          if (t.type === 'income') return sum + t.amount;
                          if (t.type === 'expense') return sum - t.amount;
                          return sum; // investments are neutral in balance
                        }, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 4 && importResult && (
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
            {step === 4 ? 'Fechar' : 'Cancelar'}
          </button>

          <div className="flex space-x-3">
            {step > 1 && step < 4 && (
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
                onClick={handleProcessFile}
                disabled={!file || loading}
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
                    Processar Arquivo
                  </>
                )}
              </button>
            )}

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={editingTransactions.filter(t => t.selected).length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleImport}
                disabled={!selectedAccount || loading}
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
