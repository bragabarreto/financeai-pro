import React, { useState } from 'react';
import { X, AlertCircle, Upload, Check, Edit2, FileText } from 'lucide-react';
import { extractTransactionsFromFile, categorizeTransactions } from '../../services/aiExtractor';
import { formatDateLocal } from '../../utils/dateUtils';Extractor';

const ImportModal = ({ show, onClose, onSave, categories, accounts, userId }) => {
  const [step, setStep] = useState('upload'); // upload, preview, processing
  const [file, setFile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show) {
      // Reset state when modal closes
      setStep('upload');
      setFile(null);
      setTransactions([]);
      setEditingIndex(null);
      setError('');
    }
  }, [show]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError('Selecione um arquivo primeiro');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          
          // Extrair transações do arquivo
          const extractedTransactions = extractTransactionsFromFile(content, 'csv');
          
          if (extractedTransactions.length === 0) {
            setError('Nenhuma transação encontrada no arquivo');
            setLoading(false);
            return;
          }

          // Categorizar transações
          const categorizedTransactions = await categorizeTransactions(extractedTransactions, userId);
          
          setTransactions(categorizedTransactions);
          setStep('preview');
          setLoading(false);
        } catch (err) {
          console.error('Erro ao processar arquivo:', err);
          setError('Erro ao processar arquivo. Verifique o formato.');
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setError('Erro ao ler arquivo');
        setLoading(false);
      };

      reader.readAsText(file);
    } catch (err) {
      console.error('Erro ao carregar arquivo:', err);
      setError('Erro ao carregar arquivo');
      setLoading(false);
    }
  };

  const handleTransactionUpdate = (index, field, value) => {
    const updated = [...transactions];
    updated[index] = {
      ...updated[index],
      [field]: value,
      // Se usuário editar manualmente, marcar como não-sugestão
      isSuggestion: field === 'category' ? false : updated[index].isSuggestion
    };
    
    // If updating installment-related fields, recalculate dates
    if (field === 'is_installment' && !value) {
      // Reset installment fields when unchecking
      updated[index].installment_count = null;
      updated[index].installment_due_dates = [];
      updated[index].last_installment_date = null;
    } else if (field === 'installment_count' || (field === 'date' && updated[index].is_installment)) {
      // Recalculate dates when count or date changes
      const count = field === 'installment_count' ? parseInt(value) : updated[index].installment_count;
      const startDate = field === 'date' ? value : updated[index].date;
      
      if (count > 0 && startDate) {
        const dates = calculateInstallmentDates(startDate, count);
        updated[index].installment_due_dates = dates;
        updated[index].last_installment_date = dates[dates.length - 1];
      }
    }
    
    setTransactions(updated);
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

  const handleRemoveTransaction = (index) => {
    setTransactions(transactions.filter((_, i) => i !== index));
  };

  const handleConfirmImport = async () => {
    // Validar que todas as transações têm categoria e conta
    const invalidTransactions = transactions.filter(t => !t.category || !t.account_id);
    
    if (invalidTransactions.length > 0) {
      setError(`${invalidTransactions.length} transação(ões) sem categoria ou conta definida`);
      return;
    }

    setLoading(true);
    
    try {
      // Salvar todas as transações
      await onSave(transactions);
      onClose();
    } catch (err) {
      setError('Erro ao salvar transações');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId, type) => {
    const categoryList = categories[type] || [];
    const category = categoryList.find(c => c.id === categoryId);
    return category ? category.name : 'Não definida';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.7) return 'text-green-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.7) return 'Alta confiança';
    if (confidence >= 0.4) return 'Média confiança';
    return 'Baixa confiança';
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Importar Transações</h2>
              <p className="text-sm text-gray-600">
                {step === 'upload' && 'Faça upload de um arquivo CSV'}
                {step === 'preview' && `${transactions.length} transação(ões) encontrada(s)`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Selecione um arquivo CSV</h3>
                <p className="text-sm text-gray-600 mb-4">
                  O arquivo deve conter colunas: Data, Descrição, Valor e opcionalmente Tipo
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition"
                >
                  Escolher Arquivo
                </label>
                {file && (
                  <p className="mt-4 text-sm text-gray-700">
                    Arquivo selecionado: <strong>{file.name}</strong>
                  </p>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Formato esperado do CSV:</h4>
                <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
{`Data,Descrição,Valor,Tipo
01/01/2024,Supermercado XYZ,150.00,gasto
02/01/2024,Salário,3000.00,receita`}
                </pre>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Revise as categorias sugeridas automaticamente. 
                  Você pode editar qualquer campo antes de confirmar a importação.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conta</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parcelado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parcelas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confiança</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="date"
                            value={transaction.date}
                            onChange={(e) => handleTransactionUpdate(index, 'date', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="text"
                            value={transaction.description}
                            onChange={(e) => handleTransactionUpdate(index, 'description', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="number"
                            step="0.01"
                            value={transaction.amount}
                            onChange={(e) => handleTransactionUpdate(index, 'amount', parseFloat(e.target.value))}
                            className="w-24 px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <select
                            value={transaction.type}
                            onChange={(e) => handleTransactionUpdate(index, 'type', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="expense">Gasto</option>
                            <option value="income">Receita</option>
                            <option value="investment">Investimento</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <select
                            value={transaction.category || ''}
                            onChange={(e) => handleTransactionUpdate(index, 'category', e.target.value)}
                            className={`w-full px-2 py-1 border rounded text-sm ${
                              transaction.isSuggestion ? 'bg-yellow-50' : 'bg-white'
                            }`}
                          >
                            <option value="">Selecione...</option>
                            {(categories[transaction.type] || []).map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <select
                            value={transaction.account_id || ''}
                            onChange={(e) => handleTransactionUpdate(index, 'account_id', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="">Selecione...</option>
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="checkbox"
                            checked={transaction.is_installment || false}
                            onChange={(e) => handleTransactionUpdate(index, 'is_installment', e.target.checked)}
                            className="w-4 h-4 text-blue-600"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {transaction.is_installment ? (
                            <div className="space-y-1">
                              <input
                                type="number"
                                min="2"
                                max="48"
                                value={transaction.installment_count || ''}
                                onChange={(e) => handleTransactionUpdate(index, 'installment_count', parseInt(e.target.value))}
                                className="w-16 px-2 py-1 border rounded text-sm"
                                placeholder="12"
                              />
                              {transaction.installment_count > 0 && transaction.last_installment_date && (
                                <div className="text-xs text-gray-600">
                                  até {new Date(transaction.last_installment_date).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {transaction.isSuggestion && transaction.category ? (
                            <span className={`text-xs ${getConfidenceColor(transaction.categoryConfidence)}`}>
                              {getConfidenceLabel(transaction.categoryConfidence)}
                            </span>
                          ) : (
                            <span className="text-xs text-green-600">
                              {transaction.category ? 'Confirmada' : 'Pendente'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleRemoveTransaction(index)}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                            title="Remover"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {transactions.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Nenhuma transação para importar
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {step === 'preview' && (
              <span>
                {transactions.filter(t => t.category && t.account_id).length} de {transactions.length} transações prontas para importar
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
            {step === 'upload' && (
              <button
                onClick={handleFileUpload}
                disabled={!file || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Processando...' : 'Processar Arquivo'}
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={handleConfirmImport}
                disabled={transactions.length === 0 || loading}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Check className="w-5 h-5" />
                <span>{loading ? 'Importando...' : 'Confirmar Importação'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
