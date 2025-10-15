/**
 * Paycheck Preview Component
 * Preview interativo e editável de contracheques importados
 * Permite edição completa de todas as transações
 */

import React, { useState, useEffect } from 'react';
import { formatBrazilianDate, formatDateLocal } from '../../utils/dateUtils';
import {
  Edit2, Check, X, AlertTriangle, DollarSign, 
  TrendingUp, TrendingDown, Calendar, Tag, CreditCard, Building2
} from 'lucide-react';

const PaycheckPreview = ({ 
  data, 
  categories, 
  accounts, 
  cards,
  onTransactionsChange,
  onValidationChange 
}) => {
  const [transactions, setTransactions] = useState(data.transactions || []);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showIncomes, setShowIncomes] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);

  // Atualizar transações quando dados mudarem
  useEffect(() => {
    setTransactions(data.transactions || []);
  }, [data]);

  // Notificar mudanças
  useEffect(() => {
    if (onTransactionsChange) {
      onTransactionsChange(transactions);
    }
    
    // Validar totais
    if (onValidationChange) {
      const validation = validateTotals();
      onValidationChange(validation);
    }
  }, [transactions]);

  // Validar totais
  const validateTotals = () => {
    const totalCredits = transactions
      .filter(t => t.type === 'income' && t.selected)
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const totalDebits = transactions
      .filter(t => t.type === 'expense' && t.selected)
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const expectedGross = data.validation?.expected_gross || 0;
    const expectedDeductions = data.validation?.expected_deductions || 0;
    const expectedNet = data.validation?.expected_net || 0;
    
    const creditsDiff = Math.abs(totalCredits - expectedGross);
    const debitsDiff = Math.abs(totalDebits - expectedDeductions);
    const netCalculated = totalCredits - totalDebits;
    const netDiff = Math.abs(netCalculated - expectedNet);
    
    return {
      totalCredits,
      totalDebits,
      netCalculated,
      expectedGross,
      expectedDeductions,
      expectedNet,
      creditsMatch: creditsDiff < 0.01,
      debitsMatch: debitsDiff < 0.01,
      netMatch: netDiff < 0.01,
      warnings: []
    };
  };

  // Iniciar edição
  const startEdit = (transaction) => {
    setEditingId(transaction.id);
    setEditForm({ ...transaction });
  };

  // Cancelar edição
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Salvar edição
  const saveEdit = () => {
    // If installment data present, ensure calculated fields are coherent
    const updatedEditForm = { ...editForm };
    if (!updatedEditForm.is_installment) {
      updatedEditForm.installment_count = null;
      updatedEditForm.installment_due_dates = [];
      updatedEditForm.last_installment_date = null;
    } else if (updatedEditForm.is_installment && updatedEditForm.installment_count && updatedEditForm.date) {
      const dates = calculateInstallmentDates(updatedEditForm.date, parseInt(updatedEditForm.installment_count));
      updatedEditForm.installment_due_dates = dates;
      updatedEditForm.last_installment_date = dates[dates.length - 1];
    }

    setTransactions(prev => 
      prev.map(t => t.id === editingId ? { ...updatedEditForm, manuallyEdited: true } : t)
    );
    setEditingId(null);
    setEditForm({});
  };

  // Atualizar campo do formulário
  const updateField = (field, value) => {
    setEditForm(prev => {
      const next = { ...prev, [field]: value };
      // Reset installment fields if toggled off
      if (field === 'is_installment' && !value) {
        next.installment_count = null;
        next.installment_due_dates = [];
        next.last_installment_date = null;
      }
      // Recalculate dates if count or date changes and installment is enabled
      if ((field === 'installment_count' || field === 'date') && next.is_installment) {
        const count = parseInt(field === 'installment_count' ? value : next.installment_count) || 0;
        if (count > 0 && next.date) {
          const dates = calculateInstallmentDates(next.date, count);
          next.installment_due_dates = dates;
          next.last_installment_date = dates[dates.length - 1];
        }
      }
      return next;
    });
  };

  // Helper to calculate installment dates
  const calculateInstallmentDates = (startDate, count) => {
    const dates = [];
    const baseDate = new Date(startDate);
    for (let i = 0; i < count; i++) {
      const installmentDate = new Date(baseDate);
      installmentDate.setMonth(baseDate.getMonth() + i);
      dates.push(formatDateLocal(installmentDate));
    }
    return dates;
  };

  // Toggle seleção
  const toggleSelection = (id) => {
    setTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t)
    );
  };

  // Selecionar/Desmarcar todas
  const toggleAll = (type, selected) => {
    setTransactions(prev =>
      prev.map(t => t.type === type ? { ...t, selected } : t)
    );
  };

  // Filtrar transações
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  const selectedIncomes = incomeTransactions.filter(t => t.selected);
  const selectedExpenses = expenseTransactions.filter(t => t.selected);

  // Obter categorias por tipo
  const getCategoriesByType = (type) => {
    return Object.values(categories[type] || {});
  };

  // Renderizar linha de transação
  const renderTransaction = (transaction) => {
    const isEditing = editingId === transaction.id;
    const currentData = isEditing ? editForm : transaction;
    const availableCategories = getCategoriesByType(transaction.type);
    
    // Encontrar categoria atual
    const currentCategory = availableCategories.find(c => c.id === currentData.categoryId);

    if (isEditing) {
      return (
        <tr key={transaction.id} className="bg-blue-50">
          <td className="px-4 py-3">
            <input
              type="checkbox"
              checked={currentData.selected}
              onChange={(e) => updateField('selected', e.target.checked)}
              className="w-4 h-4"
            />
          </td>
          <td className="px-4 py-3">
            <input
              type="text"
              value={currentData.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-2 py-1 border rounded"
              placeholder="Descrição"
            />
          </td>
          <td className="px-4 py-3">
            <input
              type="number"
              step="0.01"
              value={currentData.amount}
              onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 border rounded"
            />
          </td>
          <td className="px-4 py-3">
            <input
              type="date"
              value={currentData.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="w-full px-2 py-1 border rounded"
            />
          </td>
          <td className="px-4 py-3">
            <select
              value={currentData.categoryId || ''}
              onChange={(e) => updateField('categoryId', e.target.value)}
              className="w-full px-2 py-1 border rounded"
            >
              <option value="">Selecione...</option>
              {availableCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {/* Parcelamento controls */}
            <div className="mt-3 p-2 bg-blue-100 rounded">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={currentData.is_installment || false}
                  onChange={(e) => updateField('is_installment', e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Transação Parcelada</span>
              </label>
              {currentData.is_installment && (
                <div className="mt-2 space-y-1">
                  <input
                    type="number"
                    min="2"
                    max="48"
                    value={currentData.installment_count || ''}
                    onChange={(e) => updateField('installment_count', parseInt(e.target.value) || '')}
                    className="w-24 px-2 py-1 border rounded text-sm"
                    placeholder="12"
                  />
                  {currentData.installment_count > 0 && currentData.last_installment_date && (
                    <div className="text-xs text-blue-800">
                      até {formatBrazilianDate(currentData.last_installment_date)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </td>
          <td className="px-4 py-3">
            <select
              value={currentData.account_id || ''}
              onChange={(e) => updateField('account_id', e.target.value)}
              className="w-full px-2 py-1 border rounded"
            >
              <option value="">Selecione...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </td>
          <td className="px-4 py-3">
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                title="Salvar"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={cancelEdit}
                className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr 
        key={transaction.id} 
        className={`${!transaction.selected ? 'opacity-50' : ''} hover:bg-gray-50`}
      >
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={transaction.selected}
            onChange={() => toggleSelection(transaction.id)}
            className="w-4 h-4"
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {transaction.is_alimony && (
              <span className="text-red-600" title="Pensão Alimentícia">🚨</span>
            )}
            <span className={transaction.manuallyEdited ? 'font-semibold' : ''}>
              {transaction.description}
            </span>
          </div>
          {transaction.rubric && (
            <span className="text-xs text-gray-500">Rubrica: {transaction.rubric}</span>
          )}
        </td>
        <td className="px-4 py-3 font-semibold">
          R$ {transaction.amount.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {formatBrazilianDate(transaction.date)}
        </td>
        <td className="px-4 py-3">
          {currentCategory ? (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
              {currentCategory.name}
            </span>
          ) : (
            <span className="text-gray-400 text-sm">Sem categoria</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {transaction.account_id ? (
            accounts.find(a => a.id === transaction.account_id)?.name || 'N/A'
          ) : (
            <span className="text-gray-400">Não definida</span>
          )}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => startEdit(transaction)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
    );
  };

  const validation = validateTotals();

  return (
    <div className="space-y-6">
      {/* Cabeçalho com informações do contracheque */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-blue-600" />
          Contracheque - {data.metadata.month}/{data.metadata.year}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Funcionário</p>
            <p className="font-semibold">{data.metadata.employee_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">CPF</p>
            <p className="font-semibold">{data.metadata.cpf}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Órgão/Empresa</p>
            <p className="font-semibold">{data.metadata.employer}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Data de Crédito</p>
            <p className="font-semibold">
              {formatBrazilianDate(data.metadata.payment_date)}
            </p>
          </div>
        </div>

        {/* Resumo financeiro */}
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-blue-200">
          <div>
            <p className="text-sm text-gray-600">Bruto</p>
            <p className="text-lg font-bold text-green-600">
              R$ {validation.expectedGross.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Descontos</p>
            <p className="text-lg font-bold text-red-600">
              R$ {validation.expectedDeductions.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Líquido</p>
            <p className="text-lg font-bold text-blue-600">
              R$ {validation.expectedNet.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Alertas de validação */}
        {(!validation.creditsMatch || !validation.debitsMatch || !validation.netMatch) && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-800">Atenção: Divergências encontradas</p>
              {!validation.creditsMatch && (
                <p className="text-yellow-700">
                  • Total de créditos: R$ {validation.totalCredits.toFixed(2)} 
                  (esperado: R$ {validation.expectedGross.toFixed(2)})
                </p>
              )}
              {!validation.debitsMatch && (
                <p className="text-yellow-700">
                  • Total de débitos: R$ {validation.totalDebits.toFixed(2)} 
                  (esperado: R$ {validation.expectedDeductions.toFixed(2)})
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Seção de Receitas */}
      <div className="border rounded-lg overflow-hidden">
        <div 
          className="bg-green-50 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-green-100"
          onClick={() => setShowIncomes(!showIncomes)}
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h4 className="font-bold text-lg">
              Receitas ({selectedIncomes.length}/{incomeTransactions.length})
            </h4>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-green-700">
              R$ {validation.totalCredits.toFixed(2)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); toggleAll('income', true); }}
                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Selecionar Todas
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleAll('income', false); }}
                className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Desmarcar Todas
              </button>
            </div>
          </div>
        </div>

        {showIncomes && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIncomes.length === incomeTransactions.length}
                      onChange={(e) => toggleAll('income', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Conta</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-16">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {incomeTransactions.map(renderTransaction)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seção de Despesas */}
      <div className="border rounded-lg overflow-hidden">
        <div 
          className="bg-red-50 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-red-100"
          onClick={() => setShowExpenses(!showExpenses)}
        >
          <div className="flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h4 className="font-bold text-lg">
              Descontos ({selectedExpenses.length}/{expenseTransactions.length})
            </h4>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-red-700">
              R$ {validation.totalDebits.toFixed(2)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); toggleAll('expense', true); }}
                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Selecionar Todas
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleAll('expense', false); }}
                className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Desmarcar Todas
              </button>
            </div>
          </div>
        </div>

        {showExpenses && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-12">
                    <input
                      type="checkbox"
                      checked={selectedExpenses.length === expenseTransactions.length}
                      onChange={(e) => toggleAll('expense', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Conta</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-16">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenseTransactions.map(renderTransaction)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumo de seleção */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {selectedIncomes.length + selectedExpenses.length} transações selecionadas
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Líquido calculado: R$ {validation.netCalculated.toFixed(2)}
            </p>
          </div>
          {validation.netMatch && (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="font-semibold">Valores conferem!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaycheckPreview;

