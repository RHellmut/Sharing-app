import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Check, Pencil } from 'lucide-react';
import { CalendarEvent, Settings } from '../types';

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
const DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const P1_COLOR  = 'bg-green-500';
const P2_COLOR  = 'bg-violet-500';
const P1_LIGHT  = 'bg-green-50 border-green-200';
const P2_LIGHT  = 'bg-violet-50 border-violet-200';
const P1_BADGE  = 'bg-green-500 text-white';
const P2_BADGE  = 'bg-violet-500 text-white';
const P1_BTN    = 'bg-green-500 hover:bg-green-600 text-white';
const P2_BTN    = 'bg-violet-500 hover:bg-violet-600 text-white';

function todayStr() { return new Date().toISOString().slice(0, 10); }
function makeId()   { return crypto.randomUUID(); }

interface EditState {
  id: string;
  title: string;
  time: string;
  person: 'person1' | 'person2';
  notes: string;
}

interface Props {
  events: CalendarEvent[];
  settings: Settings;
  onAdd:    (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onUpdate: (event: CalendarEvent) => void;
}

export function CalendarTab({ events, settings, onAdd, onDelete, onUpdate }: Props) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  // Add form
  const [showForm,   setShowForm]   = useState(false);
  const [formTitle,  setFormTitle]  = useState('');
  const [formPerson, setFormPerson] = useState<'person1' | 'person2'>('person1');
  const [formTime,   setFormTime]   = useState('');
  const [formNotes,  setFormNotes]  = useState('');

  // Edit form
  const [editing, setEditing] = useState<EditState | null>(null);

