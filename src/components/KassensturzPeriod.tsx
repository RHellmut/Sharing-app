import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import { Expense, Settings, Kassensturz } from '../types';
import { ExpenseList } from './ExpenseList';
import { calculateBalance, totalExpenses, formatCurrency } from '../calculations';
import { generateKassensturzPDF } from '../utils/generatePDF';

interface Props {
  kassensturz: Kassensturz;
  prevCreatedAt: string | null;
  expenses: Expense[];
  settings: Settings;
  onDelete: (id: string) => void;
}

export function KassensturzPeriod({ kassensturz, prevCreatedAt, expenses, settings, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);

  const handlePDF = () => {
    generateKassensturzPDF(kassensturz, expenses, settings, prevCreatedAt);
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });

  const real    = expenses.filter(e => e.categoryId !== 'ausgleich');
  const total   = totalExpenses(real);
  const balance = calculateBalance(real);

  const startLabel = prevCreatedAt ? fmtDate(prevCreatedAt) : 'Beginn';
  const endLabel   = fmtDate(kassensturz.createdAt);

  const balanceLabel = balance.amount >= 0.01
    ? `${balance.debtorIsP1 ? settings.person1Name : settings.person2Name} schuldete ${formatCurrency(balance.amount)}`
    : 'Ausgeglichen';

  return (
    <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800 truncate">
              Kassensturz vom {endLabel}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {startLabel} – {endLabel}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-500">{real.length} Einträge</span>
              <span className="text-xs font-medium text-gray-700">{formatCurrency(total)}</span>
              <span className={`text-xs ${balance.amount >= 0.01 ? 'text-amber-700' : 'text-emerald-600'}`}>
                {balanceLabel}
              </span>
            </div>
          </div>
          <button
            onClick={handlePDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
          >
            <FileDown size={13} />
            PDF
          </button>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2.5 flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 transition-colors"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Einträge ausblenden' : 'Einträge anzeigen'}
        </button>
      </div>

      {/* Expandable expense list */}
      {expanded && (
        <div className="px-4 pt-3 pb-4">
          <ExpenseList expenses={expenses} settings={settings} onDelete={onDelete} />
        </div>
      )}
    </div>
  );
}
