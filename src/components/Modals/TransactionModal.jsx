import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

const TransactionModal = ({ show, onClose, onSave, transaction, categories, accounts }) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    description: '',
    amount: 0,
    category: '',
    account_id: '',
    date: new Date().toISOString().split('T')[0],
    origin: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      setFormData(transaction);
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

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {transaction ? 'Editar' : 'Nova'} Transação
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
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value, category: '' })}
              className="w-full p-2 border rounded-lg"
              disabled={!!transaction}
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
              <option value="investment">Investimento</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descrição</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="Ex: Supermercado"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Valor</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full p-2 border rounded-lg"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Categoria</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2 border rounded-lg"
              required
            >
              <option value="">Selecione...</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Conta</label>
            <select
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              className="w-full p-2 border rounded-lg"
              required
            >
              <option value="">Selecione...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} - {acc.institution}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Data</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>

          {formData.type === 'income' && (
            <div>
              <label className="block text-sm font-medium mb-2">Origem (opcional)</label>
              <select
                value={formData.origin || ''}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Selecione...</option>
                <option value="salário">Salário</option>
                <option value="empréstimos">Empréstimos</option>
                <option value="trabalhos avulso">Trabalhos Avulsos</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300"
          >
            {loading ? 'Salvando...' : transaction ? 'Salvar Alterações' : 'Criar Transação'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
