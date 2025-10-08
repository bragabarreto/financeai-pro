import React, { useState } from 'react';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';

const CategoriesManager = ({ 
  categories, 
  transactions,
  onBack,
  onAddCategory,
  onEditCategory,
  onDeleteCategory
}) => {
  const [activeType, setActiveType] = useState('expense');

  const getCategoryTotal = (categoryId, type) => {
    return transactions
      .filter(t => t.category === categoryId && t.type === type)
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const renderCategoryGrid = (categoryList, type, colorClass) => {
    if (categoryList.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Nenhuma categoria cadastrada
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categoryList.map(category => {
          const categoryTotal = getCategoryTotal(category.id, type);
          
          return (
            <div 
              key={category.id} 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-full ${category.color} flex items-center justify-center text-white text-2xl`}>
                  {category.icon}
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                  <button
                    onClick={() => onEditCategory(category, type)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => onDeleteCategory(category.id)}
                    className="p-1 hover:bg-red-100 rounded"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-lg">{category.name}</h3>
              {type === 'investment' && category.investment_type && (
                <p className="text-sm text-gray-600 mb-2">{category.investment_type}</p>
              )}
              <p className={`text-2xl font-bold ${colorClass} mt-2`}>
                R$ {categoryTotal.toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>
    );
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
            <h2 className="text-2xl font-bold">Categorias</h2>
            <p className="text-sm text-gray-500">Gerencie todas as suas categorias</p>
          </div>
        </div>
      </div>

      {/* Category Type Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveType('expense')}
              className={`flex-1 px-6 py-4 font-medium transition ${
                activeType === 'expense'
                  ? 'bg-red-50 text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Gastos
            </button>
            <button
              onClick={() => setActiveType('income')}
              className={`flex-1 px-6 py-4 font-medium transition ${
                activeType === 'income'
                  ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Receitas
            </button>
            <button
              onClick={() => setActiveType('investment')}
              className={`flex-1 px-6 py-4 font-medium transition ${
                activeType === 'investment'
                  ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Investimentos
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Add Category Button */}
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => onAddCategory(activeType)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg hover:opacity-90 transition text-white ${
                activeType === 'expense'
                  ? 'bg-red-600'
                  : activeType === 'income'
                  ? 'bg-green-600'
                  : 'bg-purple-600'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>Nova Categoria</span>
            </button>
          </div>

          {/* Category Lists */}
          {activeType === 'expense' && renderCategoryGrid(
            categories.expense, 
            'expense', 
            'text-red-600'
          )}
          {activeType === 'income' && renderCategoryGrid(
            categories.income, 
            'income', 
            'text-green-600'
          )}
          {activeType === 'investment' && renderCategoryGrid(
            categories.investment, 
            'investment', 
            'text-purple-600'
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total de Gastos</h3>
          <p className="text-2xl font-bold text-red-600">
            {categories.expense.length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total de Receitas</h3>
          <p className="text-2xl font-bold text-green-600">
            {categories.income.length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total de Investimentos</h3>
          <p className="text-2xl font-bold text-purple-600">
            {categories.investment.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CategoriesManager;
