import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

const CategoryModal = ({ show, onClose, onSave, category, type }) => {
  const [formData, setFormData] = useState({
    name: '',
    icon: '📦',
    color: 'bg-gray-500',
    type: type || 'expense',
    origin: '',
    investment_type: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const colors = [
  // Cores Vivas
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
  'bg-pink-500', 'bg-rose-500',

  // Tons Neutros e Escuros
  'bg-slate-500', 'bg-gray-500', 'bg-zinc-500', 'bg-neutral-500', 'bg-stone-500'
];

const icons = [
  // Alimentação & Bebidas
  '🍔', '🛒', '🍽️', '🍹', '🍺', '🍷',

  // Casa & Contas
  '🏠', '🔑', '💡', '⚡', '💧', '🏢', '🧹', '🌐',

  // Transporte & Veículo
  '🚗', '⛽', '🔧', '🅿️', '🚌', '🚇',

  // Compras & Lazer
  '🛍️', '🎁', '👕', '🎮', '🎬', '🎭', '🏞️', '🎶',

  // Educação & Crianças
  '🎓', '🏫', '📚', '✏️', '⚽', '🤸',

  // Saúde & Cuidados Pessoais
  '💊', '🩺', '❤️‍🩹', '⚕️', '💪', '🏋️‍♀️', '💇‍♀️',

  // Finanças & Trabalho
  '💰', '💵', '🪙', '📈', '💹', '🏦', '₿', '💼', 
  '⚖️', '🧾', '🔄',

  // Viagens & Diversos
  '✈️', '🏨', '🗺️', '🛡️', '❤️', '🙏', '📱', '🏛️',
  '🧑‍🍳', '📰', '📺', '🛠️'
];

  useEffect(() => {
    if (category) {
      setFormData(category);
    } else if (type) {
      setFormData(prev => ({ ...prev, type }));
    }
  }, [category, type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao salvar categoria');
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
            {category ? 'Editar' : 'Nova'} Categoria
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
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full p-2 border rounded-lg"
              disabled={!!category}
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
              <option value="investment">Investimento</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="Ex: Alimentação"
              required
            />
          </div>

          {formData.type === 'income' && (
            <div>
              <label className="block text-sm font-medium mb-2">Origem do Valor</label>
              <select
                value={formData.origin || ''}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Selecione...</option>
                <option value="salário">Salário</option>
                <option value="empréstimos">Empréstimos</option>
                <option value="indenizações de trabalho">Indenizações de Trabalho</option>
                <option value="indenizações avulsas">Indenizações Avulsas</option>
                <option value="trabalhos avulso">Trabalhos Avulsos</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          )}

          {formData.type === 'investment' && (
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Investimento</label>
              <select
                value={formData.investment_type || ''}
                onChange={(e) => setFormData({ ...formData, investment_type: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Selecione...</option>
                <option value="ações">Ações</option>
                <option value="fundos de investimentos">Fundos de Investimentos</option>
                <option value="CDB">CDB</option>
                <option value="LCI">LCI</option>
                <option value="LCA">LCA</option>
                <option value="Tesouro Direto">Tesouro Direto</option>
                <option value="criptomoedas">Criptomoedas</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Ícone</label>
            <div className="grid grid-cols-10 gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
              {icons.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={'text-2xl p-2 rounded hover:bg-gray-100 ' + (formData.icon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : '')}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cor</label>
            <div className="grid grid-cols-5 gap-2">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={'h-10 rounded ' + color + ' ' + (formData.color === color ? 'ring-4 ring-offset-2 ring-gray-400' : '')}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300"
          >
            {loading ? 'Salvando...' : category ? 'Salvar Alterações' : 'Criar Categoria'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
