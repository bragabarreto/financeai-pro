import React from 'react';
import { ArrowLeft, TrendingUp, PieChart, DollarSign, Calendar } from 'lucide-react';

const Portfolio = ({ transactions, categories, onBack }) => {
  // Group investment transactions by category
  const getInvestmentsByCategory = () => {
    const investments = transactions.filter(t => t.type === 'investment');
    const grouped = {};
    
    investments.forEach(transaction => {
      const categoryId = transaction.category;
      if (!grouped[categoryId]) {
        const category = categories.investment.find(c => c.id === categoryId);
        grouped[categoryId] = {
          category: category || { name: 'Sem categoria', icon: '📊' },
          transactions: [],
          currentBalance: 0
        };
      }
      grouped[categoryId].transactions.push(transaction);
      grouped[categoryId].currentBalance += transaction.amount;
    });
    
    return Object.values(grouped);
  };

  const investmentGroups = getInvestmentsByCategory();
  const totalPortfolio = investmentGroups.reduce((acc, group) => acc + group.currentBalance, 0);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold">Patrimônio</h2>
            <p className="text-sm text-gray-500">Visão geral dos seus investimentos</p>
          </div>
        </div>
      </div>

      {/* Total Portfolio Card */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Patrimônio Total</p>
              <p className="text-3xl font-bold">R$ {totalPortfolio.toFixed(2)}</p>
            </div>
          </div>
          <TrendingUp className="w-12 h-12 opacity-50" />
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-sm opacity-90">Investimentos</p>
            <p className="text-xl font-semibold">{investmentGroups.length}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Transações</p>
            <p className="text-xl font-semibold">
              {investmentGroups.reduce((acc, g) => acc + g.transactions.length, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Investments by Category */}
      {investmentGroups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <p className="text-gray-500">Nenhum investimento registrado</p>
        </div>
      ) : (
        <div className="space-y-6">
          {investmentGroups.map((group, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Category Header */}
              <div className="bg-purple-50 px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{group.category.icon}</span>
                    <div>
                      <h3 className="font-bold text-lg">{group.category.name}</h3>
                      <p className="text-sm text-gray-600">
                        {group.transactions.length} transação(ões)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Saldo Atual</p>
                    <p className="text-2xl font-bold text-purple-600">
                      R$ {group.currentBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Descrição
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {group.transactions
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>{formatDate(transaction.date)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div>{transaction.description}</div>
                            {transaction.origin && (
                              <div className="text-xs text-gray-500 mt-1">
                                Origem: {transaction.origin}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-purple-600">
                                R$ {transaction.amount.toFixed(2)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Portfolio;
