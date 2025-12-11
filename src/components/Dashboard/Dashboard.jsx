import React, { useState, useEffect, useMemo } from 'react';
import AlimonyWidget from './AlimonyWidget';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Target, 
  AlertCircle, Calendar, CreditCard, PiggyBank, Download, ChevronDown 
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getExportUrl } from '../../services/supabase';

// Opções de período disponíveis
const PERIOD_OPTIONS = [
  { value: 'month', label: 'Este Mês' },
  { value: '3months', label: 'Últimos 3 Meses' },
  { value: '6months', label: 'Últimos 6 Meses' },
  { value: 'year', label: 'Este Ano' },
  { value: 'all', label: 'Todo o Histórico' },
  { value: 'custom', label: 'Personalizado' }
];

const Dashboard = ({ transactions, categories, accounts, user }) => {
  const [period, setPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [chartType, setChartType] = useState('pie'); // 'pie' ou 'bar' para gráfico de categorias
  const [goals, setGoals] = useState({
    savings: 1000,
    expenses: 3000
  });

  // Cores para os gráficos
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

  // Calcular datas do período selecionado
  const getDateRange = useMemo(() => {
    const now = new Date();
    
    switch (period) {
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case '3months':
        return {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now)
        };
      case '6months':
        return {
          start: startOfMonth(subMonths(now, 5)),
          end: endOfMonth(now)
        };
      case 'year':
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        };
      case 'custom':
        return {
          start: new Date(customDateRange.startDate),
          end: new Date(customDateRange.endDate)
        };
      case 'all':
      default:
        return null;
    }
  }, [period, customDateRange]);

  // Calcular dados baseados no período
  const getFilteredTransactions = () => {
    if (period === 'all' || !getDateRange) return transactions;
    
    const { start, end } = getDateRange;
    
    const filtered = transactions.filter(t => {
      const [y, m, d] = String(t.date).split('-').map(Number);
      const tDate = new Date(y, (m || 1) - 1, d || 1);
      return tDate >= start && tDate <= end;
    });
    return filtered;
  };

  // Calcular totais
  const calculateTotals = () => {
    const filtered = getFilteredTransactions();
    const totals = {
      income: 0,
      expenses: 0,
      investments: 0,
      balance: 0
    };

    filtered.forEach(t => {
      if (t.type === 'income') totals.income += t.amount;
      if (t.type === 'expense') totals.expenses += t.amount;
      if (t.type === 'investment') totals.investments += t.amount;
    });

    totals.balance = totals.income - totals.expenses - totals.investments;
    return totals;
  };

  // Dados para gráfico de evolução mensal
  const getMonthlyData = () => {
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthTransactions = transactions.filter(t => {
        const [y, m, d] = String(t.date).split('-').map(Number);
        const tDate = new Date(y, (m || 1) - 1, d || 1);
        return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
      });

      const income = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

      monthlyData.push({
        month: format(date, 'MMM', { locale: ptBR }),
        receitas: income,
        gastos: expenses,
        saldo: income - expenses
      });
    }
    return monthlyData;
  };

  // Dados para gráfico de categorias
  const getCategoryData = () => {
    const filtered = getFilteredTransactions();
    const categoryTotals = {};

    filtered.forEach(t => {
      const category = categories[t.type]?.find(c => c.id === t.category);
      if (category) {
        if (!categoryTotals[category.name]) {
          categoryTotals[category.name] = {
            name: category.name,
            value: 0,
            icon: category.icon,
            color: category.color,
            type: t.type
          };
        }
        categoryTotals[category.name].value += t.amount;
      }
    });

    return Object.values(categoryTotals).sort((a, b) => b.value - a.value);
  };

  // Calcular progresso das metas
  const calculateGoalProgress = () => {
    const totals = calculateTotals();
    const savingsProgress = (totals.balance / goals.savings) * 100;
    const expensesProgress = (totals.expenses / goals.expenses) * 100;
    
    return {
      savings: Math.min(savingsProgress, 100),
      expenses: Math.min(expensesProgress, 100),
      savingsAmount: totals.balance,
      expensesAmount: totals.expenses
    };
  };

  const totals = calculateTotals();
  const monthlyData = getMonthlyData();
  const categoryData = getCategoryData();
  const goalProgress = calculateGoalProgress();

  // Função para exportar CSV
  const handleExportCSV = () => {
    if (!user?.id) return;
    
    const options = {};
    if (getDateRange) {
      options.startDate = format(getDateRange.start, 'yyyy-MM-dd');
      options.endDate = format(getDateRange.end, 'yyyy-MM-dd');
    }
    
    const exportUrl = getExportUrl(user.id, options);
    window.open(exportUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header com seletor de período */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
        <div className="flex items-center space-x-3">
          {/* Dropdown de período */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50"
            >
              <Calendar className="w-4 h-4 mr-2 text-gray-600" />
              <span>{PERIOD_OPTIONS.find(p => p.value === period)?.label || 'Período'}</span>
              <ChevronDown className="w-4 h-4 ml-2 text-gray-600" />
            </button>
            
            {showPeriodDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50">
                {PERIOD_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setPeriod(option.value);
                      setShowPeriodDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg ${
                      period === option.value ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Seletor de datas personalizado */}
          {period === 'custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <span className="text-gray-500">até</span>
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          )}
          
          {/* Botão de exportação */}
          <button
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            title="Exportar transações como CSV"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </button>
        </div>
      </div>
      
      {/* Indicador do período selecionado */}
      {getDateRange && (
        <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg inline-block">
          Mostrando dados de {format(getDateRange.start, "dd/MM/yyyy", { locale: ptBR })} 
          {' '}até {format(getDateRange.end, "dd/MM/yyyy", { locale: ptBR })}
          {' '}({getFilteredTransactions().length} transações)
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Receitas</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            R$ {totals.income.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Gastos</span>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            R$ {totals.expenses.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Investimentos</span>
            <PiggyBank className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">
            R$ {totals.investments.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Saldo</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            R$ {totals.balance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Após os cards de resumo, adicione: */}
      <AlimonyWidget user={user} transactions={transactions} />
      
      {/* Metas */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Metas do Mês
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Meta de Economia</span>
              <span className="text-sm font-bold">R$ {goalProgress.savingsAmount.toFixed(2)} / R$ {goals.savings}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${goalProgress.savings >= 100 ? 'bg-green-600' : 'bg-blue-600'}`}
                style={{ width: `${goalProgress.savings}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Limite de Gastos</span>
              <span className="text-sm font-bold">R$ {goalProgress.expensesAmount.toFixed(2)} / R$ {goals.expenses}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${goalProgress.expenses > 100 ? 'bg-red-600' : goalProgress.expenses > 80 ? 'bg-yellow-600' : 'bg-green-600'}`}
                style={{ width: `${goalProgress.expenses}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Mensal */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">Evolução Mensal</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="receitas" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="gastos" stroke="#EF4444" strokeWidth={2} />
              <Line type="monotone" dataKey="saldo" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gastos por Categoria */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Gastos por Categoria</h2>
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setChartType('pie')}
                className={`px-3 py-1 rounded text-sm ${
                  chartType === 'pie' ? 'bg-white shadow' : 'text-gray-600'
                }`}
              >
                Pizza
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 rounded text-sm ${
                  chartType === 'bar' ? 'bg-white shadow' : 'text-gray-600'
                }`}
              >
                Barras
              </button>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              </PieChart>
            ) : (
              <BarChart data={categoryData.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Valor']}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                  {categoryData.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Categorias */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold mb-4">Top Categorias</h2>
        <div className="space-y-3">
          {categoryData.slice(0, 5).map((cat, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full ${cat.color || 'bg-gray-500'} flex items-center justify-center text-white`}>
                  <span>{cat.icon || '💰'}</span>
                </div>
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-sm text-gray-600">
                    {cat.type === 'expense' ? 'Gasto' : cat.type === 'income' ? 'Receita' : 'Investimento'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">R$ {cat.value.toFixed(2)}</p>
                <p className="text-sm text-gray-600">
                  {((cat.value / (cat.type === 'expense' ? totals.expenses : cat.type === 'income' ? totals.income : totals.investments)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas e Insights */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          Insights e Alertas
        </h2>
        <div className="space-y-3">
          {goalProgress.expenses > 80 && (
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-1" />
              <div>
                <p className="font-medium text-yellow-900">Atenção aos gastos!</p>
                <p className="text-sm text-yellow-700">
                  Você já utilizou {goalProgress.expenses.toFixed(1)}% do seu limite mensal
                </p>
              </div>
            </div>
          )}

          {goalProgress.savings >= 100 && (
            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <p className="font-medium text-green-900">Meta de economia atingida!</p>
                <p className="text-sm text-green-700">
                  Parabéns! Você economizou R$ {goalProgress.savingsAmount.toFixed(2)} este mês
                </p>
              </div>
            </div>
          )}

          {categoryData.length > 0 && categoryData[0].type === 'expense' && (
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <TrendingDown className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="font-medium text-blue-900">Maior gasto: {categoryData[0].name}</p>
                <p className="text-sm text-blue-700">
                  Esta categoria representa {((categoryData[0].value / totals.expenses) * 100).toFixed(1)}% dos seus gastos
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default Dashboard;
