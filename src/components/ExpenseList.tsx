import React, { useState, useMemo } from 'react';
import { Expense, Settings, CategoryId } from '../types';
import { ExpenseItem } from './ExpenseItem';
import { CATEGORIES } from '../constants';
import { totalExpenses, formatCurrency } from '../calculations';

interface Props {
  expenses: Expense[];
  settings: Settings;
  onDelete: (id: string) => void;
  onEdit?:  (expense: Expense) => void;
}

export function ExpenseList({ expenses, settings, onDelete, onEdit }: Props) {
  const [filterCategory, setFilterCategory] = useState<CategoryId | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const months = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach(e => set.add(e.date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [expenses]);

  const filtered = useMemo(() =>
    expenses
      .filter(e => filterCategory === 'all' || e.categoryId === filterCategory)
      .filter(e => filterMonth === 'all' || e.date.startsWith(filterMonth)),
    [expenses, filterCategory, filterMonth],
  );

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-5xl mb-3">📋</span>
        <p className="font-medium">Noch keine Ausgaben</p>
        <p className="text-sm mt-1">Füge deine erste Ausgabe hinzu</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setFilterCategory('all')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            filterCategory === 'all' ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Alle
        </button>
        {CATEGORIES.filter(c => expenses.some(e => e.categoryId === c.id)).map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(filterCategory === cat.id ? 'all' : cat.id)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              filterCategory === cat.id ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Month filter */}
      {months.length > 1 && (
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
        >
          <option value="all">Alle Monate</option>
          {months.map(m => {
            const [y, mo] = m.split('-');
            const label = new Date(+y, +mo - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
            return <option key={m} value={m}>{label}</option>;
          })}
        </select>
      )}

      {/* Summary bar */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
        <span className="text-sm text-gray-500">{filtered.length} {filtered.length === 1 ? 'Ausgabe' : 'Ausgaben'}</span>
        <span className="font-semibold text-gray-800">{formatCurrency(totalExpenses(filtered))}</span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Keine Ausgaben für diesen Filter</p>
        ) : (
          filtered.map(e => (
            <ExpenseItem key={e.id} expense={e} settings={settings} onDelete={onDelete} onEdit={onEdit} />
          ))
        )}
      </div>
    </div>
  );
}
