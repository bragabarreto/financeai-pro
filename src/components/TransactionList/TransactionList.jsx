import React from 'react';
import { Edit, Trash2, CreditCard, Building, Calendar, Tag, DollarSign } from 'lucide-react';
import { parseLocalDate, formatBrazilianDate } from '../../utils/dateUtils';

const TransactionList = ({ 
  transactions, 
  categories, 
  accounts, 
  cards,
  onEdit, 
  onDelete,
  type,
  title 
}) => {
  // Filter transactions from last 30 days
  const getLast30DaysTransactions = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return transactions
      .filter(t => {
        const transDate = parseLocalDate(t.date);
        return t.type === type && transDate >= thirtyDaysAgo;
      })
      .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  };

  const filteredTransactions = getLast30DaysTransactions();

  const getCategoryName = (categoryId) => {
    const allCategories = [...categories.expense, ...categories.income, ...categories.investment];
    const category = allCategories.find(c => c.id === categoryId);
    return category ? category.name : 'Sem categoria';
  };

  const getAccountName = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : '-';
  };

  const getCardName = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    return card ? `${card.name} (${card.last_four})` : '-';
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'pix': 'PIX',
      'transfer': 'Transferência',
      'boleto': 'Boleto',
      'cash': 'Dinheiro',
      'other': 'Outro'
    };
    return methods[method] || method || '-';
  };

  const formatDate = (dateString) => {
    return formatBrazilianDate(dateString);
  };

  if (filteredTransactions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <p className="text-gray-500">Nenhuma transação nos últimos 30 dias</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">
          {filteredTransactions.length} transação(ões) nos últimos 30 dias
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meio Pgto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forma de Pagamento</th>
              {type === 'expense' && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pensão</th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{formatDate(transaction.date)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="max-w-xs truncate" title={transaction.description}>
                    {transaction.description}
                  </div>
                  {transaction.origin && (
                    <div className="text-xs text-gray-500 mt-1">
                      Origem: {transaction.origin}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      R$ {transaction.amount.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span>{getCategoryName(transaction.category)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {getPaymentMethodLabel(transaction.payment_method)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {transaction.payment_method === 'credit_card' ? (
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span>{getCardName(transaction.card_id)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span>{getAccountName(transaction.account_id)}</span>
                    </div>
                  )}
                </td>
                {type === 'expense' && (
                  <td className="px-4 py-3 text-sm text-center">
                    {transaction.is_alimony ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        Sim
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onEdit(transaction)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => onDelete(transaction.id)}
                      className="p-1 hover:bg-red-100 rounded"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Total: {filteredTransactions.length} transação(ões)
          </span>
          <span className="text-lg font-bold">
            R$ {filteredTransactions.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
