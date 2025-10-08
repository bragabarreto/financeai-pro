import React, { useState, useEffect } from 'react';
import { 
  X, Upload, FileText, AlertCircle, CheckCircle, 
  Loader, Image, MessageSquare, Sparkles, Settings
} from 'lucide-react';
import { processImportFile, importTransactions } from '../../services/import/importService';
import { extractFromSMSWithAI, extractMultipleFromText } from '../../services/import/smsExtractorAI';
import { extractFromPhotoWithAI, extractMultipleFromPhotos } from '../../services/import/photoExtractorAI';
import { loadAIConfig, isAIConfigured } from '../../services/import/aiConfigHelper';

const ImportModalEnhanced = ({ show, onClose, user, accounts, categories, cards = [] }) => {
  const [step, setStep] = useState(1); // 1: Mode Selection, 2: Upload/Input, 3: Preview, 4: Result
  const [importMode, setImportMode] = useState(''); // 'file', 'sms', 'photo'
  const [file, setFile] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [smsText, setSmsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [aiConfig, setAiConfig] = useState(null);

  useEffect(() => {
    if (show) {
      resetState();
      setAiConfig(loadAIConfig());
    }
  }, [show]);

  const resetState = () => {
    setStep(1);
    setImportMode('');
    setFile(null);
    setPhotos([]);
    setSmsText('');
    setLoading(false);
    setError('');
    setTransactions([]);
    setImportResult(null);
  };

  const handleModeSelect = (mode) => {
    setImportMode(mode);
    setStep(2);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handlePhotoSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setPhotos(selectedFiles);
      setError('');
    }
  };

  const handleProcessCSV = async () => {
    if (!file) {
      setError('Selecione um arquivo CSV');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await processImportFile(file);
      setTransactions(result.transactions.map(t => ({ ...t, selected: true })));
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessSMS = async () => {
    if (!smsText || smsText.trim().length < 10) {
      setError('Cole o texto do SMS ou notificação');
      return;
    }

    if (!isAIConfigured()) {
      setError('Configure a IA nas configurações para usar esta funcionalidade');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const aiConfig = loadAIConfig();
      const messages = smsText.split(/\n\n+/).filter(msg => msg.trim().length > 10);
      const extractedTransactions = [];

      for (const message of messages) {
        try {
          const extracted = await extractFromSMSWithAI(message, aiConfig, cards);
          if (extracted && extracted.amount > 0) {
            extractedTransactions.push({ ...extracted, selected: true });
          }
        } catch (err) {
          console.error('Erro ao extrair SMS:', err);
        }
      }

      if (extractedTransactions.length === 0) {
        setError('Não foi possível extrair transações do texto fornecido');
        return;
      }

      setTransactions(extractedTransactions);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPhotos = async () => {
    if (photos.length === 0) {
      setError('Selecione pelo menos uma foto');
      return;
    }

    if (!isAIConfigured()) {
      setError('Configure a IA nas configurações para usar esta funcionalidade');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const aiConfig = loadAIConfig();
      const extractedTransactions = await extractMultipleFromPhotos(photos, aiConfig, cards);
      
      const validTransactions = extractedTransactions.filter(t => !t.error && t.amount > 0);
      
      if (validTransactions.length === 0) {
        setError('Não foi possível extrair transações das fotos');
        return;
      }

      setTransactions(validTransactions.map(t => ({ ...t, selected: true })));
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const selectedTransactions = transactions.filter(t => t.selected);
    
    if (selectedTransactions.length === 0) {
      setError('Selecione pelo menos uma transação para importar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Map categories
      const categoryMapping = {};
      Object.entries(categories).forEach(([type, cats]) => {
        Object.entries(cats).forEach(([id, cat]) => {
          categoryMapping[cat.name] = id;
        });
      });

      // Get default account
      const defaultAccount = accounts[0]?.id;

      const result = await importTransactions(
        selectedTransactions,
        user.id,
        defaultAccount,
        categoryMapping
      );

      setImportResult(result);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionEdit = (index, field, value) => {
    const updated = [...transactions];
    updated[index] = { ...updated[index], [field]: value };
    setTransactions(updated);
  };

  const handleToggleTransaction = (index) => {
    const updated = [...transactions];
    updated[index].selected = !updated[index].selected;
    setTransactions(updated);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Importar Transações</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Mode Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">Escolha como deseja importar suas transações:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CSV Import */}
                <button
                  onClick={() => handleModeSelect('file')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <FileText className="w-12 h-12 text-blue-600 mb-3" />
                  <h3 className="font-bold text-lg mb-2">Arquivo CSV</h3>
                  <p className="text-sm text-gray-600">
                    Importe transações de arquivos CSV exportados do seu banco
                  </p>
                </button>

                {/* SMS Import */}
                <button
                  onClick={() => handleModeSelect('sms')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left relative"
                >
                  <MessageSquare className="w-12 h-12 text-green-600 mb-3" />
                  <h3 className="font-bold text-lg mb-2">SMS Bancário</h3>
                  <p className="text-sm text-gray-600">
                    Cole textos de SMS de notificações bancárias
                  </p>
                  {isAIConfigured() && (
                    <div className="absolute top-2 right-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                  )}
                </button>

                {/* Photo Import */}
                <button
                  onClick={() => handleModeSelect('photo')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left relative"
                >
                  <Image className="w-12 h-12 text-purple-600 mb-3" />
                  <h3 className="font-bold text-lg mb-2">Foto de Comprovante</h3>
                  <p className="text-sm text-gray-600">
                    Envie fotos de comprovantes PIX, cartão, etc.
                  </p>
                  {isAIConfigured() && (
                    <div className="absolute top-2 right-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                  )}
                </button>
              </div>

              {!isAIConfigured() && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-900">
                      <p className="font-medium mb-1">Configure a IA para melhor precisão</p>
                      <p>
                        Para usar extração de SMS e fotos com IA, configure uma chave API nas configurações.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Upload/Input */}
          {step === 2 && (
            <div className="space-y-4">
              <button
                onClick={() => setStep(1)}
                className="text-blue-600 hover:underline mb-4"
              >
                ← Voltar
              </button>

              {importMode === 'file' && (
                <div>
                  <h3 className="font-bold text-lg mb-4">Upload de Arquivo CSV</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="cursor-pointer text-blue-600 hover:underline"
                    >
                      Clique para selecionar arquivo CSV
                    </label>
                    {file && (
                      <p className="mt-2 text-sm text-gray-600">
                        Arquivo selecionado: {file.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleProcessCSV}
                    disabled={!file || loading}
                    className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Processando...' : 'Processar Arquivo'}
                  </button>
                </div>
              )}

              {importMode === 'sms' && (
                <div>
                  <h3 className="font-bold text-lg mb-4">Cole o Texto do SMS</h3>
                  <textarea
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    placeholder="Cole aqui o texto das notificações SMS bancárias..."
                    className="w-full h-64 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={handleProcessSMS}
                    disabled={!smsText || loading}
                    className="mt-4 w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Extraindo com IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Extrair Transações</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {importMode === 'photo' && (
                <div>
                  <h3 className="font-bold text-lg mb-4">Selecione Fotos de Comprovantes</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="cursor-pointer text-purple-600 hover:underline"
                    >
                      Clique para selecionar fotos
                    </label>
                    {photos.length > 0 && (
                      <p className="mt-2 text-sm text-gray-600">
                        {photos.length} foto(s) selecionada(s)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleProcessPhotos}
                    disabled={photos.length === 0 || loading}
                    className="mt-4 w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Extraindo com IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Extrair Transações</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-900">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">
                  Revisar Transações ({transactions.filter(t => t.selected).length} selecionadas)
                </h3>
                <button
                  onClick={() => setStep(2)}
                  className="text-blue-600 hover:underline"
                >
                  ← Voltar
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {transactions.map((transaction, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      transaction.selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={transaction.selected}
                        onChange={() => handleToggleTransaction(index)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          R$ {transaction.amount.toFixed(2)} • {transaction.date} • {transaction.type}
                        </div>
                        {transaction.confidence && (
                          <div className="text-xs text-gray-500 mt-1">
                            Confiança: {transaction.confidence}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleImport}
                disabled={transactions.filter(t => t.selected).length === 0 || loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Importando...' : 'Importar Transações Selecionadas'}
              </button>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-900">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Result */}
          {step === 4 && importResult && (
            <div className="space-y-4">
              <div className="text-center">
                {importResult.success ? (
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                ) : (
                  <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                )}
                <h3 className="text-2xl font-bold mb-2">
                  {importResult.success ? 'Importação Concluída!' : 'Importação Parcial'}
                </h3>
                <p className="text-gray-600">
                  {importResult.imported} transação(ões) importada(s)
                  {importResult.failed > 0 && ` • ${importResult.failed} falhou(aram)`}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModalEnhanced;
