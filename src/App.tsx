import React, { useState, lazy, Suspense } from 'react';
import { LayoutDashboard, Plus, List, Settings as SettingsIcon, Archive, ShoppingCart, Landmark, Globe, CalendarDays, Pencil, FolderOpen } from 'lucide-react';
import { useStore } from './storage';
import { BalanceCard } from './components/BalanceCard';
import { AddExpenseForm } from './components/AddExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { KassensturzPeriod } from './components/KassensturzPeriod';
import { ShoppingList } from './components/ShoppingList';
import { FixkostenTab } from './components/FixkostenTab';
import { CalendarTab } from './components/CalendarTab';
import { DocumentsTab } from './components/DocumentsTab';
import { SettingsModal } from './components/SettingsModal';
import { NotificationBell } from './components/NotificationBell';

const WorldTravel = lazy(() =>
  import('./components/WorldTravel').then(m => ({ default: m.WorldTravel }))
);
import { expensesThisMonth, totalExpenses, formatCurrency } from './calculations';
import { CATEGORIES } from './constants';
import { CategoryIcon } from './components/CategoryIcon';

type Tab = 'overview' | 'add' | 'history' | 'shopping' | 'fixkosten' | 'calendar' | 'dokumente';

export default function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [showSettings, setShowSettings] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showWorldTravel, setShowWorldTravel] = useState(false);
  const [editingExpense, setEditingExpense] = useState<import('./types').Expense | null>(null);

  const {
    expenses,
    activeExpenses,
    archivedExpenses,
    kassensturzList,
    kassensturzPeriods,
    settings,
    loading,
    error,
    opError,
    clearOpError,
    addExpense,
    updateExpense,
    deleteExpense,
    updateSettings,
    performKassensturz,
    deleteKassensturz,
    shoppingItems,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    resetShoppingList,
    fixkosten,
    updateFixkosten,
    vertraege,
    updateVertrag,
    visitedCountries,
    toggleVisitedCountry,
    calendarEvents,
    addCalendarEvent,
    deleteCalendarEvent,
    updateCalendarEvent,
    documents,
    addDocument,
    deleteDocument,
    getDocumentUrl,
  } = useStore();

  const thisMonth = expensesThisMonth(activeExpenses);
  const recent = activeExpenses.filter(e => e.categoryId !== 'ausgleich').slice(0, 4);

  const handleKassensturz = async () => {
    await performKassensturz();
    setShowArchive(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-transparent rounded-full animate-spin" />
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

  if (showWorldTravel) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <WorldTravel
          visited={visitedCountries}
          onToggle={toggleVisitedCountry}
          onBack={() => setShowWorldTravel(false)}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-4 pb-4 flex items-center gap-2 sticky top-0 z-40"
              style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <div className="flex-shrink-0">
          <h1 className="text-lg font-bold text-gray-800">Catriver Cost</h1>
          <p className="text-xs text-gray-400">{settings.person1Name} &amp; {settings.person2Name}</p>
        </div>
        <button
          onClick={() => setShowWorldTravel(true)}
          className="flex-1 min-w-0 flex items-center justify-center gap-1.5 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-full py-2 px-3 shadow-sm hover:from-sky-600 hover:to-cyan-600 transition-colors"
        >
          <Globe size={15} className="flex-shrink-0" />
          <span className="text-xs font-semibold truncate">Lisl&apos;s World Travel</span>
        </button>
        <NotificationBell />
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
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
            <BalanceCard expenses={activeExpenses} settings={settings} onKassensturz={handleKassensturz} />

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

            {/* Category breakdown */}
            {activeExpenses.filter(e => e.categoryId !== 'ausgleich').length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">Aufschlüsselung nach Kategorie</h3>
                <div className="space-y-2.5">
                  {CATEGORIES.filter(c => c.id !== 'ausgleich').map(cat => {
                    const catExpenses = activeExpenses.filter(e => e.categoryId === cat.id);
                    if (!catExpenses.length) return null;
                    const total = totalExpenses(catExpenses);
                    const periodTotal = totalExpenses(activeExpenses.filter(e => e.categoryId !== 'ausgleich'));
                    const pct = Math.round((total / periodTotal) * 100);
                    return (
                      <div key={cat.id} className="flex items-center gap-2">
                        <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                          <CategoryIcon cat={cat} imgClassName="w-5 h-5" />
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-600">{cat.label}</span>
                            <span className="font-medium text-gray-800">{formatCurrency(total)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Person spending comparison */}
            {activeExpenses.filter(e => e.categoryId !== 'ausgleich').length > 0 && (() => {
              const relevant = activeExpenses.filter(e => e.categoryId !== 'ausgleich');
              const p1Total  = totalExpenses(relevant.filter(e => e.paidBy === 'person1'));
              const p2Total  = totalExpenses(relevant.filter(e => e.paidBy === 'person2'));
              const grand    = p1Total + p2Total;
              if (grand === 0) return null;
              const p1Pct = Math.round((p1Total / grand) * 100);
              const p2Pct = 100 - p1Pct;
              const p1More = p1Total >= p2Total;
              return (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-600 mb-3">Ausgaben nach Person</h3>
                  <div className="space-y-2.5">
                    {[
                      { name: settings.person1Name, total: p1Total, pct: p1Pct, bar: 'bg-green-500'  },
                      { name: settings.person2Name, total: p2Total, pct: p2Pct, bar: 'bg-violet-500' },
                    ].map(p => (
                      <div key={p.name} className="flex items-center gap-2">
                        <div className="w-16 text-xs text-gray-600 truncate flex-shrink-0">{p.name}</div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="font-semibold text-gray-800">{formatCurrency(p.total)}</span>
                            <span className="text-gray-400">{p.pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${p.bar}`} style={{ width: `${p.pct}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Recent */}
            {recent.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-gray-600">Letzte Ausgaben</h3>
                  <button onClick={() => setTab('history')} className="text-xs text-slate-700 font-medium">
                    Alle anzeigen
                  </button>
                </div>
                <div className="space-y-2">
                  {recent.map(e => {
                    const cat    = CATEGORIES.find(c => c.id === e.categoryId)!;
                    const isP1   = e.paidBy === 'person1';
                    const pName  = isP1 ? settings.person1Name : settings.person2Name;
                    return (
                      <div key={e.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-100">
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.bgColor}`}>
                          <CategoryIcon cat={cat} imgClassName="w-6 h-6" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{e.description}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-gray-400">
                              {new Date(e.date + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                            </p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isP1 ? 'bg-green-100 text-green-700' : 'bg-violet-100 text-violet-700'}`}>
                              {pName}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="font-semibold text-gray-800 text-sm">{formatCurrency(e.amount)}</span>
                          <button onClick={() => setEditingExpense(e)}
                            className="p-1.5 text-gray-300 hover:text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                            <Pencil size={14} />
                          </button>
                        </div>
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
                    !showArchive ? 'bg-slate-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
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
              <div className="space-y-3">
                {kassensturzPeriods.map(period => (
                  <KassensturzPeriod
                    key={period.kassensturz.id}
                    onEdit={setEditingExpense}
                    kassensturz={period.kassensturz}
                    prevCreatedAt={period.prevCreatedAt}
                    expenses={period.expenses}
                    settings={settings}
                    onDelete={deleteExpense}
                    onDeletePeriod={deleteKassensturz}
                  />
                ))}
              </div>
            ) : (
              <ExpenseList
                expenses={activeExpenses}
                settings={settings}
                onDelete={deleteExpense}
                onEdit={setEditingExpense}
              />
            )}
          </div>
        )}

        {/* ── Shopping List ── */}
        {tab === 'shopping' && (
          <div className="h-full flex flex-col">
            <ShoppingList
              items={shoppingItems}
              onAdd={addShoppingItem}
              onToggle={toggleShoppingItem}
              onDelete={deleteShoppingItem}
              onReset={resetShoppingList}
            />
          </div>
        )}

        {/* ── Fixkosten ── */}
        {tab === 'fixkosten' && (
          <FixkostenTab
            fixkosten={fixkosten}
            vertraege={vertraege}
            settings={settings}
            onUpdate={updateFixkosten}
            onUpdateVertrag={updateVertrag}
          />
        )}

        {/* ── Kalender ── */}
        {tab === 'calendar' && (
          <CalendarTab
            events={calendarEvents}
            settings={settings}
            onAdd={addCalendarEvent}
            onDelete={deleteCalendarEvent}
            onUpdate={updateCalendarEvent}
          />
        )}

        {/* ── Dokumente ── */}
        {tab === 'dokumente' && (
          <DocumentsTab
            documents={documents}
            onAdd={addDocument}
            onDelete={deleteDocument}
            onGetUrl={getDocumentUrl}
          />
        )}
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="safe-pb fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex items-stretch z-40 px-4 gap-2">
        <button
          onClick={() => setTab('overview')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors relative ${
            tab === 'overview' ? 'text-slate-700' : 'text-gray-400'
          }`}
        >
          {tab === 'overview' && <span className="absolute top-0 left-2 right-2 h-0.5 bg-slate-700 rounded-b-full" />}
          <LayoutDashboard size={20} />
          <span className={`text-[10px] ${tab === 'overview' ? 'font-semibold' : ''}`}>Übersicht</span>
        </button>

        <button
          onClick={() => setTab('history')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors relative ${
            tab === 'history' ? 'text-slate-700' : 'text-gray-400'
          }`}
        >
          {tab === 'history' && <span className="absolute top-0 left-2 right-2 h-0.5 bg-slate-700 rounded-b-full" />}
          <List size={20} />
          <span className={`text-[10px] ${tab === 'history' ? 'font-semibold' : ''}`}>Verlauf</span>
        </button>

        <button
          onClick={() => setTab('dokumente')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors relative ${
            tab === 'dokumente' ? 'text-slate-700' : 'text-gray-400'
          }`}
        >
          {tab === 'dokumente' && <span className="absolute top-0 left-2 right-2 h-0.5 bg-slate-700 rounded-b-full" />}
          <FolderOpen size={20} />
          <span className={`text-[10px] ${tab === 'dokumente' ? 'font-semibold' : ''}`}>Dokumente</span>
        </button>

        <div className="flex-none flex items-center justify-center px-5">
          <button
            onClick={() => setTab('add')}
            className={`w-14 h-14 -mt-5 rounded-full flex items-center justify-center shadow-lg transition-all ${
              tab === 'add' ? 'bg-slate-800 scale-105' : 'bg-slate-700 hover:bg-slate-800'
            }`}
          >
            <Plus size={28} className="text-white" />
          </button>
        </div>

        <button
          onClick={() => setTab('shopping')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors relative ${
            tab === 'shopping' ? 'text-slate-700' : 'text-gray-400'
          }`}
        >
          {tab === 'shopping' && <span className="absolute top-0 left-2 right-2 h-0.5 bg-slate-700 rounded-b-full" />}
          <ShoppingCart size={20} />
          {shoppingItems.filter(i => !i.checked).length > 0 && (
            <span className="absolute top-2 right-3 w-4 h-4 bg-slate-700 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {shoppingItems.filter(i => !i.checked).length}
            </span>
          )}
          <span className={`text-[10px] ${tab === 'shopping' ? 'font-semibold' : ''}`}>Liste</span>
        </button>

        <button
          onClick={() => setTab('fixkosten')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors relative ${
            tab === 'fixkosten' ? 'text-slate-700' : 'text-gray-400'
          }`}
        >
          {tab === 'fixkosten' && <span className="absolute top-0 left-2 right-2 h-0.5 bg-slate-700 rounded-b-full" />}
          <Landmark size={20} />
          <span className={`text-[10px] ${tab === 'fixkosten' ? 'font-semibold' : ''}`}>Fixkosten</span>
        </button>

        <button
          onClick={() => setTab('calendar')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors relative ${
            tab === 'calendar' ? 'text-slate-700' : 'text-gray-400'
          }`}
        >
          {tab === 'calendar' && <span className="absolute top-0 left-2 right-2 h-0.5 bg-slate-700 rounded-b-full" />}
          <CalendarDays size={20} />
          <span className={`text-[10px] ${tab === 'calendar' ? 'font-semibold' : ''}`}>Kalender</span>
        </button>
      </nav>

      {/* ── Edit Expense Modal ── */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <h2 className="font-semibold text-gray-800">Ausgabe bearbeiten</h2>
            <button onClick={() => setEditingExpense(null)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <Plus size={20} className="rotate-45" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pt-4">
            <AddExpenseForm
              settings={settings}
              onAdd={addExpense}
              onDone={() => setEditingExpense(null)}
              initialExpense={editingExpense}
              onUpdate={expense => { updateExpense(expense); setEditingExpense(null); }}
            />
          </div>
        </div>
      )}

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
