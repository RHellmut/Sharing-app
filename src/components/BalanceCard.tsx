import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, Archive, X, Palmtree } from 'lucide-react';
import { Expense, Settings } from '../types';
import { calculateBalance, formatCurrency } from '../calculations';

interface Props {
  expenses: Expense[];
  settings: Settings;
  onKassensturz: () => Promise<void>;
}

export function BalanceCard({ expenses, settings, onKassensturz }: Props) {
  const [confirmingKassensturz, setConfirmingKassensturz] = useState(false);
  const [vacationOpen, setVacationOpen]                   = useState(false);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
      onClick={() => setVacationOpen(false)}
    >
      <button
        onClick={() => setVacationOpen(false)}
        className="absolute right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors z-10"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
        aria-label="Schließen"
      >
        <X size={22} />
      </button>
      <img
        src="/vacation.jpg"
        alt="Vacation"
        className="rounded-2xl shadow-2xl object-contain"
        style={{ maxWidth: '92vw', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      />
    </div>
  );

  if (balance.amount < 0.005) {
    return (
      <>
        <div className="relative bg-gradient-to-br from-green-800 to-green-950 rounded-2xl p-6 text-white shadow-lg">
          {vacationButton}
          <div className="flex flex-col items-center gap-2 py-2 mb-4">
            <CheckCircle2 size={48} className="opacity-90" />
            <p className="text-xl font-semibold">Alles ausgeglichen!</p>
            <p className="text-slate-300 text-sm">Keine offenen Schulden</p>
          </div>
          <KassensturzButton
            count={expenses.length}
            confirming={confirmingKassensturz}
            onConfirm={() => setConfirmingKassensturz(true)}
            onCancel={() => setConfirmingKassensturz(false)}
            onExecute={async () => { await onKassensturz(); setConfirmingKassensturz(false); }}
          />
        </div>
        {overlay}
      </>
    );
  }

  const debtorName   = balance.debtorIsP1 ? settings.person1Name : settings.person2Name;
  const creditorName = balance.debtorIsP1 ? settings.person2Name : settings.person1Name;

  return (
    <>
      <div className="relative bg-gradient-to-br from-green-800 to-green-950 rounded-2xl p-6 text-white shadow-lg">
        {vacationButton}
        <p className="text-slate-300 text-sm font-medium mb-1">Offener Saldo</p>
        <div className="text-4xl font-bold mb-4">{formatCurrency(balance.amount)}</div>

        <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2.5 mb-4">
          <span className="font-semibold">{debtorName}</span>
          <ArrowRight size={16} className="opacity-80 flex-shrink-0" />
          <span className="font-semibold">{creditorName}</span>
        </div>

        <KassensturzButton
          count={expenses.length}
          confirming={confirmingKassensturz}
          onConfirm={() => setConfirmingKassensturz(true)}
          onCancel={() => setConfirmingKassensturz(false)}
          onExecute={async () => { await onKassensturz(); setConfirmingKassensturz(false); }}
        />
      </div>
      {overlay}
    </>
  );
}

function KassensturzButton({ count, confirming, onConfirm, onCancel, onExecute }: {
  count: number;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onExecute: () => Promise<void>;
}) {
  if (!confirming) {
    return (
      <button
        onClick={onConfirm}
        disabled={count === 0}
        className="w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-2.5 font-medium transition-colors text-sm"
      >
        <Archive size={16} />
        Kassensturz
      </button>
    );
  }
  return (
    <div className="bg-white/20 rounded-xl p-3 space-y-2">
      <p className="text-sm text-center">
        {count} {count === 1 ? 'Eintrag wird' : 'Einträge werden'} archiviert und der Saldo zurückgesetzt.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={onExecute}
          className="flex-1 py-2 rounded-lg bg-white font-semibold text-slate-700 hover:bg-slate-50 text-sm transition-colors"
        >
          Kassensturz machen
        </button>
      </div>
    </div>
  );
}
