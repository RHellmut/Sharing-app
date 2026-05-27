import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, HandCoins } from 'lucide-react';
import { Expense, Settings } from '../types';
import { calculateBalance, formatCurrency } from '../calculations';

interface Props {
  expenses: Expense[];
  settings: Settings;
  onSettle: () => void;
}

export function BalanceCard({ expenses, settings, onSettle }: Props) {
  const [confirming, setConfirming] = useState(false);
  const balance = calculateBalance(expenses);

  if (balance.amount < 0.005) {
    return (
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col items-center gap-2 py-2">
          <CheckCircle2 size={48} className="opacity-90" />
          <p className="text-xl font-semibold">Alles ausgeglichen!</p>
          <p className="text-emerald-100 text-sm">Keine offenen Schulden</p>
        </div>
      </div>
    );
  }

  const debtorName  = balance.debtorIsP1 ? settings.person1Name : settings.person2Name;
  const creditorName = balance.debtorIsP1 ? settings.person2Name : settings.person1Name;

  return (
    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
      <p className="text-emerald-100 text-sm font-medium mb-1">Offener Saldo</p>
      <div className="text-4xl font-bold mb-4">{formatCurrency(balance.amount)}</div>

      <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2.5 mb-4">
        <span className="font-semibold">{debtorName}</span>
        <ArrowRight size={16} className="opacity-80 flex-shrink-0" />
        <span className="font-semibold">{creditorName}</span>
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl py-2.5 font-medium transition-colors text-sm"
        >
          <HandCoins size={16} />
          Ausgleich erstellen
        </button>
      ) : (
        <div className="bg-white/20 rounded-xl p-3 space-y-2">
          <p className="text-sm text-center">
            {debtorName} bezahlte {creditorName} <strong>{formatCurrency(balance.amount)}</strong>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors"
            >
              Nein
            </button>
            <button
              onClick={() => { onSettle(); setConfirming(false); }}
              className="flex-1 py-2 rounded-lg bg-white font-semibold text-emerald-700 hover:bg-emerald-50 text-sm transition-colors"
            >
              Ja, bestätigen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
