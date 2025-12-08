import React, { useMemo, useState } from 'react';
import { Edit, Trash2, CreditCard, Building, Calendar, Tag, DollarSign, Repeat } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('recent'); // 'recent' | 'future'

  const recentTransactions = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return transactions
      .filter(t => {
        const transDate = parseLocalDate(t.date);
        return (
          t.type === type &&
          transDate >= thirtyDaysAgo &&
          transDate <= now
        );
      })
      .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  }, [transactions, type]);

  const futureTransactions = useMemo(() => {
    const now = new Date();

    return transactions
      .filter(t => {
        const transDate = parseLocalDate(t.date);
        return t.type === type && transDate > now;
      })
      .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
  }, [transactions, type]);

  const filteredTransactions = activeTab === 'recent' ? recentTransactions : futureTransactions;

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
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      pix: 'PIX',
      transfer: 'Transferência',
      boleto: 'Boleto',
      cash: 'Dinheiro',
      other: 'Outro'
    };
    return methods[method] || method || '-';
  };

  // Extract installment number from description (format: "Description (X/Y)")
  const getInstallmentInfo = (transaction) => {
    // Try to get from installment_number field first
    if (transaction.installment_number) {
      return {
        current: transaction.installment_number,
        total: transaction.installment_count || '?'
      };
    }
    // Fallback: extract from description
    const match = transaction.description?.match(/\((\d+)\/(\d+)\)$/);
    if (match) {
      return {
        current: parseInt(match[1]),
        total: parseInt(match[2])
      };
    }
    return {
      current: '?',
      total: transaction.installment_count || '?'
    };
  };

  const formatDate = (dateString) => {
    return formatBrazilianDate(dateString);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'recent'
                ? `${filteredTransactions.length} transação(ões) nos últimos 30 dias`
                : `${filteredTransactions.length} lançamento(s) futuros registrados`}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === 'recent'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Últimos 30 dias ({recentTransactions.length})
            </button>
            <button
              onClick={() => setActiveTab('future')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === 'future'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Lançamentos futuros ({futureTransactions.length})
            </button>
          </div>
        </div>
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
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={type === 'expense' ? 8 : 7} className="px-4 py-6 text-center text-sm text-gray-500">
                  {activeTab === 'recent'
                    ? 'Nenhuma transação registrada nos últimos 30 dias.'
                    : 'Nenhum lançamento futuro cadastrado para este tipo.'}
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(transaction.date)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="max-w-xs truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                      {transaction.is_installment && (() => {
                        const info = getInstallmentInfo(transaction);
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800" title={`Parcela ${info.current} de ${info.total}`}>
                            <Repeat className="w-3 h-3 mr-1" />
                            {info.current}/{info.total}
                          </span>
                        );
                      })()}
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
              ))
            )}
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
