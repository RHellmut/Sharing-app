import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, HandCoins, X, Palmtree } from 'lucide-react';
import { Expense, Settings } from '../types';
import { calculateBalance, formatCurrency } from '../calculations';

interface Props {
  expenses: Expense[];
  settings: Settings;
  onSettle: () => void;
}

export function BalanceCard({ expenses, settings, onSettle }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [vacationOpen, setVacationOpen] = useState(false);
  const balance = calculateBalance(expenses);

  const vacationButton = (
    <button
      onClick={() => setVacationOpen(true)}
      className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/35 text-white text-[11px] font-medium transition-colors backdrop-blur-sm border border-white/20"
    >
      <Palmtree size={11} />
      Vacation Mode
    </button>
  );

  const overlay = vacationOpen && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={() => setVacationOpen(false)}
    >
      <button
        onClick={() => setVacationOpen(false)}
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors"
        aria-label="Schließen"
      >
        <X size={20} />
      </button>
      <img
        src="/vacation.jpg"
        alt="Vacation"
        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
        style={{ maxWidth: '92vw', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      />
    </div>
  );

  if (balance.amount < 0.005) {
    return (
      <>
        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
          {vacationButton}
          <div className="flex flex-col items-center gap-2 py-2">
            <CheckCircle2 size={48} className="opacity-90" />
            <p className="text-xl font-semibold">Alles ausgeglichen!</p>
            <p className="text-emerald-100 text-sm">Keine offenen Schulden</p>
          </div>
        </div>
        {overlay}
      </>
    );
  }

  const debtorName   = balance.debtorIsP1 ? settings.person1Name : settings.person2Name;
  const creditorName = balance.debtorIsP1 ? settings.person2Name : settings.person1Name;

  return (
    <>
      <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        {vacationButton}
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
      {overlay}
    </>
  );
}