  const prevMonth = () => {
    setSelected(null);
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelected(null);
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    // Sort each day's events by time
    for (const [, arr] of map) {
      arr.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
    }
    return map;
  }, [events]);

  const fmtDate = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const today    = todayStr();
  const selEvts  = selected ? (eventsByDate.get(selected) ?? []) : [];

  const submitAdd = () => {
    if (!formTitle.trim() || !selected) return;
    onAdd({
      id:        makeId(),
      title:     formTitle.trim(),
      date:      selected,
      time:      formTime || undefined,
      person:    formPerson,
      notes:     formNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setFormTitle(''); setFormNotes(''); setFormTime('');
    setShowForm(false);
  };

  const startEdit = (evt: CalendarEvent) => {
    setEditing({ id: evt.id, title: evt.title, time: evt.time ?? '', person: evt.person, notes: evt.notes ?? '' });
    setShowForm(false);
  };

  const submitEdit = () => {
    if (!editing || !editing.title.trim()) return;
    const original = events.find(e => e.id === editing.id);
    if (!original) return;
    onUpdate({ ...original, title: editing.title.trim(), time: editing.time || undefined, person: editing.person, notes: editing.notes.trim() || undefined });
    setEditing(null);
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const inputBase = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-400';

  return (
    <div className="px-3 pt-4 pb-6">

      {/* ── Month navigation ── */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-base font-semibold text-gray-800">{MONTH_NAMES[month]} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ── Day-of-week header ── */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dateStr  = fmtDate(day);
          const dayEvts  = eventsByDate.get(dateStr) ?? [];
          const isToday  = dateStr === today;
          const isSel    = dateStr === selected;
          const hasP1    = dayEvts.some(e => e.person === 'person1');
          const hasP2    = dayEvts.some(e => e.person === 'person2');

          return (
            <button
              key={dateStr}
              onClick={() => { setSelected(isSel ? null : dateStr); setShowForm(false); setEditing(null); }}
              className={`flex flex-col items-center rounded-xl py-1 transition-colors ${
                isSel ? 'bg-slate-700' : isToday ? 'bg-slate-100' : 'hover:bg-gray-100'
              }`}
            >
              <span className={`text-sm font-medium leading-tight ${
                isSel ? 'text-white' : isToday ? 'text-slate-700' : 'text-gray-700'
              }`}>{day}</span>
              <div className="flex gap-0.5 mt-0.5 h-2 items-center">
                {hasP1 && <span className={`w-1.5 h-1.5 rounded-full ${P1_COLOR}`} />}
                {hasP2 && <span className={`w-1.5 h-1.5 rounded-full ${P2_COLOR}`} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Selected day panel ── */}
      {selected && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">{formatDisplayDate(selected)}</p>
            <button onClick={() => { setSelected(null); setShowForm(false); setEditing(null); }}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={16} />
            </button>
          </div>

          {/* Event list */}
          {selEvts.length > 0 && (
            <div className="space-y-2">
              {selEvts.map(evt => {
                const isP1  = evt.person === 'person1';
                const name  = isP1 ? settings.person1Name : settings.person2Name;
                const light = isP1 ? P1_LIGHT : P2_LIGHT;
                const badge = isP1 ? P1_BADGE : P2_BADGE;

                // ── Edit mode ──
                if (editing?.id === evt.id) {
                  return (
                    <div key={evt.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 space-y-2">
                      {/* Person selector */}
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(s => s && ({ ...s, person: 'person1' }))}
                          className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                            editing.person === 'person1' ? P1_BTN : 'bg-gray-100 text-gray-500'}`}>
                          {settings.person1Name}
                        </button>
                        <button onClick={() => setEditing(s => s && ({ ...s, person: 'person2' }))}
                          className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                            editing.person === 'person2' ? P2_BTN : 'bg-gray-100 text-gray-500'}`}>
                          {settings.person2Name}
                        </button>
                      </div>
                      {/* Title */}
                      <input type="text" value={editing.title}
                        onChange={e => setEditing(s => s && ({ ...s, title: e.target.value }))}
                        placeholder="Titel"
                        className={inputBase}
                        style={{ fontSize: '16px' }}
                        autoFocus
                      />
                      {/* Time + Notes row */}
                      <div className="flex gap-2">
                        <input type="time" value={editing.time}
                          onChange={e => setEditing(s => s && ({ ...s, time: e.target.value }))}
                          className="border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-400 w-32"
                          style={{ fontSize: '16px' }}
                        />
                        <input type="text" value={editing.notes}
                          onChange={e => setEditing(s => s && ({ ...s, notes: e.target.value }))}
                          placeholder="Notiz (optional)"
                          className={`${inputBase} flex-1`}
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                      {/* Buttons */}
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(null)}
                          className="flex-1 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                          Abbrechen
                        </button>
                        <button onClick={submitEdit} disabled={!editing.title.trim()}
                          className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                          <Check size={14} /> Speichern
                        </button>
                      </div>
                    </div>
                  );
                }

                // ── Display mode ──
                return (
                  <div key={evt.id} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${light}`}>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap mt-0.5 flex-shrink-0 ${badge}`}>
                      {name}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-snug">{evt.title}</p>
                      <div className="flex flex-wrap gap-x-2 mt-0.5">
                        {evt.time && (
                          <span className="text-xs font-medium text-gray-500">{evt.time} Uhr</span>
                        )}
                        {evt.notes && (
                          <span className="text-xs text-gray-400">{evt.notes}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(evt)}
                        className="p-1 rounded-lg hover:bg-black/10 text-gray-400 hover:text-gray-600 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(evt.id)}
                        className="p-1 rounded-lg hover:bg-black/10 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selEvts.length === 0 && !showForm && (
            <p className="text-xs text-gray-400 text-center py-2">Noch keine Einträge für diesen Tag.</p>
          )}

          {/* Add form */}
          {showForm ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Neuer Eintrag</p>
              {/* Person selector */}
              <div className="flex gap-2">
                <button onClick={() => setFormPerson('person1')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    formPerson === 'person1' ? P1_BTN : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {settings.person1Name}
                </button>
                <button onClick={() => setFormPerson('person2')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    formPerson === 'person2' ? P2_BTN : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {settings.person2Name}
                </button>
              </div>
              {/* Title */}
              <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
                placeholder="Titel" className={inputBase} style={{ fontSize: '16px' }} autoFocus />
              {/* Time + Notes row */}
              <div className="flex gap-2">
                <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-400 w-32"
                  style={{ fontSize: '16px' }}
                />
                <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)}
                  placeholder="Notiz (optional)"
                  className={`${inputBase} flex-1`} style={{ fontSize: '16px' }} />
              </div>
              {/* Buttons */}
              <div className="flex gap-2">
                <button onClick={() => { setShowForm(false); setFormTitle(''); setFormNotes(''); setFormTime(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  Abbrechen
                </button>
                <button onClick={submitAdd} disabled={!formTitle.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                  <Check size={15} /> Speichern
                </button>
              </div>
            </div>
          ) : !editing && (
            <button onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-slate-400 hover:text-slate-600 transition-colors">
              <Plus size={16} /> Eintrag hinzufügen
            </button>
          )}
        </div>
      )}

      {/* ── Legend ── */}
      <div className="mt-6 flex items-center gap-4 justify-center">
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${P1_COLOR}`} />
          <span className="text-xs text-gray-500">{settings.person1Name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${P2_COLOR}`} />
          <span className="text-xs text-gray-500">{settings.person2Name}</span>
        </div>
      </div>
    </div>
  );
}
