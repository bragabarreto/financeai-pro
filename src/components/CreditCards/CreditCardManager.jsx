import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, Edit, Trash2, AlertCircle, 
  Calendar, DollarSign, X, Check, TrendingUp
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CreditCardManager = ({ user }) => {
  const [cards, setCards] = useState([]);
  const [bills, setBills] = useState([]);
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cards'); // cards, bills, analysis

  // Estado do formulário
  const [cardForm, setCardForm] = useState({
    name: '',
    brand: 'visa',
    last_digits: '',
    last_digits_list: [], // Array com até 5 números de 4 dígitos
    credit_limit: '',
    closing_day: '10',
    due_day: '20',
    color: 'bg-gray-800',
    is_active: true
  });

  // Cores disponíveis para cartões
  const cardColors = [
    'bg-gray-800', 'bg-blue-600', 'bg-purple-600', 'bg-green-600',
    'bg-red-600', 'bg-yellow-600', 'bg-pink-600', 'bg-indigo-600'
  ];

  // Bandeiras de cartão
  const cardBrands = [
    { value: 'visa', label: 'Visa', color: 'text-blue-600' },
    { value: 'mastercard', label: 'Mastercard', color: 'text-red-600' },
    { value: 'elo', label: 'Elo', color: 'text-yellow-600' },
    { value: 'amex', label: 'American Express', color: 'text-green-600' },
    { value: 'other', label: 'Outro', color: 'text-gray-600' }
  ];

  useEffect(() => {
    if (user) {
      loadCards();
      loadBills();
    }
  }, [user]);

  // Carregar cartões
  const loadCards = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar faturas
  const loadBills = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_card_bills')
        .select('*, credit_cards(name, brand, color)')
        .eq('user_id', user.id)
        .order('due_date', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
    }
  };

  // Salvar/Atualizar cartão
  const handleSaveCard = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cardData = {
        ...cardForm,
        user_id: user.id,
        credit_limit: parseFloat(cardForm.credit_limit),
        closing_day: parseInt(cardForm.closing_day),
        due_day: parseInt(cardForm.due_day),
        used_amount: editingCard ? editingCard.used_amount : 0
      };

      if (editingCard) {
        const { error } = await supabase
          .from('credit_cards')
          .update(cardData)
          .eq('id', editingCard.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('credit_cards')
          .insert([cardData]);
        
        if (error) throw error;
      }

      await loadCards();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
      alert('Erro ao salvar cartão');
    } finally {
      setLoading(false);
    }
  };

  // Deletar cartão
  const handleDeleteCard = async (id) => {
    if (!window.confirm('Deseja realmente excluir este cartão?')) return;

    try {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadCards();
    } catch (error) {
      console.error('Erro ao excluir cartão:', error);
      alert('Erro ao excluir cartão');
    }
  };

  // Editar cartão
  const handleEditCard = (card) => {
    setEditingCard(card);
    setCardForm({
      name: card.name,
      brand: card.brand,
      last_digits: card.last_digits,
      last_digits_list: card.last_digits_list || [],
      credit_limit: card.credit_limit,
      closing_day: card.closing_day,
      due_day: card.due_day,
      color: card.color,
      is_active: card.is_active
    });
    setShowCardModal(true);
  };

  // Reset formulário
  const resetForm = () => {
    setCardForm({
      name: '',
      brand: 'visa',
      last_digits: '',
      last_digits_list: [],
      credit_limit: '',
      closing_day: '10',
      due_day: '20',
      color: 'bg-gray-800',
      is_active: true
    });
    setEditingCard(null);
    setShowCardModal(false);
  };

  // Calcular uso do cartão
  const calculateCardUsage = (card) => {
    if (!card.credit_limit || card.credit_limit === 0) return 0;
    return ((card.used_amount || 0) / card.credit_limit) * 100;
  };

  // Calcular fatura atual
  const getCurrentBill = (card) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return bills.find(bill => 
      bill.card_id === card.id && 
      bill.month === currentMonth && 
      bill.year === currentYear
    );
  };

  // Gerar próximas faturas
  const getUpcomingBills = () => {
    const upcoming = [];
    const today = new Date();
    
    cards.forEach(card => {
      for (let i = 0; i < 3; i++) {
        const billDate = addMonths(today, i);
        const dueDate = new Date(billDate.getFullYear(), billDate.getMonth(), card.due_day);
        
        upcoming.push({
          cardName: card.name,
          cardColor: card.color,
          dueDate: dueDate,
          estimatedAmount: card.used_amount || 0
        });
      }
    });

    return upcoming.sort((a, b) => a.dueDate - b.dueDate).slice(0, 5);
  };

  // Calcular totais
  const calculateTotals = () => {
    const totalLimit = cards.reduce((acc, card) => acc + (card.credit_limit || 0), 0);
    const totalUsed = cards.reduce((acc, card) => acc + (card.used_amount || 0), 0);
    const totalAvailable = totalLimit - totalUsed;
    
    return { totalLimit, totalUsed, totalAvailable };
  };

  const totals = calculateTotals();
  const upcomingBills = getUpcomingBills();

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cartões de Crédito</h2>
        <button
          onClick={() => setShowCardModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Cartão</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveTab('cards')}
          className={`pb-2 px-1 border-b-2 transition ${
            activeTab === 'cards' ? 'border-blue-600 text-blue-600' : 'border-transparent'
          }`}
        >
          Cartões
        </button>
        <button
          onClick={() => setActiveTab('bills')}
          className={`pb-2 px-1 border-b-2 transition ${
            activeTab === 'bills' ? 'border-blue-600 text-blue-600' : 'border-transparent'
          }`}
        >
          Faturas
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`pb-2 px-1 border-b-2 transition ${
            activeTab === 'analysis' ? 'border-blue-600 text-blue-600' : 'border-transparent'
          }`}
        >
          Análise
        </button>
      </div>

      {/* Tab: Cartões */}
      {activeTab === 'cards' && (
        <div className="space-y-6">
          {/* Resumo dos Cartões */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Limite Total</p>
              <p className="text-2xl font-bold">R$ {totals.totalLimit.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Total Usado</p>
              <p className="text-2xl font-bold text-red-600">R$ {totals.totalUsed.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Disponível</p>
              <p className="text-2xl font-bold text-green-600">R$ {totals.totalAvailable.toFixed(2)}</p>
            </div>
          </div>

          {/* Lista de Cartões */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(card => {
              const usage = calculateCardUsage(card);
              const currentBill = getCurrentBill(card);
              
              return (
                <div key={card.id} className="relative group">
                  <div className={`${card.color} rounded-xl p-6 text-white shadow-lg`}>
                    {/* Ações */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleEditCard(card)}
                        className="p-1 bg-white/20 rounded hover:bg-white/30 mr-1"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1 bg-white/20 rounded hover:bg-white/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Informações do Cartão */}
                    <div className="flex items-start justify-between mb-4">
                      <CreditCard className="w-8 h-8" />
                      <span className="text-sm opacity-75">{card.brand.toUpperCase()}</span>
                    </div>

                    <div className="mb-4">
                      <p className="text-lg font-bold">{card.name}</p>
                      <p className="text-sm opacity-75">**** {card.last_digits}</p>
                    </div>

                    {/* Limite e Uso */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Limite:</span>
                        <span>R$ {card.credit_limit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Usado:</span>
                        <span>R$ {(card.used_amount || 0).toFixed(2)}</span>
                      </div>
                      
                      {/* Barra de Progresso */}
                      <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                        <div 
                          className={`h-2 rounded-full ${usage > 80 ? 'bg-red-400' : 'bg-white'}`}
                          style={{ width: `${Math.min(usage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-right opacity-75">{usage.toFixed(1)}% usado</p>
                    </div>

                    {/* Datas */}
                    <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-xs">
                      <span>Fecha dia {card.closing_day}</span>
                      <span>Vence dia {card.due_day}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Faturas */}
      {activeTab === 'bills' && (
        <div className="space-y-6">
          {/* Próximas Faturas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Próximos Vencimentos</h3>
            <div className="space-y-3">
              {upcomingBills.map((bill, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${bill.cardColor} rounded-full flex items-center justify-center text-white`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">{bill.cardName}</p>
                      <p className="text-sm text-gray-600">
                        Vence {format(bill.dueDate, "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold">R$ {bill.estimatedAmount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico de Faturas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Histórico de Faturas</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Cartão</th>
                    <th className="text-left p-2">Mês/Ano</th>
                    <th className="text-right p-2">Valor</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(bill => (
                    <tr key={bill.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{bill.credit_cards?.name}</td>
                      <td className="p-2">{bill.month}/{bill.year}</td>
                      <td className="p-2 text-right">R$ {bill.total_amount.toFixed(2)}</td>
                      <td className="p-2 text-center">
                        {bill.is_paid ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Pago</span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">Pendente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Análise */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {/* Análise de Gastos por Cartão */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Análise de Uso</h3>
            <div className="space-y-4">
              {cards.map(card => {
                const usage = calculateCardUsage(card);
                return (
                  <div key={card.id}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{card.name}</span>
                      <span className="text-sm">
                        R$ {(card.used_amount || 0).toFixed(2)} / R$ {card.credit_limit.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className={`h-4 rounded-full flex items-center justify-center text-xs text-white font-bold
                          ${usage > 80 ? 'bg-red-600' : usage > 50 ? 'bg-yellow-600' : 'bg-green-600'}`}
                        style={{ width: `${Math.min(usage, 100)}%` }}
                      >
                        {usage > 10 && `${usage.toFixed(0)}%`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alertas e Recomendações */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Alertas e Recomendações
            </h3>
            <div className="space-y-3">
              {cards.filter(card => calculateCardUsage(card) > 80).map(card => (
                <div key={card.id} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium text-red-900">Alto uso no cartão {card.name}</p>
                    <p className="text-sm text-red-700">
                      Você já utilizou {calculateCardUsage(card).toFixed(1)}% do limite disponível
                    </p>
                  </div>
                </div>
              ))}

              {totals.totalUsed > totals.totalLimit * 0.7 && (
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-yellow-600 mt-1" />
                  <div>
                    <p className="font-medium text-yellow-900">Uso total elevado</p>
                    <p className="text-sm text-yellow-700">
                      Considere reduzir os gastos nos cartões para evitar juros
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cartão */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
              </h3>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome do Cartão</label>
                <input
                  type="text"
                  value={cardForm.name}
                  onChange={(e) => setCardForm({...cardForm, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Bandeira</label>
                  <select
                    value={cardForm.brand}
                    onChange={(e) => setCardForm({...cardForm, brand: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {cardBrands.map(brand => (
                      <option key={brand.value} value={brand.value}>{brand.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Últimos 4 Dígitos (Principal)</label>
                  <input
                    type="text"
                    value={cardForm.last_digits}
                    onChange={(e) => setCardForm({...cardForm, last_digits: e.target.value})}
                    maxLength="4"
                    pattern="[0-9]{4}"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1234"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Números Adicionais do Cartão (até 5 - para IA identificar)
                </label>
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <input
                      key={index}
                      type="text"
                      value={cardForm.last_digits_list[index] || ''}
                      onChange={(e) => {
                        const newList = [...cardForm.last_digits_list];
                        if (e.target.value === '') {
                          newList.splice(index, 1);
                        } else {
                          newList[index] = e.target.value;
                        }
                        setCardForm({...cardForm, last_digits_list: newList.filter(d => d)});
                      }}
                      maxLength="4"
                      pattern="[0-9]{4}"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Últimos 4 dígitos ${index + 1} (opcional)`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Adicione até 5 números de 4 dígitos para ajudar a IA a identificar transações deste cartão
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Limite de Crédito</label>
                <input
                  type="number"
                  value={cardForm.credit_limit}
                  onChange={(e) => setCardForm({...cardForm, credit_limit: e.target.value})}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Dia de Fechamento</label>
                  <input
                    type="number"
                    value={cardForm.closing_day}
                    onChange={(e) => setCardForm({...cardForm, closing_day: e.target.value})}
                    min="1"
                    max="31"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Dia de Vencimento</label>
                  <input
                    type="number"
                    value={cardForm.due_day}
                    onChange={(e) => setCardForm({...cardForm, due_day: e.target.value})}
                    min="1"
                    max="31"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cor do Cartão</label>
                <div className="grid grid-cols-4 gap-2">
                  {cardColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCardForm({...cardForm, color})}
                      className={`h-10 rounded-lg ${color} ${
                        cardForm.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={cardForm.is_active}
                  onChange={(e) => setCardForm({...cardForm, is_active: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm">Cartão ativo</label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : editingCard ? 'Atualizar' : 'Criar Cartão'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditCardManager;