import React, { useState, useEffect } from 'react';
import { supabase, getCurrentUser, signOut } from './services/supabase';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';

// Importar o componente antigo do Dashboard
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Wallet, Settings, Cloud, CloudOff, RefreshCw, LogIn, LogOut, Edit2, Trash2, Building, X } from 'lucide-react';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState('login'); // 'login', 'register', 'forgot'
  
  // Estados do dashboard (mantém os anteriores)
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncStatus, setSyncStatus] = useState('disconnected');
  const [showSetupModal, setShowSetupModal] = useState(false);
  
  const [categories, setCategories] = useState({
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
  });

  const [accounts, setAccounts] = useState([
    { id: 1, name: 'Nubank', institution: 'Nubank S.A.', type: 'corrente', balance: 2034.00 },
  ]);

  const [transactions, setTransactions] = useState([
    { id: 1, type: 'expense', description: 'Supermercado', amount: 245.80, category: 'Alimentação', date: '2025-10-01' },
    { id: 2, type: 'income', description: 'Salário', amount: 5500.00, category: 'Salário', date: '2025-10-01' },
  ]);

  // Verificar autenticação ao carregar
  useEffect(() => {
    checkUser();
    
    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const user = await getCurrentUser();
    setUser(user);
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);