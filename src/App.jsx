import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, 
  Wallet, Target, AlertCircle, Brain, CreditCard, Building, Settings,
  LogOut, User, Trash2, Edit, X, Check, Home, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import CategoryModal from './components/Modals/CategoryModal';
import AccountModal from './components/Modals/AccountModal';
import TransactionModal from './components/Modals/TransactionModal';

const App = () => {
  // Estados de Autenticação
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  
  // Estados de Navegação
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Estados de Dados
  const [categories, setCategories] = useState({
    expense: [],
    income: [],
    investment: []
  });
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Estados de Modais
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [categoryType, setCategoryType] = useState('expense');
  
  // Estados de UI
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Verificar sessão ao carregar
  useEffect(() => {
    checkUser();
  }, []);

  // Carregar dados quando usuário logar
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  // Função para verificar usuário autenticado
  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar todos os dados
  const loadAllData = async () => {
    await Promise.all([
      loadCategories(),
      loadAccounts(),
      loadTransactions()
    ]);
  };

  // Funções de Autenticação
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password
        });
        if (error) throw error;
        setUser(data.user);
        showToast('Login realizado com sucesso!', 'success');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password
        });
        if (error) throw error;
        showToast('Cadastro realizado! Verifique seu email.', 'success');
        setAuthMode('login');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCategories({ expense: [], income: [], investment: [] });
    setAccounts([]);
    setTransactions([]);
    setActiveTab('dashboard');
    showToast('Logout realizado com sucesso!', 'success');
  };

  // Funções de Categorias
  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      const grouped = {
        expense: data.filter(c => c.type === 'expense'),
        income: data.filter(c => c.type === 'income'),
        investment: data.filter(c => c.type === 'investment')
      };
      
      setCategories(grouped);
    } catch (error) {
      showToast('Erro ao carregar categorias', 'error');
    }
  };

  const handleSaveCategory = async (categoryData) => {
    try {
      const dataToSave = {
        ...categoryData,
        user_id: user.id
      };

      if (categoryData.id) {
        const { error } = await supabase
          .from('categories')
          .update(dataToSave)
          .eq('id', categoryData.id);
        if (error) throw error;
        showToast('Categoria atualizada!', 'success');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([dataToSave]);
        if (error) throw error;
        showToast('Categoria criada!', 'success');
      }

      await loadCategories();
      setShowCategoryModal(false);
      setEditingCategory(null);
    } catch (error) {
      showToast('Erro ao salvar categoria', 'error');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta categoria?')) return;
    
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast('Categoria excluída!', 'success');
      await loadCategories();
    } catch (error) {
      showToast('Erro ao excluir categoria', 'error');
    }
  };

  // Funções de Contas
  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      showToast('Erro ao carregar contas', 'error');
    }
  };

  const handleSaveAccount = async (accountData) => {
    try {
      const dataToSave = {
        ...accountData,
        user_id: user.id,
        balance: parseFloat(accountData.balance) || 0
      };

      if (accountData.id) {
        const { error } = await supabase
          .from('accounts')
          .update(dataToSave)
          .eq('id', accountData.id);
        if (error) throw error;
        showToast('Conta atualizada!', 'success');
      } else {
        const { error } = await supabase
          .from('accounts')
          .insert([dataToSave]);
        if (error) throw error;
        showToast('Conta criada!', 'success');
      }

      await loadAccounts();
      setShowAccountModal(false);
      setEditingAccount(null);
    } catch (error) {
      showToast('Erro ao salvar conta', 'error');
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta conta?')) return;
    
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast('Conta excluída!', 'success');
      await loadAccounts();
    } catch (error) {
      showToast('Erro ao excluir conta', 'error');
    }
  };

  // Funções de Transações
  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      showToast('Erro ao carregar transações', 'error');
    }
  };

  const handleSaveTransaction = async (transactionData) => {
    try {
      const dataToSave = {
        ...transactionData,
        user_id: user.id,
        amount: parseFloat(transactionData.amount) || 0
      };

      if (transactionData.id) {
        const { error } = await supabase
          .from('transactions')
          .update(dataToSave)
          .eq('id', transactionData.id);
        if (error) throw error;
        showToast('Transação atualizada!', 'success');
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert([dataToSave]);
        if (error) throw error;
        showToast('Transação criada!', 'success');
      }

      await Promise.all([
        loadTransactions(),
        loadAccounts() // Recarregar contas para atualizar saldos
      ]);
      
      setShowTransactionModal(false);
      setEditingTransaction(null);
    } catch (error) {
      showToast('Erro ao salvar transação', 'error');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta transação?')) return;
    
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast('Transação excluída!', 'success');
      await Promise.all([
        loadTransactions(),
        loadAccounts()
      ]);
    } catch (error) {
      showToast('Erro ao excluir transação', 'error');
    }
  };

  // Funções de UI
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Cálculos
  const calculateTotals = () => {
    const totals = {
      balance: accounts.reduce((acc, account) => acc + (account.balance || 0), 0),
      expenses: 0,
      income: 0,
      investments: 0
    };

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    transactions.forEach(transaction => {
      const transDate = new Date(transaction.date);
      if (transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear) {
        if (transaction.type === 'expense') {
          totals.expenses += transaction.amount;
        } else if (transaction.type === 'income') {
          totals.income += transaction.amount;
        } else if (transaction.type === 'investment') {
          totals.investments += transaction.amount;
        }
      }
    });

    return totals;
  };

  const totals = calculateTotals();

  // Tela de Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Tela de Login/Cadastro
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
              FinanceAI Pro
            </h1>
            <p className="text-gray-600 mt-2">Controle financeiro inteligente</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50"
            >
              {loading ? 'Processando...' : (authMode === 'login' ? 'Entrar' : 'Cadastrar')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela Principal do App
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
              FinanceAI Pro
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">{user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'expenses', label: 'Gastos', icon: TrendingDown },
              { id: 'income', label: 'Receitas', icon: TrendingUp },
              { id: 'investments', label: 'Investimentos', icon: BarChart3 },
              { id: 'settings', label: 'Configurações', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Saldo Total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      R$ {totals.balance.toFixed(2)}
                    </p>
                  </div>
                  <Wallet className="w-10 h-10 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Gastos do Mês</p>
                    <p className="text-2xl font-bold text-red-600">
                      R$ {totals.expenses.toFixed(2)}
                    </p>
                  </div>
                  <TrendingDown className="w-10 h-10 text-red-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Receitas do Mês</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {totals.income.toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Investimentos</p>
                    <p className="text-2xl font-bold text-purple-600">
                      R$ {totals.investments.toFixed(2)}
                    </p>
                  </div>
                  <BarChart3 className="w-10 h-10 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold mb-4">Ações Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    setCategoryType('expense');
                    setEditingTransaction(null);
                    setShowTransactionModal(true);
                  }}
                  className="flex items-center justify-center space-x-2 p-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                >
                  <ArrowDownRight className="w-5 h-5" />
                  <span>Adicionar Gasto</span>
                </button>

                <button
                  onClick={() => {
                    setCategoryType('income');
                    setEditingTransaction(null);
                    setShowTransactionModal(true);
                  }}
                  className="flex items-center justify-center space-x-2 p-4 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                >
                  <ArrowUpRight className="w-5 h-5" />
                  <span>Adicionar Receita</span>
                </button>

                <button
                  onClick={() => {
                    setCategoryType('investment');
                    setEditingTransaction(null);
                    setShowTransactionModal(true);
                  }}
                  className="flex items-center justify-center space-x-2 p-4 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Adicionar Investimento</span>
                </button>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold mb-4">Transações Recentes</h2>
              <div className="space-y-3">
                {transactions.slice(0, 5).map(transaction => {
                  const category = [...categories.expense, ...categories.income, ...categories.investment]
                    .find(c => c.id === transaction.category);
                  const account = accounts.find(a => a.id === transaction.account_id);
                  
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full ${category?.color || 'bg-gray-500'} flex items-center justify-center text-white`}>
                          <span>{category?.icon || '💰'}</span>
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-gray-600">
                            {category?.name} • {account?.name} • {new Date(transaction.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${
                          transaction.type === 'expense' ? 'text-red-600' : 
                          transaction.type === 'income' ? 'text-green-600' : 
                          'text-purple-600'
                        }`}>
                          {transaction.type === 'expense' ? '-' : '+'} R$ {transaction.amount.toFixed(2)}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                          <button
                            onClick={() => {
                              setEditingTransaction(transaction);
                              setShowTransactionModal(true);
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Categorias de Gastos</h2>
              <button
                onClick={() => {
                  setCategoryType('expense');
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Nova Categoria</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categories.expense.map(category => {
                const categoryTotal = transactions
                  .filter(t => t.category === category.id && t.type === 'expense')
                  .reduce((acc, t) => acc + t.amount, 0);
                
                return (
                  <div key={category.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition group">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-full ${category.color} flex items-center justify-center text-white text-2xl`}>
                        {category.icon}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                        <button
                          onClick={() => {
                            setEditingCategory(category);
                            setCategoryType('expense');
                            setShowCategoryModal(true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg">{category.name}</h3>
                    <p className="text-2xl font-bold text-red-600 mt-2">
                      R$ {categoryTotal.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Income Tab */}
        {activeTab === 'income' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Categorias de Receitas</h2>
              <button
                onClick={() => {
                  setCategoryType('income');
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Nova Categoria</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categories.income.map(category => {
                const categoryTotal = transactions
                  .filter(t => t.category === category.id && t.type === 'income')
                  .reduce((acc, t) => acc + t.amount, 0);
                
                return (
                  <div key={category.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition group">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-full ${category.color} flex items-center justify-center text-white text-2xl`}>
                        {category.icon}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                        <button
                          onClick={() => {
                            setEditingCategory(category);
                            setCategoryType('income');
                            setShowCategoryModal(true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg">{category.name}</h3>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      R$ {categoryTotal.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Investments Tab */}
        {activeTab === 'investments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Categorias de Investimentos</h2>
              <button
                onClick={() => {
                  setCategoryType('investment');
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Nova Categoria</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categories.investment.map(category => {
                const categoryTotal = transactions
                  .filter(t => t.category === category.id && t.type === 'investment')
                  .reduce((acc, t) => acc + t.amount, 0);
                
                return (
                  <div key={category.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition group">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-full ${category.color} flex items-center justify-center text-white text-2xl`}>
                        {category.icon}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                        <button
                          onClick={() => {
                            setEditingCategory(category);
                            setCategoryType('investment');
                            setShowCategoryModal(true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg">{category.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{category.investment_type}</p>
                    <p className="text-2xl font-bold text-purple-600">
                      R$ {categoryTotal.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Accounts Management */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Contas Bancárias</h2>
                <button
                  onClick={() => {
                    setEditingAccount(null);
                    setShowAccountModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nova Conta</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.map(account => (
                  <div key={account.id} className="border rounded-lg p-4 hover:shadow-md transition group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full ${account.color || 'bg-blue-500'} flex items-center justify-center text-white`}>
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold">{account.name}</h3>
                          <p className="text-sm text-gray-600">{account.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-lg">R$ {account.balance.toFixed(2)}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                          <button
                            onClick={() => {
                              setEditingAccount(account);
                              setShowAccountModal(true);
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Profile */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-6">Perfil do Usuário</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">ID do Usuário</p>
                    <p className="font-medium text-xs">{user.id}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Brain className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Plano</p>
                    <p className="font-medium">Pro (Todas as funcionalidades)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CategoryModal
        show={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        category={editingCategory}
        type={categoryType}
      />
      
      <AccountModal
        show={showAccountModal}
        onClose={() => {
          setShowAccountModal(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
        account={editingAccount}
      />
      
      <TransactionModal
        show={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        transaction={editingTransaction}
        categories={[...categories.expense, ...categories.income, ...categories.investment]}
        accounts={accounts}
      />
    </div>
  );
};

export default App;
