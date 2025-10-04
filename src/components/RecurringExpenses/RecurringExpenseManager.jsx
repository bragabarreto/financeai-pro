import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Plus, Edit, Trash2, Calendar, DollarSign, 
  AlertCircle, Check, X, Clock, CreditCard, Bell, 
  ChevronRight, PauseCircle, PlayCircle, Info, Users
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RecurringExpenseManager = ({ user, categories, accounts, cards }) => {
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [history, setHistory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('active'); // active, inactive, all, pending

  // Estado do formulário
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    category_id: '',
    account_id: '',
    card_id: '',
    due_day: '10',
    payment_method: 'debit',
    is_active: true,
    is_indefinite: true,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    notification_days: '1',
    auto_approve: false,
    is_alimony: false
  });

  // Estado para aprovação
  const [approvalData, setApprovalData] = useState({
    expense: null,
    newAmount: '',
    confirm: false
  });

  const paymentMethods = [
    { value: 'debit', label: 'Débito', icon: CreditCard },
    { value: 'credit', label: 'Cartão de Crédito', icon: CreditCard },
    { value: 'pix', label: 'PIX', icon: DollarSign },
    { value: 'transfer', label: 'Transferência', icon: DollarSign },
    { value: 'cash', label: 'Dinheiro', icon: DollarSign },
    { value: 'auto_debit', label: 'Débito Automático', icon: RefreshCw }
  ];

  useEffect(() => {
    if (user) {
      loadRecurringExpenses();
      checkPendingApprovals();
      loadHistory();
    }
  }, [user]);

  // Carregar despesas recorrentes
  const loadRecurringExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*, categories(name, icon, color), accounts(name), credit_cards(name)')
        .eq('user_id', user.id)
        .order('due_day');

      if (error) throw error;
      setRecurringExpenses(data || []);
    } catch (error) {
      console.error('Erro ao carregar despesas recorrentes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Verificar aprovações pendentes
  const checkPendingApprovals = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const currentDay = new Date().getDate();

      // Buscar despesas que precisam ser aprovadas
      const { data: expenses } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .lte('due_day', currentDay + 1); // Próximas 24h

      if (!expenses) return;

      // Verificar quais ainda não foram lançadas este mês
      const pending = [];
      for (const expense of expenses) {
        const { data: history } = await supabase
          .from('recurring_expense_history')
          .select('*')
          .eq('recurring_expense_id', expense.id)
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .single();

        if (!history) {
          pending.push(expense);
        }
      }

      setPendingApprovals(pending);
    } catch (error) {
      console.error('Erro ao verificar aprovações:', error);
    }
  };

  // Carregar histórico
  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_expense_history')
        .select('*, recurring_expenses(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  // Salvar/Atualizar despesa recorrente
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        user_id: user.id,
        amount: parseFloat(formData.amount),
        due_day: parseInt(formData.due_day),
        notification_days: parseInt(formData.notification_days),
        card_id: formData.card_id || null,
        end_date: formData.is_indefinite ? null : formData.end_date
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('recurring_expenses')
          .update(dataToSave)
          .eq('id', editingExpense.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('recurring_expenses')
          .insert([dataToSave]);
        
        if (error) throw error;
      }

      await loadRecurringExpenses();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar despesa recorrente:', error);
      alert('Erro ao salvar despesa recorrente');
    } finally {
      setLoading(false);
    }
  };

  // Aprovar lançamento mensal
  const handleApproveMonthly = async () => {
    if (!approvalData.expense) return;

    setLoading(true);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      // Registrar no histórico
      const { data: historyData, error: historyError } = await supabase
        .from('recurring_expense_history')
        .insert([{
          recurring_expense_id: approvalData.expense.id,
          user_id: user.id,
          month: currentMonth,
          year: currentYear,
          amount: parseFloat(approvalData.newAmount || approvalData.expense.amount),
          status: approvalData.expense.auto_approve ? 'auto_approved' : 'approved',
          approved_at: new Date()
        }])
        .select()
        .single();

      if (historyError) throw historyError;

      // Criar transação
      const { error: transError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          type: 'expense',
          description: approvalData.expense.name,
          amount: parseFloat(approvalData.newAmount || approvalData.expense.amount),
          category: approvalData.expense.category_id,
          account_id: approvalData.expense.account_id,
          card_id: approvalData.expense.card_id,
          date: new Date(),
          origin: 'recurring'
        }]);

      if (transError) throw transError;

      // Atualizar última data de geração
      await supabase
        .from('recurring_expenses')
        .update({ last_generated_date: new Date() })
        .eq('id', approvalData.expense.id);

      await Promise.all([
        loadRecurringExpenses(),
        checkPendingApprovals(),
        loadHistory()
      ]);

      setShowApprovalModal(false);
      setApprovalData({ expense: null, newAmount: '', confirm: false });
    } catch (error) {
      console.error('Erro ao aprovar despesa:', error);
      alert('Erro ao aprovar despesa');
    } finally {
      setLoading(false);
    }
  };

  // Pausar/Ativar despesa
  const toggleExpenseStatus = async (expense) => {
    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .update({ is_active: !expense.is_active })
        .eq('id', expense.id);

      if (error) throw error;
      await loadRecurringExpenses();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  // Deletar despesa
  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta despesa recorrente?')) return;

    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadRecurringExpenses();
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
    }
  };

  // Reset formulário
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      amount: '',
      category_id: '',
      account_id: '',
      card_id: '',
      due_day: '10',
      payment_method: 'debit',
      is_active: true,
      is_indefinite: true,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      notification_days: '1',
      auto_approve: false
    });
    setEditingExpense(null);
    setShowModal(false);
  };

  // Filtrar despesas
  const getFilteredExpenses = () => {
    if (activeView === 'active') return recurringExpenses.filter(e => e.is_active);
    if (activeView === 'inactive') return recurringExpenses.filter(e => !e.is_active);
    if (activeView === 'pending') return pendingApprovals;
    return recurringExpenses;
  };

  // Calcular total mensal
  const calculateMonthlyTotal = () => {
    return recurringExpenses
      .filter(e => e.is_active)
      .reduce((acc, e) => acc + e.amount, 0);
  };

  const filteredExpenses = getFilteredExpenses();
  const monthlyTotal = calculateMonthlyTotal();

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Despesas Recorrentes</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Despesa Recorrente</span>
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Total Mensal</p>
          <p className="text-2xl font-bold text-red-600">R$ {monthlyTotal.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Despesas Ativas</p>
          <p className="text-2xl font-bold">{recurringExpenses.filter(e => e.is_active).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingApprovals.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Próximo Vencimento</p>
          <p className="text-lg font-bold">
            {recurringExpenses.filter(e => e.is_active).sort((a, b) => a.due_day - b.due_day)[0]?.due_day || '-'}/
            {format(new Date(), 'MM')}
          </p>
        </div>
      </div>

      {/* Notificações de Aprovação Pendente */}
      {pendingApprovals.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Bell className="w-5 h-5 text-yellow-600 mt-1" />
            <div className="flex-1">
              <p className="font-medium text-yellow-900">Despesas pendentes de aprovação</p>
              <p className="text-sm text-yellow-700 mt-1">
                Você tem {pendingApprovals.length} despesa(s) para aprovar hoje ou amanhã
              </p>
              <div className="mt-3 space-y-2">
                {pendingApprovals.map(expense => (
                  <div key={expense.id} className="flex items-center justify-between p-2 bg-white rounded">
                    <span className="font-medium">{expense.name}</span>
                    <button
                      onClick={() => {
                        setApprovalData({ 
                          expense, 
                          newAmount: expense.amount, 
                          confirm: false 
                        });
                        setShowApprovalModal(true);
                      }}
                      className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Aprovar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveView('active')}
          className={`pb-2 px-1 border-b-2 transition ${
            activeView === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent'
          }`}
        >
          Ativas
        </button>
        <button
          onClick={() => setActiveView('inactive')}
          className={`pb-2 px-1 border-b-2 transition ${
            activeView === 'inactive' ? 'border-blue-600 text-blue-600' : 'border-transparent'
          }`}
        >
          Inativas
        </button>
        <button
          onClick={() => setActiveView('all')}
          className={`pb-2 px-1 border-b-2 transition ${
            activeView === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent'
          }`}
        >
          Todas
        </button>
      </div>

      {/* Lista de Despesas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExpenses.map(expense => (
          <div key={expense.id} className="bg-white rounded-lg shadow-lg p-6 relative group">
            {/* Status Badge */}
            <div className="absolute top-2 right-2">
              {expense.is_active ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Ativa</span>
              ) : (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Inativa</span>
              )}
            </div>

            {/* Informações */}
            <div className="mb-4">
              <h3 className="font-bold text-lg">{expense.name}</h3>
              {expense.description && (
                <p className="text-sm text-gray-600">{expense.description}</p>
              )}
            </div>

            {/* Valor e Vencimento */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Valor:</span>
                <span className="font-bold text-red-600">R$ {expense.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Vencimento:</span>
                <span className="font-medium">Dia {expense.due_day}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Forma:</span>
                <span className="text-sm">
                  {paymentMethods.find(m => m.value === expense.payment_method)?.label}
                </span>
              </div>
              {expense.categories && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Categoria:</span>
                  <span className="text-sm">{expense.categories.name}</span>
                </div>
              )}
            </div>

            {/* Período */}
            <div className="text-xs text-gray-500 mb-4">
              {expense.is_indefinite ? (
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Por tempo indeterminado
                </span>
              ) : (
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Até {format(new Date(expense.end_date), 'dd/MM/yyyy')}
                </span>
              )}
            </div>

            {/* Ações */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => toggleExpenseStatus(expense)}
                className={`px-3 py-1 rounded text-sm ${
                  expense.is_active 
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                {expense.is_active ? (
                  <>
                    <PauseCircle className="w-4 h-4 inline mr-1" />
                    Pausar
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 inline mr-1" />
                    Ativar
                  </>
                )}
              </button>

              <div className="flex space-x-1">
                <button
                  onClick={() => {
                    setEditingExpense(expense);
                    setFormData({
                      name: expense.name,
                      description: expense.description || '',
                      amount: expense.amount,
                      category_id: expense.category_id || '',
                      account_id: expense.account_id || '',
                      card_id: expense.card_id || '',
                      due_day: expense.due_day,
                      payment_method: expense.payment_method,
                      is_active: expense.is_active,
                      is_indefinite: expense.is_indefinite,
                      start_date: expense.start_date,
                      end_date: expense.end_date || '',
                      notification_days: expense.notification_days,
                      auto_approve: expense.auto_approve
                    });
                    setShowModal(true);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDeleteExpense(expense.id)}
                  className="p-1 hover:bg-red-100 rounded"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {editingExpense ? 'Editar Despesa Recorrente' : 'Nova Despesa Recorrente'}
              </h3>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Valor *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Mensalidade da escola das crianças"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Dia de Vencimento *</label>
                  <input
                    type="number"
                    value={formData.due_day}
                    onChange={(e) => setFormData({...formData, due_day: e.target.value})}
                    min="1"
                    max="31"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Forma de Pagamento</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {paymentMethods.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notificar (dias antes)</label>
                  <input
                    type="number"
                    value={formData.notification_days}
                    onChange={(e) => setFormData({...formData, notification_days: e.target.value})}
                    min="0"
                    max="7"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {categories.expense.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Conta</label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({...formData, account_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.payment_method === 'credit' && cards && cards.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Cartão de Crédito</label>
                  <select
                    value={formData.card_id}
                    onChange={(e) => setFormData({...formData, card_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {cards.map(card => (
                      <option key={card.id} value={card.id}>{card.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Campo de Pensão Alimentícia */}
                <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                <input
                type="checkbox"
                id="is_alimony_recurring"
                checked={formData.is_alimony}
                onChange={(e) => setFormData({...formData, is_alimony: e.target.checked})}
                className="mr-3 w-4 h-4 text-purple-600 focus:ring-purple-500"
    />
                <label htmlFor="is_alimony_recurring" className="flex items-center cursor-pointer">
                <Users className="w-4 h-4 mr-2 text-purple-600" />
                <span className="text-sm font-medium">Marcar como Pensão Alimentícia</span>
                </label>
                </div>
                {formData.is_alimony && (
                <p className="text-xs text-purple-600 mt-2 ml-7">
                Esta despesa recorrente será contabilizada nos relatórios de pensão alimentícia
                </p>
  )}
                </div>

              {/* Período */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_indefinite"
                    checked={formData.is_indefinite}
                    onChange={(e) => setFormData({...formData, is_indefinite: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="is_indefinite" className="text-sm font-medium">
                    Por tempo indeterminado
                  </label>
                </div>

                {!formData.is_indefinite && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Data Inicial</label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Data Final</label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Configurações */}
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  Configurações Avançadas
                </h4>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto_approve"
                    checked={formData.auto_approve}
                    onChange={(e) => setFormData({...formData, auto_approve: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="auto_approve" className="text-sm">
                    Aprovar automaticamente todo mês (sem confirmação)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="is_active" className="text-sm">
                    Despesa ativa
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : editingExpense ? 'Atualizar' : 'Criar'}
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

      {/* Modal de Aprovação */}
      {showApprovalModal && approvalData.expense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Aprovar Despesa Mensal</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{approvalData.expense.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Vencimento: Dia {approvalData.expense.due_day}/{format(new Date(), 'MM')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Valor para este mês
                </label>
                <input
                  type="number"
                  value={approvalData.newAmount}
                  onChange={(e) => setApprovalData({
                    ...approvalData, 
                    newAmount: e.target.value
                  })}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Valor padrão: R$ {approvalData.expense.amount.toFixed(2)}
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="confirm_approval"
                  checked={approvalData.confirm}
                  onChange={(e) => setApprovalData({
                    ...approvalData,
                    confirm: e.target.checked
                  })}
                  className="mr-2"
                />
                <label htmlFor="confirm_approval" className="text-sm">
                  Confirmo o lançamento desta despesa
                </label>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleApproveMonthly}
                  disabled={!approvalData.confirm || loading}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Aprovar e Lançar'}
                </button>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalData({ expense: null, newAmount: '', confirm: false });
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default RecurringExpenseManager;
