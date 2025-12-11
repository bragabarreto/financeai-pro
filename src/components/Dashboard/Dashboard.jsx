import React, { useState, useEffect } from 'react';
import AlimonyWidget from './AlimonyWidget';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Target, 
  AlertCircle, Calendar, CreditCard, PiggyBank, Download 
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard = ({ transactions, categories, accounts, user }) => {
  const [period, setPeriod] = useState('month'); // month, 3months, 6months, year, all, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [goals, setGoals] = useState({
    savings: 1000,
    expenses: 3000
  });

  // Cores para os gráficos
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

  // Calcular dados baseados no período
  const getFilteredTransactions = () => {
    if (period === 'all') return transactions;
    
    const now = new Date();
    let startDate, endDate;
    
    if (period === 'custom' && customStartDate && customEndDate) {
      startDate = parseISO(customStartDate);
      endDate = parseISO(customEndDate);
    } else if (period === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (period === '3months') {
      startDate = subMonths(now, 3);
      endDate = now;
    } else if (period === '6months') {
      startDate = subMonths(now, 6);
      endDate = now;
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    }
    
    const filtered = transactions.filter(t => {
      const [y, m, d] = String(t.date).split('-').map(Number);
      const tDate = new Date(y, (m || 1) - 1, d || 1);
      
      if (period === 'custom' || period === 'month' || period === '3months' || period === '6months' || period === 'year') {
        return isWithinInterval(tDate, { start: startDate, end: endDate });
      }
      
      return true;
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
    const categoryCount = {};

    filtered.forEach(t => {
      const category = categories[t.type]?.find(c => c.id === t.category);
      if (category) {
        if (!categoryTotals[category.name]) {
          categoryTotals[category.name] = {
            name: category.name,
            value: 0,
            icon: category.icon,
            color: category.color,
            type: t.type,
            count: 0
          };
        }
        categoryTotals[category.name].value += t.amount;
        categoryTotals[category.name].count += 1;
      }
    });

    return Object.values(categoryTotals).sort((a, b) => b.value - a.value);
  };
  
  // Export to CSV function
  const handleExportCSV = async () => {
    try {
      if (!user || !user.id) {
        alert('Usuário não identificado');
        return;
      }
      
      // Get filtered date range
      let startDate, endDate;
      const now = new Date();
      
      if (period === 'custom' && customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
      } else if (period === 'month') {
        startDate = format(startOfMonth(now), 'yyyy-MM-dd');
        endDate = format(endOfMonth(now), 'yyyy-MM-dd');
      } else if (period === '3months') {
        startDate = format(subMonths(now, 3), 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
      } else if (period === '6months') {
        startDate = format(subMonths(now, 6), 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
      } else if (period === 'year') {
        startDate = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');
        endDate = format(new Date(now.getFullYear(), 11, 31), 'yyyy-MM-dd');
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        userId: user.id
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      // Call export endpoint
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/export-transactions?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Falha ao exportar transações');
      }
      
      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${format(now, 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Erro ao exportar transações: ' + error.message);
    }
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

  return (
    <div className="space-y-6">
      {/* Header com seletor de período */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
        
        <div className="flex flex-wrap gap-2 items-center">
          {/* Period selector buttons */}
          <button
            onClick={() => { setPeriod('month'); setShowCustomDatePicker(false); }}
            className={`px-3 py-2 rounded-lg text-sm ${period === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Mês Atual
          </button>
          <button
            onClick={() => { setPeriod('3months'); setShowCustomDatePicker(false); }}
            className={`px-3 py-2 rounded-lg text-sm ${period === '3months' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Últimos 3 Meses
          </button>
          <button
            onClick={() => { setPeriod('6months'); setShowCustomDatePicker(false); }}
            className={`px-3 py-2 rounded-lg text-sm ${period === '6months' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Últimos 6 Meses
          </button>
          <button
            onClick={() => { setPeriod('year'); setShowCustomDatePicker(false); }}
            className={`px-3 py-2 rounded-lg text-sm ${period === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Ano
          </button>
          <button
            onClick={() => { setPeriod('all'); setShowCustomDatePicker(false); }}
            className={`px-3 py-2 rounded-lg text-sm ${period === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Todo Histórico
          </button>
          <button
            onClick={() => { setShowCustomDatePicker(!showCustomDatePicker); setPeriod('custom'); }}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${period === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            <Calendar className="w-4 h-4" />
            Customizado
          </button>
          
          {/* Export button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Custom date picker */}
      {showCustomDatePicker && (
        <div className="bg-white rounded-xl shadow-lg p-4 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Data Início:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Data Fim:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
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

        {/* Gastos por Categoria - Pie Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">Gastos por Categoria</h2>
          <ResponsiveContainer width="100%" height={300}>
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
              <Tooltip 
                formatter={(value, name, props) => {
                  const percent = ((value / totals.expenses) * 100).toFixed(1);
                  const count = props.payload.count;
                  return [`R$ ${value.toFixed(2)} (${percent}%) - ${count} transações`, 'Valor'];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Horizontal Bar Chart for Top Categories */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold mb-4">Top 10 Categorias por Valor</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={categoryData.slice(0, 10)} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={90} />
            <Tooltip 
              formatter={(value, name, props) => {
                const total = totals[props.payload.type === 'expense' ? 'expenses' : props.payload.type === 'income' ? 'income' : 'investments'];
                const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                const count = props.payload.count;
                return [`R$ ${value.toFixed(2)} (${percent}% do total) - ${count} transações`, 'Valor'];
              }}
            />
            <Legend />
            <Bar dataKey="value" fill="#3B82F6" name="Valor" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Categorias */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold mb-4">Top Categorias - Resumo</h2>
        <div className="space-y-3">
          {categoryData.slice(0, 5).map((cat, index) => {
            const totalForType = totals[cat.type === 'expense' ? 'expenses' : cat.type === 'income' ? 'income' : 'investments'];
            const percent = totalForType > 0 ? ((cat.value / totalForType) * 100).toFixed(1) : 0;
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full ${cat.color || 'bg-gray-500'} flex items-center justify-center text-white`}>
                    <span>{cat.icon || '💰'}</span>
                  </div>
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-sm text-gray-600">
                      {cat.type === 'expense' ? 'Gasto' : cat.type === 'income' ? 'Receita' : 'Investimento'} • {cat.count} transações
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">R$ {cat.value.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    {percent}% do total
                  </p>
                </div>
              </div>
            );
          })}
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
