import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Star } from 'lucide-react';

const AccountModal = ({ show, onClose, onSave, account }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'corrente',
    balance: 0,
    color: 'bg-blue-500',
    is_primary: false // NOVO CAMPO
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const accountTypes = [
    { value: 'corrente', label: 'Conta Corrente' },
    { value: 'poupança', label: 'Poupança' },
    { value: 'investimento', label: 'Conta Investimento' },
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'outro', label: 'Outro' }
  ];

  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
    'bg-red-500', 'bg-yellow-500', 'bg-gray-500'
  ];

  useEffect(() => {
    if (account) {
      setFormData({
        ...account,
        is_primary: account.is_primary || false
      });
    }
  }, [account]);

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!formData.name.trim()) {
    setError('Nome é obrigatório');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // Prepare os dados SEM o ID para criação
    const dataToSave = {
      name: formData.name,
      type: formData.type,
      balance: parseFloat(formData.balance) || 0,
      color: formData.color || 'bg-blue-500',
      is_primary: formData.is_primary || false
    };
    
    // Só adicione ID se for edição E o ID existir
    if (account && account.id) {
      dataToSave.id = account.id;
    }
    
    console.log('Modal enviando:', dataToSave);
    console.log('É edição?', !!(account && account.id));
    
    await onSave(dataToSave);
    onClose();
  } catch (err) {
    console.error('Erro:', err);
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
            {account ? 'Editar Conta' : 'Nova Conta'}
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
            <label className="block text-sm font-medium mb-1">Nome da Conta *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Conta</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {accountTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Saldo Inicial</label>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value)})}
              step="0.01"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cor</label>
            <div className="grid grid-cols-6 gap-2">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({...formData, color})}
                  className={`h-8 rounded ${color} ${
                    formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Campo de Conta Principal */}
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_primary"
                checked={formData.is_primary}
                onChange={(e) => setFormData({...formData, is_primary: e.target.checked})}
                className="mr-3 w-4 h-4 text-yellow-600 focus:ring-yellow-500"
              />
              <label htmlFor="is_primary" className="flex items-center cursor-pointer">
                <Star className="w-4 h-4 mr-2 text-yellow-600" />
                <span className="text-sm font-medium">Definir como Conta Principal (Salário)</span>
              </label>
            </div>
            {formData.is_primary && (
              <p className="text-xs text-yellow-700 mt-2 ml-7">
                Esta será a conta padrão para recebimentos e pagamentos
              </p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : account ? 'Salvar Alterações' : 'Criar Conta'}
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

export default AccountModal;


