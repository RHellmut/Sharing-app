import React, { useState, useEffect } from 'react';
import { Home, Tv, Zap, Wifi } from 'lucide-react';
import { FixkostenAmounts, Settings } from '../types';
import { formatCurrency } from '../calculations';

const ITEMS = [
  { key: 'miete',    label: 'Miete',    Icon: Home },
  { key: 'gez',      label: 'GEZ',      Icon: Tv   },
  { key: 'strom',    label: 'Strom',    Icon: Zap  },
  { key: 'internet', label: 'Internet', Icon: Wifi },
] as const;

interface Props {
  fixkosten: Record<string, FixkostenAmounts>;
  settings: Settings;
  onUpdate: (key: string, person: 'person1' | 'person2', amount: number) => void;
}

type DraftKey = (typeof ITEMS)[number]['key'];
type Draft = Record<DraftKey, { p1: string; p2: string }>;

function toDraft(fixkosten: Record<string, FixkostenAmounts>): Draft {
  return Object.fromEntries(
    ITEMS.map(({ key }) => {
      const e = fixkosten[key] ?? { person1Amount: 0, person2Amount: 0 };
      return [key, {
        p1: e.person1Amount > 0 ? String(e.person1Amount) : '',
        p2: e.person2Amount > 0 ? String(e.person2Amount) : '',
      }];
    })
  ) as Draft;
}

export function FixkostenTab({ fixkosten, settings, onUpdate }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(fixkosten));

  // Sync when remote data arrives (e.g. other person saves)
  useEffect(() => {
    setDraft(toDraft(fixkosten));
  }, [fixkosten]);

  const parseAmount = (raw: string) =>
    Math.round((parseFloat(raw.replace(',', '.')) || 0) * 100) / 100;

  const handleBlur = (key: DraftKey, p: 'p1' | 'p2') => {
    const amount = parseAmount(draft[key][p]);
    onUpdate(key, p === 'p1' ? 'person1' : 'person2', amount);
  };

  // Computed totals from draft (live while typing)
  const rows = ITEMS.map(({ key }) => {
    const p1 = parseAmount(draft[key].p1);
    const p2 = parseAmount(draft[key].p2);
    return { key, p1, p2, total: p1 + p2 };
  });

  const totalP1 = rows.reduce((s, r) => s + r.p1, 0);
  const totalP2 = rows.reduce((s, r) => s + r.p2, 0);
  const grand   = totalP1 + totalP2;
  const fair    = grand / 2;
  // positive → person1 overpays → person2 owes person1
  const balance = Math.round((totalP1 - fair) * 100) / 100;

  return (
    <div className="space-y-4 pb-6">
      <p className="text-xs text-gray-400 pt-1">
        Monatliche Fixkosten — immer 50 / 50 aufgeteilt
      </p>

      {ITEMS.map(({ key, label, Icon }) => {
        const row = rows.find(r => r.key === key)!;
        return (
          <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
              <Icon size={15} className="text-slate-500 flex-shrink-0" />
              <span className="font-medium text-gray-700 text-sm">{label}</span>
              {row.total > 0 && (
                <span className="ml-auto text-xs text-gray-400">
                  Gesamt {formatCurrency(row.total)} · je {formatCurrency(row.total / 2)}
                </span>
              )}
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              {(['p1', 'p2'] as const).map((p, idx) => (
                <div key={p} className="px-3 py-3">
                  <p className="text-xs text-gray-400 mb-1.5">
                    {idx === 0 ? settings.person1Name : settings.person2Name}
                  </p>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                      €
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={draft[key][p]}
                      onChange={e =>
                        setDraft(prev => ({
                          ...prev,
                          [key]: { ...prev[key], [p]: e.target.value },
                        }))
                      }
                      onFocus={e => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      onBlur={() => handleBlur(key, p)}
                      placeholder="0,00"
                      className="w-full border border-gray-200 rounded-lg pl-7 pr-2 py-2 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Balance summary */}
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
              <span className={totalP1 > fair + 0.005 ? 'text-amber-300 font-medium' : ''}>
                {formatCurrency(totalP1)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">{settings.person2Name} zahlt</span>
              <span className={totalP2 > fair + 0.005 ? 'text-amber-300 font-medium' : ''}>
                {formatCurrency(totalP2)}
              </span>
            </div>
          </div>

          {Math.abs(balance) >= 0.01 ? (
            <div className="bg-slate-600 rounded-lg px-3 py-2.5 text-center text-sm">
              <span className="font-semibold">
                {balance > 0 ? settings.person2Name : settings.person1Name}
              </span>
              {' soll '}
              <span className="font-semibold">
                {balance > 0 ? settings.person1Name : settings.person2Name}
              </span>
              {' monatlich überweisen: '}
              <span className="font-semibold text-amber-300">
                {formatCurrency(Math.abs(balance))}
              </span>
            </div>
          ) : (
            <div className="bg-green-600 rounded-lg px-3 py-2.5 text-center text-sm font-medium">
              Perfekt ausgeglichen ✓
            </div>
          )}
        </div>
      )}
    </div>
  );
}
