import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Users, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../supabaseClient';

const AlimonyWidget = ({ user, transactions }) => {
  const [alimonyData, setAlimonyData] = useState({
    currentMonth: 0,
    average6Months: 0,
    monthlyData: []
  });

  useEffect(() => {
    if (user && transactions) {
      calculateAlimonyData();
    }
  }, [user, transactions]);

  const calculateAlimonyData = () => {
    const now = new Date();
    const monthlyTotals = [];

    // Calcular últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthTotal = transactions
        .filter(t => {
          const tDate = new Date(t.date);
          return t.is_alimony && 
                 tDate >= monthStart && 
                 tDate <= monthEnd;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyTotals.push({
        month: format(monthDate, 'MMM', { locale: ptBR }),
        monthYear: format(monthDate, 'MMM/yy', { locale: ptBR }),
        total: monthTotal,
        isCurrent: i === 0
      });
    }

    // Calcular média (excluindo mês atual)
    const previousMonths = monthlyTotals.slice(0, 5);
    const average = previousMonths.length > 0
      ? previousMonths.reduce((sum, m) => sum + m.total, 0) / previousMonths.length
      : 0;

    setAlimonyData({
      currentMonth: monthlyTotals[5]?.total || 0,
      average6Months: average,
      monthlyData: monthlyTotals
    });
  };

  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center">
          <Users className="w-5 h-5 mr-2 text-purple-600" />
          Pensão Alimentícia
        </h2>
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
          Acompanhamento Mensal
        </span>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Mês Atual</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-purple-600">
            {formatCurrency(alimonyData.currentMonth)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Média 6 meses</span>
            <TrendingUp className="w-4 h-4 text-gray-600" />
          </div>
          <p className="text-xl font-bold text-gray-700">
            {formatCurrency(alimonyData.average6Months)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Média dos últimos 5 meses
          </p>
        </div>
      </div>

      {/* Gráfico de Barras */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={alimonyData.monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `R$ ${value}`}
            />
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => `Mês: ${label}`}
            />
            <Bar 
              dataKey="total" 
              fill="#9333ea"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Indicador de Variação */}
      {alimonyData.average6Months > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Variação do mês atual</span>
            <span className={`font-bold ${
              alimonyData.currentMonth > alimonyData.average6Months 
                ? 'text-red-600' 
                : 'text-green-600'
            }`}>
              {alimonyData.currentMonth > alimonyData.average6Months ? '+' : ''}
              {((alimonyData.currentMonth - alimonyData.average6Months) / alimonyData.average6Months * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlimonyWidget;
