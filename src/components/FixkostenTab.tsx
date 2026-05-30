import React, { useState, useEffect } from 'react';
import { Home, Tv, Zap, Wifi } from 'lucide-react';
import { FixkostenAmounts, VertragsEntry, Settings } from '../types';
import { formatCurrency } from '../calculations';

/* ── shared constants ─────────────────────────────────── */

const COST_ITEMS = [
  { key: 'miete',    label: 'Miete',    Icon: Home },
  { key: 'gez',      label: 'GEZ',      Icon: Tv   },
  { key: 'strom',    label: 'Strom',    Icon: Zap  },
  { key: 'internet', label: 'Internet', Icon: Wifi },
] as const;

const CONTRACT_ITEMS = [
  { key: 'strom',    label: 'Strom',    Icon: Zap  },
  { key: 'internet', label: 'Internet', Icon: Wifi },
] as const;

type CostKey     = (typeof COST_ITEMS)[number]['key'];
type ContractKey = (typeof CONTRACT_ITEMS)[number]['key'];

/* ── props ────────────────────────────────────────────── */

interface Props {
  fixkosten:       Record<string, FixkostenAmounts>;
  vertraege:       Record<string, VertragsEntry>;
  settings:        Settings;
  onUpdate:        (key: string, person: 'person1' | 'person2', amount: number) => void;
  onUpdateVertrag: (key: string, field: 'anbieter' | 'vertragsbeginn' | 'vertragsende', value: string) => void;
}

/* ── helpers ──────────────────────────────────────────── */

type CostDraft = Record<CostKey, { p1: string; p2: string }>;

function toCostDraft(fixkosten: Record<string, FixkostenAmounts>): CostDraft {
  return Object.fromEntries(
    COST_ITEMS.map(({ key }) => {
      const e = fixkosten[key] ?? { person1Amount: 0, person2Amount: 0 };
      return [key, {
        p1: e.person1Amount > 0 ? String(e.person1Amount) : '',
        p2: e.person2Amount > 0 ? String(e.person2Amount) : '',
      }];
    })
  ) as CostDraft;
}

const numFmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatAmount(raw: string): string {
  const n = parseFloat(raw.replace(',', '.'));
  if (!raw || isNaN(n)) return '';
  return numFmt.format(n) + ' €';
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function parseAmount(raw: string): number {
  return Math.round((parseFloat(raw.replace(',', '.')) || 0) * 100) / 100;
}

/* ── component ────────────────────────────────────────── */

export function FixkostenTab({ fixkosten, vertraege, settings, onUpdate, onUpdateVertrag }: Props) {
  const [subTab, setSubTab] = useState<'kosten' | 'vertraege'>('kosten');

  /* ── Kostenverteilung state ── */
  const [draft,   setDraft]   = useState<CostDraft>(() => toCostDraft(fixkosten));
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => { setDraft(toCostDraft(fixkosten)); }, [fixkosten]);

  const handleAmountBlur = (key: CostKey, p: 'p1' | 'p2') => {
    setFocused(null);
    onUpdate(key, p === 'p1' ? 'person1' : 'person2', parseAmount(draft[key][p]));
  };

  const rows = COST_ITEMS.map(({ key }) => {
    const p1 = parseAmount(draft[key].p1);
    const p2 = parseAmount(draft[key].p2);
    return { key, p1, p2, total: p1 + p2 };
  });
  const totalP1 = rows.reduce((s, r) => s + r.p1, 0);
  const totalP2 = rows.reduce((s, r) => s + r.p2, 0);
  const grand   = totalP1 + totalP2;
  const fair    = grand / 2;
  const balance = Math.round((totalP1 - fair) * 100) / 100;

  /* ── Verträge state ── */
  function toAnbieterDraft(v: Record<string, VertragsEntry>): Record<ContractKey, string> {
    return Object.fromEntries(CONTRACT_ITEMS.map(({ key }) => [key, v[key]?.anbieter ?? ''])) as Record<ContractKey, string>;
  }

  const [anbieterDraft, setAnbieterDraft] = useState<Record<ContractKey, string>>(() => toAnbieterDraft(vertraege));

  useEffect(() => { setAnbieterDraft(toAnbieterDraft(vertraege)); }, [vertraege]);

  /* ── render ── */
  return (
    <div className="space-y-4 pb-6">

      {/* Sub-tab navigation */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setSubTab('kosten')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            subTab === 'kosten' ? 'bg-slate-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Kostenverteilung
        </button>
        <button
          onClick={() => setSubTab('vertraege')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            subTab === 'vertraege' ? 'bg-slate-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Verträge
        </button>
      </div>

      {/* ── Kostenverteilung ── */}
      {subTab === 'kosten' && (
        <>
          <p className="text-xs text-gray-400">Monatliche Fixkosten — immer 50 / 50 aufgeteilt</p>

          {COST_ITEMS.map(({ key, label, Icon }) => {
            const row = rows.find(r => r.key === key)!;
            return (
              <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                  <Icon size={15} className="text-slate-500 flex-shrink-0" />
                  <span className="font-medium text-gray-700 text-sm">{label}</span>
                  {row.total > 0 && (
                    <span className="ml-auto text-xs text-gray-400">
                      Gesamt {formatCurrency(row.total)} · je {formatCurrency(row.total / 2)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  {(['p1', 'p2'] as const).map((p, idx) => {
                    const fieldId = `${key}-${p}`;
                    const isFocused = focused === fieldId;
                    return (
                      <div key={p} className="px-3 py-3">
                        <p className="text-xs text-gray-400 mb-1.5">
                          {idx === 0 ? settings.person1Name : settings.person2Name}
                        </p>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={isFocused ? draft[key][p] : formatAmount(draft[key][p])}
                          placeholder="0,00 €"
                          onChange={e => setDraft(prev => ({ ...prev, [key]: { ...prev[key], [p]: e.target.value } }))}
                          onFocus={e => {
                            setFocused(fieldId);
                            e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(() => e.currentTarget.select(), 0);
                          }}
                          onBlur={() => handleAmountBlur(key, p)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {grand > 0 && (
            <div className="bg-slate-700 text-white rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-3">Monatliche Abrechnung</h3>
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Gesamt</span>
                  <span className="font-medium">{formatCurrency(grand)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">{settings.person1Name} zahlt</span>
                  <span className={totalP1 > fair + 0.005 ? 'text-amber-300 font-medium' : ''}>{formatCurrency(totalP1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">{settings.person2Name} zahlt</span>
                  <span className={totalP2 > fair + 0.005 ? 'text-amber-300 font-medium' : ''}>{formatCurrency(totalP2)}</span>
                </div>
              </div>
              {Math.abs(balance) >= 0.01 ? (
                <div className="bg-slate-600 rounded-lg px-3 py-2.5 text-center text-sm">
                  <span className="font-semibold">{balance > 0 ? settings.person2Name : settings.person1Name}</span>
                  {' soll '}
                  <span className="font-semibold">{balance > 0 ? settings.person1Name : settings.person2Name}</span>
                  {' monatlich überweisen: '}
                  <span className="font-semibold text-amber-300">{formatCurrency(Math.abs(balance))}</span>
                </div>
              ) : (
                <div className="bg-green-600 rounded-lg px-3 py-2.5 text-center text-sm font-medium">
                  Perfekt ausgeglichen ✓
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Verträge ── */}
      {subTab === 'vertraege' && (
        <>
          <p className="text-xs text-gray-400">Vertragsdaten für Strom und Internet</p>

          {CONTRACT_ITEMS.map(({ key, label, Icon }) => {
            const entry = vertraege[key];
            return (
              <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                  <Icon size={15} className="text-slate-500 flex-shrink-0" />
                  <span className="font-medium text-gray-700 text-sm">{label}</span>
                </div>
                <div className="px-4 py-4 space-y-4">

                  {/* Anbieter */}
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Anbieter</label>
                    <input
                      type="text"
                      value={anbieterDraft[key]}
                      onChange={e => setAnbieterDraft(prev => ({ ...prev, [key]: e.target.value }))}
                      onBlur={() => onUpdateVertrag(key, 'anbieter', anbieterDraft[key])}
                      placeholder="z.B. Vattenfall"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    {(['vertragsbeginn', 'vertragsende'] as const).map(field => (
                      <div key={field}>
                        <label className="text-xs text-gray-400 block mb-1.5">
                          {field === 'vertragsbeginn' ? 'Vertragsbeginn' : 'Vertragsende'}
                        </label>
                        <div className="relative">
                          <div className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-white text-gray-800 text-sm pointer-events-none select-none min-h-[46px]">
                            {entry?.[field]
                              ? formatDate(entry[field])
                              : <span className="text-gray-400 text-xs">Datum wählen</span>
                            }
                          </div>
                          <input
                            type="date"
                            value={entry?.[field] ?? ''}
                            onChange={e => onUpdateVertrag(key, field, e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
