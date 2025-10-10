import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Users } from 'lucide-react';

const TransactionModal = ({ show, onClose, onSave, transaction, categories, accounts, cards = [] }) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    description: '',
    amount: 0,
    category: '',
    account_id: '',
    card_id: '',
    payment_method: '',
    date: new Date().toISOString().split('T')[0],
    origin: '',
    is_alimony: false,
    is_installment: false,
    installment_count: null,
    installment_due_dates: [],
    last_installment_date: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      setFormData({
        ...transaction,
        is_alimony: transaction.is_alimony || false,
        payment_method: transaction.payment_method || '',
        card_id: transaction.card_id || '',
        account_id: transaction.account_id || '',
        is_installment: transaction.is_installment || false,
        installment_count: transaction.installment_count || null,
        installment_due_dates: transaction.installment_due_dates || [],
        last_installment_date: transaction.last_installment_date || null
      });
    } else {
      // Reset form when opening for new transaction
      setFormData({
        type: 'expense',
        description: '',
        amount: 0,
        category: '',
        account_id: '',
        card_id: '',
        payment_method: '',
        date: new Date().toISOString().split('T')[0],
        origin: '',
        is_alimony: false,
        is_installment: false,
        installment_count: null,
        installment_due_dates: [],
        last_installment_date: null
      });
    }
  }, [transaction, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.category) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    // Validate payment method and linkage
    if (!formData.payment_method) {
      setError('Selecione o meio de pagamento');
      return;
    }

    if (formData.payment_method === 'credit_card' && !formData.card_id) {
      setError('Selecione um cartão de crédito');
      return;
    }

    if (['debit_card', 'pix', 'transfer', 'application', 'redemption', 'paycheck'].includes(formData.payment_method) && !formData.account_id) {
      setError('Selecione uma conta bancária');
      return;
    }

    if (formData.amount <= 0) {
      setError('Valor deve ser maior que zero');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare data based on payment method
      const dataToSave = {
        ...formData,
        // Set card_id or account_id to null based on payment method
        card_id: formData.payment_method === 'credit_card' ? formData.card_id : null,
        account_id: formData.payment_method === 'credit_card' ? null : formData.account_id
      };
      
      await onSave(dataToSave);
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

  // Helper function to calculate installment dates
  const calculateInstallmentDates = (startDate, count) => {
    const dates = [];
    const date = new Date(startDate);
    for (let i = 0; i < count; i++) {
      const installmentDate = new Date(date);
      installmentDate.setMonth(date.getMonth() + i);
      dates.push(installmentDate.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Update installment dates when count or start date changes
  const handleInstallmentChange = (count) => {
    const numCount = parseInt(count) || 0;
    if (numCount > 0 && formData.date) {
      const dates = calculateInstallmentDates(formData.date, numCount);
      const lastDate = dates[dates.length - 1];
      setFormData({
        ...formData,
        installment_count: numCount,
        installment_due_dates: dates,
        last_installment_date: lastDate
      });
    } else {
      setFormData({
        ...formData,
        installment_count: null,
        installment_due_dates: [],
        last_installment_date: null
      });
    }
  };

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
              onChange={(e) => setFormData({...formData, type: e.target.value, is_alimony: false, category: '', payment_method: '', card_id: '', account_id: ''})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="expense">Gasto</option>
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
            {filteredCategories.length >= 150 && (
              <p className="text-xs text-yellow-600 mt-1">
                Limite de 50 categorias atingido para este tipo
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Meio de Pagamento *</label>
            <select
              value={formData.payment_method}
              onChange={(e) => {
                const newPaymentMethod = e.target.value;
                const primaryAccount = accounts.find(acc => acc.is_primary);
                const needsAccount = ['debit_card', 'pix', 'transfer', 'application', 'redemption', 'paycheck'].includes(newPaymentMethod);
                
                setFormData({
                  ...formData, 
                  payment_method: newPaymentMethod,
                  // Reset card/account when changing payment method
                  card_id: newPaymentMethod === 'credit_card' ? formData.card_id : '',
                  account_id: needsAccount && !formData.account_id && primaryAccount ? primaryAccount.id : (newPaymentMethod === 'credit_card' ? '' : formData.account_id)
                });
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione...</option>
              {formData.type === 'expense' && (
                <>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="debit_card">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                  <option value="transfer">Transferência</option>
                  <option value="paycheck">Contracheque</option>
                </>
              )}
              {formData.type === 'income' && (
                <>
                  <option value="transfer">Transferência</option>
                  <option value="pix">PIX</option>
                  <option value="credit_card">Crédito em Cartão</option>
                  <option value="paycheck">Contracheque</option>
                </>
              )}
              {formData.type === 'investment' && (
                <>
                  <option value="application">Aplicação</option>
                  <option value="redemption">Resgate</option>
                </>
              )}
            </select>
          </div>

          {/* Conditional rendering: Card or Account based on payment method */}
          {formData.payment_method === 'credit_card' ? (
            <div>
              <label className="block text-sm font-medium mb-1">Cartão de Crédito *</label>
              <select
                value={formData.card_id}
                onChange={(e) => setFormData({...formData, card_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione o cartão...</option>
                {cards.map(card => (
                  <option key={card.id} value={card.id}>
                    {card.name} - {card.brand}
                  </option>
                ))}
              </select>
              {cards.length === 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  Nenhum cartão cadastrado. Cadastre um cartão na aba "Cartões".
                </p>
              )}
            </div>
          ) : formData.payment_method && formData.payment_method !== '' ? (
            <div>
              <label className="block text-sm font-medium mb-1">Conta Bancária *</label>
              <select
                value={formData.account_id || ''}
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
          ) : null}

          <div>
            <label className="block text-sm font-medium mb-1">Data *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => {
                const newDate = e.target.value;
                setFormData({...formData, date: newDate});
                // Recalculate installment dates if installment is active
                if (formData.is_installment && formData.installment_count) {
                  const dates = calculateInstallmentDates(newDate, formData.installment_count);
                  setFormData({
                    ...formData,
                    date: newDate,
                    installment_due_dates: dates,
                    last_installment_date: dates[dates.length - 1]
                  });
                }
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Campo de Transação Parcelada */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_installment"
                checked={formData.is_installment}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setFormData({
                    ...formData,
                    is_installment: isChecked,
                    installment_count: isChecked ? formData.installment_count : null,
                    installment_due_dates: isChecked ? formData.installment_due_dates : [],
                    last_installment_date: isChecked ? formData.last_installment_date : null
                  });
                }}
                className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_installment" className="flex items-center cursor-pointer">
                <span className="text-sm font-medium">Transação Parcelada</span>
              </label>
            </div>
            {formData.is_installment && (
              <div className="mt-3 space-y-3 ml-7">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Quantidade de Parcelas
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="48"
                    value={formData.installment_count || ''}
                    onChange={(e) => handleInstallmentChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ex: 12"
                  />
                </div>
                {formData.installment_count > 0 && formData.last_installment_date && (
                  <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                    <p><strong>Data da primeira parcela:</strong> {new Date(formData.date).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Data da última parcela:</strong> {new Date(formData.last_installment_date).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Total de parcelas:</strong> {formData.installment_count}x de R$ {(formData.amount / formData.installment_count).toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}
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
