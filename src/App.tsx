import React, { useState } from 'react';
import { LayoutDashboard, Plus, List, Settings as SettingsIcon, Archive } from 'lucide-react';
import { useStore } from './storage';
import { BalanceCard } from './components/BalanceCard';
import { AddExpenseForm } from './components/AddExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { SettingsModal } from './components/SettingsModal';
import { calculateBalance, expensesThisMonth, totalExpenses, formatCurrency } from './calculations';
import { CATEGORIES } from './constants';
import { Expense, PersonId } from './types';

type Tab = 'overview' | 'add' | 'history';

export default function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [showSettings, setShowSettings] = useState(false);
  const [confirmingKassensturz, setConfirmingKassensturz] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const {
    activeExpenses,
    archivedExpenses,
    kassensturzList,
    settings,
    loading,
    error,
    opError,
    clearOpError,
    addExpense,
    deleteExpense,
    updateSettings,
    performKassensturz,
  } = useStore();

  const thisMonth = expensesThisMonth(activeExpenses);
  const recent = activeExpenses.filter(e => e.categoryId !== 'ausgleich').slice(0, 4);

  const handleSettle = () => {
    const bal = calculateBalance(activeExpenses);
    if (bal.amount < 0.005) return;
    const debtor: PersonId = bal.debtorIsP1 ? 'person1' : 'person2';
    addExpense({
      id: crypto.randomUUID(),
      description: 'Ausgleich',
      amount: Math.round(bal.amount * 100) / 100,
      categoryId: 'ausgleich',
      paidBy: debtor,
      splitRatio: bal.debtorIsP1 ? 0 : 1,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    });
  };

  const handleKassensturz = async () => {
    await performKassensturz();
    setConfirmingKassensturz(false);
    setShowArchive(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Wird geladen…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-6 shadow text-center max-w-sm">
          <p className="text-3xl mb-3">⚠️</p>
          <p className="font-semibold text-gray-800 mb-2">Verbindungsfehler</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h1 className="text-lg font-bold text-gray-800">💰 Kosten teilen</h1>
          <p className="text-xs text-gray-400">{settings.person1Name} &amp; {settings.person2Name}</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          aria-label="Einstellungen"
        >
          <SettingsIcon size={20} className="text-gray-500" />
        </button>
      </header>

      {/* ── Fehler-Banner (Speicherfehler) ── */}
      {opError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-start gap-3">
          <span className="text-red-500 text-lg leading-none flex-shrink-0">⚠️</span>
          <p className="flex-1 text-xs text-red-700 leading-snug">{opError}</p>
          <button
            onClick={clearOpError}
            className="text-red-400 hover:text-red-600 text-sm font-bold flex-shrink-0 leading-none"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-5">
            <BalanceCard expenses={activeExpenses} settings={settings} onSettle={handleSettle} />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Dieser Monat</p>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(totalExpenses(thisMonth))}</p>
                <p className="text-xs text-gray-400 mt-1">{thisMonth.length} Ausgaben</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">
                  {kassensturzList.length > 0 ? 'Seit Kassensturz' : 'Gesamt'}
                </p>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(totalExpenses(activeExpenses))}</p>
                <p className="text-xs text-gray-400 mt-1">{activeExpenses.length} Ausgaben</p>
              </div>
            </div>

            {/* Kassensturz */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Archive size={15} className="text-amber-500" />
                    Kassensturz
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {kassensturzList.length > 0
                      ? `Letzter: ${new Date(kassensturzList[0].createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : 'Noch kein Kassensturz'}
                  </p>
                </div>
                {!confirmingKassensturz ? (
                  <button
                    onClick={() => setConfirmingKassensturz(true)}
                    disabled={activeExpenses.length === 0}
                    className="flex-shrink-0 px-3 py-2 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Kassensturz machen
                  </button>
                ) : (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setConfirmingKassensturz(false)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Nein
                    </button>
                    <button
                      onClick={handleKassensturz}
                      className="px-3 py-2 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Ja, jetzt
                    </button>
                  </div>
                )}
              </div>
              {confirmingKassensturz && (
                <p className="text-xs text-gray-500 mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  {activeExpenses.length} {activeExpenses.length === 1 ? 'Eintrag wird' : 'Einträge werden'} archiviert und der Saldo auf 0 zurückgesetzt.
                </p>
              )}
            </div>

            {/* Category breakdown */}
            {thisMonth.filter(e => e.categoryId !== 'ausgleich').length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">Dieser Monat nach Kategorie</h3>
                <div className="space-y-2.5">
                  {CATEGORIES.filter(c => c.id !== 'ausgleich').map(cat => {
                    const catExpenses = thisMonth.filter(e => e.categoryId === cat.id);
                    if (!catExpenses.length) return null;
                    const total = totalExpenses(catExpenses);
                    const monthTotal = totalExpenses(thisMonth.filter(e => e.categoryId !== 'ausgleich'));
                    const pct = Math.round((total / monthTotal) * 100);
                    return (
                      <div key={cat.id} className="flex items-center gap-2">
                        <span className="text-base w-6 flex-shrink-0">{cat.icon}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-600">{cat.label}</span>
                            <span className="font-medium text-gray-800">{formatCurrency(total)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent */}
            {recent.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-gray-600">Letzte Ausgaben</h3>
                  <button onClick={() => setTab('history')} className="text-xs text-emerald-600 font-medium">
                    Alle anzeigen
                  </button>
                </div>
                <div className="space-y-2">
                  {recent.map(e => {
                    const cat = CATEGORIES.find(c => c.id === e.categoryId)!;
                    return (
                      <div key={e.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-100">
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.bgColor}`}>
                          {cat.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{e.description}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(e.date + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <span className="font-semibold text-gray-800 text-sm flex-shrink-0">{formatCurrency(e.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeExpenses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <span className="text-5xl mb-3">🛒</span>
                <p className="font-medium text-gray-500">Noch keine Ausgaben</p>
                <p className="text-sm mt-1">Tippe auf <strong>+</strong> um zu starten</p>
              </div>
            )}
          </div>
        )}

        {/* ── Add ── */}
        {tab === 'add' && (
          <AddExpenseForm
            settings={settings}
            onAdd={addExpense}
            onDone={() => setTab('overview')}
          />
        )}

        {/* ── History ── */}
        {tab === 'history' && (
          <div className="space-y-4">
            {/* Archiv-Toggle */}
            {archivedExpenses.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowArchive(false)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    !showArchive ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Aktuell ({activeExpenses.length})
                </button>
                <button
                  onClick={() => setShowArchive(true)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    showArchive ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Archive size={14} />
                  Archiv ({archivedExpenses.length})
                </button>
              </div>
            )}

            {showArchive ? (
              <>
                {kassensturzList.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <Archive size={14} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Kassensturz vom{' '}
                      <strong>
                        {new Date(kassensturzList[0].createdAt).toLocaleDateString('de-DE', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </strong>
                    </p>
                  </div>
                )}
                <ExpenseList
                  expenses={archivedExpenses}
                  settings={settings}
                  onDelete={deleteExpense}
                />
              </>
            ) : (
              <ExpenseList
                expenses={activeExpenses}
                settings={settings}
                onDelete={deleteExpense}
              />
            )}
          </div>
        )}
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex items-stretch z-40">
        <button
          onClick={() => setTab('overview')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
            tab === 'overview' ? 'text-emerald-600' : 'text-gray-400'
          }`}
        >
          <LayoutDashboard size={22} />
          <span className="text-xs">Übersicht</span>
        </button>

        <div className="flex-none flex items-center justify-center px-8">
          <button
            onClick={() => setTab('add')}
            className={`w-14 h-14 -mt-5 rounded-full flex items-center justify-center shadow-lg transition-all ${
              tab === 'add' ? 'bg-emerald-600 scale-105' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            <Plus size={28} className="text-white" />
          </button>
        </div>

        <button
          onClick={() => setTab('history')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
            tab === 'history' ? 'text-emerald-600' : 'text-gray-400'
          }`}
        >
          <List size={22} />
          <span className="text-xs">Verlauf</span>
        </button>
      </nav>

      {/* ── Settings Modal ── */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
