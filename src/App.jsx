import React, { useState, useEffect } from 'react';
import { supabase, getCurrentUser, signOut } from './services/supabase';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Wallet, Settings, Cloud, CloudOff, RefreshCw, LogOut, Edit2, Trash2, Building } from 'lucide-react';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState('login');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncStatus, setSyncStatus] = useState('disconnected');
  const [showSetupModal, setShowSetupModal] = useState(false);
  
  const categories = {
    expense: [
      { id: 1, name: 'Alimentação', icon: '🍔', color: 'bg-orange-500' },
      { id: 2, name: 'Transporte', icon: '🚗', color: 'bg-blue-500' },
    ],
    income: [
      { id: 3, name: 'Salário', icon: '💼', color: 'bg-green-600' },
    ],
    investment: [
      { id: 4, name: 'Ações', icon: '📈', color: 'bg-purple-600' },
    ]
  };

  const accounts = [
    { id: 1, name: 'Nubank', institution: 'Nubank S.A.', type: 'corrente', balance: 2034.00 },
  ];

  const transactions = [
    { id: 1, type: 'expense', description: 'Supermercado', amount: 245.80, category: 'Alimentação', date: '2025-10-01' },
    { id: 2, type: 'income', description: 'Salário', amount: 5500.00, category: 'Salário', date: '2025-10-01' },
  ];

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };
    
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut();
    setUser(null);
  };

  const connectToGoogleDrive = () => {
    setSyncStatus('syncing');
    setIsSyncing(true);
    setTimeout(() => {
      setIsConnected(true);
      setSyncStatus('synced');
      setIsSyncing(false);
      setLastSync(new Date());
      setShowSetupModal(false);
    }, 2000);
  };

  const balance = {
    income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    expenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    available: accounts.reduce((sum, acc) => sum + acc.balance, 0)
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Nunca';
    const diff = Math.floor((new Date() - lastSync) / 1000);
    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return Math.floor(diff / 60) + ' min atrás';
    return lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'register') {
      return <Register onSwitchToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'forgot') {
      return <ForgotPassword onBack={() => setAuthView('login')} />;
    }
    return (
      <Login
        onSwitchToRegister={() => setAuthView('register')}
        onSwitchToForgot={() => setAuthView('forgot')}
        onLoginSuccess={(loggedUser) => setUser(loggedUser)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">FinanceAI Pro v2.0</h1>
            <p className="text-sm text-blue-100">Olá, {user.user_metadata?.full_name || user.email}!</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2">
              {syncStatus === 'synced' && <Cloud className="w-5 h-5 text-green-300" />}
              {syncStatus === 'syncing' && <RefreshCw className="w-5 h-5 animate-spin text-yellow-300" />}
              {syncStatus === 'disconnected' && <CloudOff className="w-5 h-5 text-gray-300" />}
              <div className="text-left">
                <p className="text-xs font-medium">
                  {syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Desconectado'}
                </p>
                <p className="text-xs opacity-75">{formatLastSync()}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="bg-white bg-opacity-20 backdrop-blur px-4 py-2 rounded-lg text-sm hover:bg-opacity-30 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Saldo Total</span>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">R$ {balance.available.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{accounts.length} contas</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Receitas</span>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">R$ {balance.income.toFixed(2)}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Despesas</span>
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">R$ {balance.expenses.toFixed(2)}</p>
          </div>
        </div>

        {!isConnected && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <CloudOff className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-yellow-800">Modo sem sincronização</p>
                <p className="text-sm text-yellow-700">Conecte ao Google Drive para backup automático.</p>
                <button
                  onClick={() => setShowSetupModal(true)}
                  className="mt-2 text-sm text-yellow-800 underline hover:text-yellow-900"
                >
                  Conectar agora
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'categories', label: 'Categorias', icon: PieChart },
            { id: 'accounts', label: 'Contas', icon: Wallet },
            { id: 'settings', label: 'Config', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ' + (activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-white text-gray-700')}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Transações Recentes</h2>
            <div className="space-y-3">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{t.description}</p>
                    <p className="text-sm text-gray-500">{t.category} • {t.date}</p>
                  </div>
                  <p className={'font-bold ' + (t.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>✨ Novidade v2.0:</strong> Sistema de autenticação completo com Supabase!
              </p>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="bg-white rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Categorias</h2>
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nova
              </button>
            </div>

            {Object.entries(categories).map(([type, cats]) => (
              <div key={type} className="mb-6">
                <h3 className="font-bold mb-3 capitalize">
                  {type === 'expense' ? 'Despesas' : type === 'income' ? 'Receitas' : 'Investimentos'}
                </h3>
                <div className="space-y-2">
                  {cats.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.icon}</span>
                        <p className="font-medium">{cat.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-200 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-gray-200 rounded">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="bg-white rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Contas Bancárias</h2>
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nova
              </button>
            </div>

            <div className="space-y-3">
              {accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-sm text-gray-500">{acc.institution}</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold">R$ {acc.balance.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Configurações</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Cloud className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <h3 className="font-bold text-blue-900">Google Drive</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      {isConnected ? '✅ Conectado e sincronizando' : '❌ Não conectado'}
                    </p>
                    {!isConnected && (
                      <button
                        onClick={() => setShowSetupModal(true)}
                        className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600"
                      >
                        Conectar Google Drive
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold mb-2">Informações da Conta</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Nome:</strong> {user.user_metadata?.full_name || 'Não informado'}</p>
                  <p><strong>Cadastrado em:</strong> {new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cloud className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Conectar ao Google Drive</h2>
              <p className="text-gray-600">Sincronize seus dados na nuvem</p>
            </div>

            <button
              onClick={connectToGoogleDrive}
              disabled={isSyncing}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium mb-2 hover:bg-blue-600 disabled:bg-gray-300"
            >
              {isSyncing ? 'Conectando...' : 'Conectar Google Drive'}
            </button>

            <button
              onClick={() => setShowSetupModal(false)}
              className="w-full text-gray-500 py-2 text-sm hover:text-gray-700"
            >
              Agora não
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
