import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

const AccountModal = ({ show, onClose, onSave, account }) => {
  const [formData, setFormData] = useState({
    name: '',
    institution: '',
    type: 'corrente',
    balance: 0,
    investment_type: '',
    specific_type: '',
    crypto_type: '',
    created_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const investmentTypes = ['ações', 'fundos de investimentos', 'CDB', 'LCI', 'LCA', 'criptomoedas', 'outros'];
  const cryptoTypes = ['Bitcoin (BTC)', 'Ethereum (ETH)', 'Cardano (ADA)', 'Solana (SOL)', 'Outros'];

  useEffect(() => {
    if (account) {
      setFormData(account);
    }
  }, [account]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.institution.trim()) {
      setError('Nome e instituição são obrigatórios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao salvar conta');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {account ? 'Editar' : 'Nova'} Conta
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nome da Conta</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="Ex: Nubank Principal"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Instituição Financeira</label>
            <input
              type="text"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="Ex: Nubank S.A."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Conta</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="corrente">Conta Corrente</option>
              <option value="poupança">Conta Poupança</option>
              <option value="investimentos">Conta Investimentos</option>
            </select>
          </div>

          {formData.type === 'investimentos' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de Investimento</label>
                <select
                  value={formData.investment_type || ''}
                  onChange={(e) => setFormData({ ...formData, investment_type: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Selecione...</option>
                  {investmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {formData.investment_type === 'criptomoedas' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Criptomoeda</label>
                  <select
                    value={formData.crypto_type || ''}
                    onChange={(e) => setFormData({ ...formData, crypto_type: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    {cryptoTypes.map(crypto => (
                      <option key={crypto} value={crypto}>{crypto}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.investment_type && formData.investment_type !== 'criptomoedas' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Especificação</label>
                  <input
                    type="text"
                    value={formData.specific_type || ''}
                    onChange={(e) => setFormData({ ...formData, specific_type: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Ex: ITUB4, Tesouro Selic 2027"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Saldo Inicial</label>
            <input
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
              className="w-full p-2 border rounded-lg"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Data de Criação</label>
            <input
              type="date"
              value={formData.created_date}
              onChange={(e) => setFormData({ ...formData, created_date: e.target.value })}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300"
          >
            {loading ? 'Salvando...' : account ? 'Salvar Alterações' : 'Criar Conta'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountModal;