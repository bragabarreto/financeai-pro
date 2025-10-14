import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, DollarSign, CheckCircle, XCircle, Clock, AlertTriangle, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  getUserBills, 
  generateBillsForAllCards, 
  markBillAsPaid,
  getBillTransactions 
} from '../../services/billService';

const BillsManager = ({ user, cards }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billTransactions, setBillTransactions] = useState([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (user && cards.length > 0) {
      loadBills();
    }
  }, [user, cards]);

  const loadBills = async () => {
    try {
      setLoading(true);
      
      // Gerar/atualizar faturas para todos os cartões
      await generateBillsForAllCards(cards, user.id);
      
      // Carregar faturas
      const allBills = await getUserBills(user.id);
      setBills(allBills);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTransactions = async (bill) => {
    try {
      setSelectedBill(bill);
      setShowTransactions(true);
      
      const transactions = await getBillTransactions(
        bill.card_id,
        bill.period_start,
        bill.period_end,
        user.id
      );
      
      setBillTransactions(transactions);
    } catch (error) {
      console.error('Erro ao carregar transações da fatura:', error);
    }
  };

  const handleMarkAsPaid = async (billId, totalAmount) => {
    try {
      await markBillAsPaid(billId, totalAmount);
      await loadBills(); // Recarregar faturas
    } catch (error) {
      console.error('Erro ao marcar fatura como paga:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'closed':
        return <XCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'Paga';
      case 'overdue':
        return 'Vencida';
      case 'closed':
        return 'Fechada';
      default:
        return 'Aberta';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'closed':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const formatMonth = (month, year) => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  const filteredBills = filterStatus === 'all' 
    ? bills 
    : bills.filter(bill => bill.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Faturas de Cartão</h2>
        <button
          onClick={loadBills}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Atualizar Faturas
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filterStatus === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilterStatus('open')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filterStatus === 'open'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Abertas
        </button>
        <button
          onClick={() => setFilterStatus('closed')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filterStatus === 'closed'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Fechadas
        </button>
        <button
          onClick={() => setFilterStatus('overdue')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filterStatus === 'overdue'
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Vencidas
        </button>
        <button
          onClick={() => setFilterStatus('paid')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filterStatus === 'paid'
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pagas
        </button>
      </div>

      {/* Lista de Faturas */}
      {filteredBills.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nenhuma fatura encontrada</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBills.map((bill) => (
            <div
              key={bill.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-8 rounded ${bill.credit_cards?.color || 'bg-gray-500'} flex items-center justify-center`}>
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{bill.credit_cards?.name || 'Cartão'}</h3>
                    <p className="text-sm text-gray-600">
                      {bill.credit_cards?.brand?.toUpperCase()} •••• {bill.credit_cards?.last_digits}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${getStatusColor(bill.status)}`}>
                  {getStatusIcon(bill.status)}
                  <span className="text-sm font-medium">{getStatusText(bill.status)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Período</p>
                  <p className="font-medium">{formatMonth(bill.month, bill.year)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Fechamento</p>
                  <p className="font-medium">{formatDate(bill.closing_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Vencimento</p>
                  <p className="font-medium">{formatDate(bill.due_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                  <p className="font-bold text-lg text-blue-600">
                    R$ {parseFloat(bill.total_amount || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewTransactions(bill)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver Transações
                </button>
                {bill.status !== 'paid' && bill.total_amount > 0 && (
                  <button
                    onClick={() => handleMarkAsPaid(bill.id, bill.total_amount)}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar como Paga
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Transações */}
      {showTransactions && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                Transações - {formatMonth(selectedBill.month, selectedBill.year)}
              </h3>
              <button
                onClick={() => setShowTransactions(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Período da Fatura</p>
              <p className="font-medium">
                {formatDate(selectedBill.period_start)} até {formatDate(selectedBill.period_end)}
              </p>
            </div>

            {billTransactions.length === 0 ? (
              <p className="text-center text-gray-600 py-8">Nenhuma transação neste período</p>
            ) : (
              <div className="space-y-2">
                {billTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="p-4 bg-gray-50 rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-gray-600">{formatDate(transaction.date)}</p>
                    </div>
                    <p className={`font-bold ${
                      transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.type === 'expense' ? '-' : '+'} R$ {parseFloat(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Total:</span>
                <span className="font-bold text-xl text-blue-600">
                  R$ {parseFloat(selectedBill.total_amount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillsManager;

