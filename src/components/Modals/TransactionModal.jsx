import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Users } from 'lucide-react';

const TransactionModal = ({ show, onClose, onSave, transaction, categories, accounts }) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    description: '',
    amount: 0,
    category: '',
    account_id: '',
    date: new Date().toISOString().split('T')[0],
    origin: '',
    is_alimony: false // NOVO CAMPO
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      setFormData({
        ...transaction,
        is_alimony: transaction.is_alimony || false
      });
    }
  }, [transaction]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.category || !formData.account_id) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.amount <= 0) {
      setError('Valor deve ser maior que zero');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao salvar transação');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);
  
  // Encontrar conta principal
  const primaryAccount = accounts.find(acc => acc.is_primary);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {transaction ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value, is_alimony: false})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
              <option value="investment">Investimento</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Valor *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Categoria *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione...</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {filteredCategories.length >= 50 && (
              <p className="text-xs text-yellow-600 mt-1">
                Limite de 50 categorias atingido para este tipo
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Conta *</label>
            <select
              value={formData.account_id || (primaryAccount?.id || '')}
              onChange={(e) => setFormData({...formData, account_id: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} {acc.is_primary && '⭐ (Principal)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Campo de Pensão Alimentícia - Apenas para despesas */}
          {formData.type === 'expense' && (
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_alimony"
                  checked={formData.is_alimony}
                  onChange={(e) => setFormData({...formData, is_alimony: e.target.checked})}
                  className="mr-3 w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="is_alimony" className="flex items-center cursor-pointer">
                  <Users className="w-4 h-4 mr-2 text-purple-600" />
                  <span className="text-sm font-medium">Marcar como Pensão Alimentícia</span>
                </label>
              </div>
              {formData.is_alimony && (
                <p className="text-xs text-purple-600 mt-2 ml-7">
                  Esta despesa será contabilizada nos relatórios de pensão alimentícia
                </p>
              )}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : transaction ? 'Salvar Alterações' : 'Criar Transação'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
