import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, ImageIcon } from 'lucide-react';
import { Expense, Settings } from '../types';
import { CATEGORIES } from '../constants';
import { formatCurrency } from '../calculations';

interface Props {
  expense: Expense;
  settings: Settings;
  onDelete: (id: string) => void;
}

export function ExpenseItem({ expense, settings, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const cat = CATEGORIES.find(c => c.id === expense.categoryId)!;
  const paidByName = expense.paidBy === 'person1' ? settings.person1Name : settings.person2Name;
  const p1Share = expense.amount * expense.splitRatio;
  const p2Share = expense.amount * (1 - expense.splitRatio);

  const dateStr = new Date(expense.date + 'T12:00:00').toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
  });

  // Settlement entries get a distinct card style
  if (expense.categoryId === 'ausgleich') {
    return (
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">💸</span>
        <div className="flex-1">
          <p className="font-semibold text-indigo-700">Ausgleich</p>
          <p className="text-xs text-indigo-400">{dateStr} · {paidByName} überwies</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-bold text-indigo-600">{formatCurrency(expense.amount)}</span>
          <button
            onClick={() => { if (window.confirm('Ausgleich löschen?')) onDelete(expense.id); }}
            className="text-red-400 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-3 p-4 text-left"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bgColor}`}>
            <span className="text-lg leading-none">{cat.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate">{expense.description}</p>
            <p className="text-xs text-gray-400">{dateStr} · {paidByName}</p>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span className="font-bold text-gray-800">{formatCurrency(expense.amount)}</span>
            {expanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
            {/* Split detail */}
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-50 rounded-lg p-2.5 text-center">
                <p className="text-xs text-gray-400 mb-0.5">{settings.person1Name}</p>
                <p className="font-semibold text-sm text-gray-800">{formatCurrency(p1Share)}</p>
                <p className="text-xs text-gray-400">{Math.round(expense.splitRatio * 100)}%</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-2.5 text-center">
                <p className="text-xs text-gray-400 mb-0.5">{settings.person2Name}</p>
                <p className="font-semibold text-sm text-gray-800">{formatCurrency(p2Share)}</p>
                <p className="text-xs text-gray-400">{Math.round((1 - expense.splitRatio) * 100)}%</p>
              </div>
            </div>

            {expense.notes && (
              <p className="text-sm text-gray-500 italic">„{expense.notes}"</p>
            )}

            <div className="flex items-center gap-4">
              {expense.receiptImage && (
                <button
                  type="button"
                  onClick={() => setShowReceipt(true)}
                  className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium"
                >
                  <ImageIcon size={15} />
                  Beleg anzeigen
                </button>
              )}
              <button
                type="button"
                onClick={() => { if (window.confirm('Ausgabe wirklich löschen?')) onDelete(expense.id); }}
                className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-sm font-medium ml-auto"
              >
                <Trash2 size={15} />
                Löschen
              </button>
            </div>
          </div>
        )}
      </div>

      {showReceipt && expense.receiptImage && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setShowReceipt(false)}
        >
          <img
            src={expense.receiptImage}
            alt="Beleg"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
