import React, { useState } from 'react';
import { LayoutDashboard, Plus, List, Settings as SettingsIcon } from 'lucide-react';
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
  const { expenses, settings, addExpense, deleteExpense, updateSettings } = useStore();

  const thisMonth = expensesThisMonth(expenses);
  const recent = expenses.filter(e => e.categoryId !== 'ausgleich').slice(0, 4);

  const handleSettle = () => {
    const bal = calculateBalance(expenses);
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

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-5">
            <BalanceCard expenses={expenses} settings={settings} onSettle={handleSettle} />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Dieser Monat</p>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(totalExpenses(thisMonth))}</p>
                <p className="text-xs text-gray-400 mt-1">{thisMonth.length} Ausgaben</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Gesamt</p>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(totalExpenses(expenses))}</p>
                <p className="text-xs text-gray-400 mt-1">{expenses.length} Ausgaben</p>
              </div>
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

            {expenses.length === 0 && (
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
          <ExpenseList
            expenses={expenses}
            settings={settings}
            onDelete={deleteExpense}
          />
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
