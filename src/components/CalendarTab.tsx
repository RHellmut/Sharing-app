import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, Pencil, Clock, CalendarDays } from 'lucide-react';
import { CalendarEvent, CalendarPerson, Settings } from '../types';

// ─── Constants ────────────────────────────────────────────────
const HOUR_H  = 56;
const LABEL_W = 44;

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DOW_SHORT   = ['Mo','Di','Mi','Do','Fr','Sa','So'];

const P1_DOT   = 'bg-green-500';
const P2_DOT   = 'bg-violet-500';
const P1_BTN   = 'bg-green-500 hover:bg-green-600 text-white';
const P2_BTN   = 'bg-violet-500 hover:bg-violet-600 text-white';
const P1_BADGE = 'bg-green-500 text-white';
const P2_BADGE = 'bg-violet-500 text-white';
const P1_BLOCK   = 'border-l-[3px] border-green-500 bg-green-50 text-green-900';
const P2_BLOCK   = 'border-l-[3px] border-violet-500 bg-violet-50 text-violet-900';

const PB_DOT   = 'bg-orange-500';
const PB_BTN   = 'bg-orange-500 hover:bg-orange-600 text-white';
const PB_BADGE = 'bg-orange-500 text-white';
const PB_BLOCK = 'border-l-[3px] border-orange-500 bg-orange-50 text-orange-900';

const iCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-400';

// ─── Date helpers (timezone-safe) ─────────────────────────────
function localStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr() { return localStr(new Date()); }
function makeId()   { return crypto.randomUUID(); }

function addDays(s: string, n: number): string {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localStr(d);
}

function getMonday(s: string): string {
  const d = new Date(s + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return localStr(d);
}

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function toPx(t: string): number { return toMin(t) / 60 * HOUR_H; }
function durPx(start: string, end?: string): number {
  const s = toMin(start);
  const e = end ? toMin(end) : s + 60;
  return Math.max(HOUR_H * 0.5, (e - s) / 60 * HOUR_H);
}

function fmtShortDate(s: string): string {
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

// ─── Reminder types ───────────────────────────────────────────
type ReminderMode = 'none' | '0' | '30' | '60' | '120' | '1440' | 'custom';

const REMINDER_OPTIONS: { value: ReminderMode; label: string }[] = [
  { value: 'none',   label: 'Keine Erinnerung' },
  { value: '0',      label: 'Zum Zeitpunkt' },
  { value: '30',     label: '30 Min vorher' },
  { value: '60',     label: '1 Std vorher' },
  { value: '120',    label: '2 Std vorher' },
  { value: '1440',   label: '1 Tag vorher' },
  { value: 'custom', label: 'Eigene Zeit…' },
];

function formToReminder(form: FormState): { reminderMinutes: number | undefined; reminderAt: string | undefined } {
  if (form.reminderMode === 'none') return { reminderMinutes: undefined, reminderAt: undefined };
  if (form.reminderMode === 'custom') {
    const at = form.reminderDate && form.reminderTime ? `${form.reminderDate} ${form.reminderTime}` : undefined;
    return { reminderMinutes: undefined, reminderAt: at };
  }
  return { reminderMinutes: Number(form.reminderMode), reminderAt: undefined };
}

const KNOWN_MODES: ReminderMode[] = ['none', '0', '30', '60', '120', '1440', 'custom'];
function eventToReminderForm(evt: CalendarEvent): Pick<FormState, 'reminderMode' | 'reminderDate' | 'reminderTime'> {
  if (evt.reminderAt) {
    const [d = '', t = ''] = evt.reminderAt.split(' ');
    return { reminderMode: 'custom', reminderDate: d, reminderTime: t };
  }
  if (evt.reminderMinutes !== undefined) {
    const mode = String(evt.reminderMinutes) as ReminderMode;
    return { reminderMode: KNOWN_MODES.includes(mode) ? mode : '120', reminderDate: '', reminderTime: '' };
  }
  return { reminderMode: 'none', reminderDate: '', reminderTime: '' };
}

// ─── Form types ───────────────────────────────────────────────
interface FormState {
  title:        string;
  person:       CalendarPerson;
  multiDay:     boolean;
  dateEnd:      string;
  timeStart:    string;
  timeEnd:      string;
  notes:        string;
  reminderMode: ReminderMode;
  reminderDate: string;
  reminderTime: string;
}
interface EditState extends FormState { id: string }
const emptyForm = (): FormState => ({
  title: '', person: 'person1', multiDay: false, dateEnd: '',
  timeStart: '', timeEnd: '', notes: '',
  reminderMode: '120', reminderDate: '', reminderTime: '',
});

// ─── Props ────────────────────────────────────────────────────
interface Props {
  events: CalendarEvent[];
  settings: Settings;
  onAdd:    (e: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onUpdate: (e: CalendarEvent) => void;
}

// ─── Stable sub-components (defined at module level to avoid remount) ─────────
function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex-1">
      <p className="text-[10px] font-medium text-gray-400 mb-1 ml-1">{label}</p>
      <div className="relative border border-gray-200 rounded-xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-slate-400 focus-within:border-slate-400">
        {!value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-white rounded-xl">
            <span className="text-sm text-gray-400 font-mono tracking-widest">hh:mm</span>
          </div>
        )}
        <input
          type="time"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-white focus:outline-none"
          style={{ fontSize: '16px', colorScheme: 'light' }}
        />
      </div>
    </div>
  );
}

function DateInput({ label, value, min, onChange }: { label: string; value: string; min?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex-1">
      <p className="text-[10px] font-medium text-gray-400 mb-1 ml-1">{label}</p>
      <div className="relative border border-gray-200 rounded-xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-slate-400 focus-within:border-slate-400">
        {!value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-white rounded-xl">
            <span className="text-sm text-gray-400 font-mono tracking-widest">dd.mm.</span>
          </div>
        )}
        <input
          type="date"
          value={value}
          min={min}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-white focus:outline-none"
          style={{ fontSize: '16px', colorScheme: 'light' }}
        />
      </div>
    </div>
  );
}

interface EventFormProps {
  form:        FormState | EditState;
  startDate:   string;
  settings:    Settings;
  heading:     string;
  showDelete?: boolean;
  onChange:    (f: FormState | EditState) => void;
  onSave:      () => void;
  onCancel:    () => void;
  onDelete?:   () => void;
}

function EventForm({ form, startDate, settings, heading, showDelete, onChange, onSave, onCancel, onDelete }: EventFormProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">{heading}</p>

      {/* Person */}
      <div className="flex gap-2">
        {(['person1', 'person2'] as const).map(p => (
          <button key={p} onClick={() => onChange({ ...form, person: p })}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              form.person === p ? (p === 'person1' ? P1_BTN : P2_BTN) : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {p === 'person1' ? settings.person1Name : settings.person2Name}
          </button>
        ))}
      </div>
      <button onClick={() => onChange({ ...form, person: 'both' })}
        className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${
          form.person === 'both' ? PB_BTN : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
        Zusammen
      </button>

      {/* Title */}
      <input type="text" value={form.title} onChange={e => onChange({ ...form, title: e.target.value })}
        placeholder="Titel" className={iCls} style={{ fontSize: '16px' }} autoFocus />

      {/* Type toggle: single / multi-day */}
      <div className="flex gap-2">
        <button onClick={() => onChange({ ...form, multiDay: false, dateEnd: '' })}
          className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            !form.multiDay ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          Einzelner Tag
        </button>
        <button onClick={() => onChange({ ...form, multiDay: true, timeStart: '', timeEnd: '' })}
          className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            form.multiDay ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          Mehrere Tage
        </button>
      </div>

      {/* Time or date range */}
      {form.multiDay ? (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <p className="text-[10px] font-medium text-gray-400 mb-1 ml-1">Von</p>
            <div className={`${iCls} bg-white text-gray-700 text-sm`}>{fmtShortDate(startDate)}</div>
          </div>
          <DateInput label="Bis" value={form.dateEnd} min={addDays(startDate, 1)}
            onChange={v => onChange({ ...form, dateEnd: v })} />
        </div>
      ) : (
        <div className="flex gap-2">
          <TimeInput label="Von" value={form.timeStart} onChange={v => onChange({ ...form, timeStart: v })} />
          <TimeInput label="Bis" value={form.timeEnd}   onChange={v => onChange({ ...form, timeEnd: v })} />
        </div>
      )}

      {/* Notes */}
      <input type="text" value={form.notes} onChange={e => onChange({ ...form, notes: e.target.value })}
        placeholder="Notiz (optional)" className={iCls} style={{ fontSize: '16px' }} />

      {/* Reminder */}
      <div>
        <p className="text-[10px] font-medium text-gray-400 mb-1 ml-1">Erinnerung</p>
        <select
          value={form.reminderMode}
          onChange={e => onChange({ ...form, reminderMode: e.target.value as ReminderMode })}
          className={`${iCls} bg-white`}
          style={{ fontSize: '16px' }}
        >
          {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {form.reminderMode === 'custom' && (
          <div className="flex gap-2 mt-2">
            <DateInput label="Datum" value={form.reminderDate} onChange={v => onChange({ ...form, reminderDate: v })} />
            <TimeInput label="Uhrzeit" value={form.reminderTime} onChange={v => onChange({ ...form, reminderTime: v })} />
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        {showDelete && (
          <button onClick={onDelete}
            className="px-3 py-2.5 rounded-xl text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center">
            <Trash2 size={14} />
          </button>
        )}
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
          Abbrechen
        </button>
        <button onClick={onSave} disabled={!form.title.trim() || (form.multiDay && !form.dateEnd)}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
          <Check size={15} /> Speichern
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export function CalendarTab({ events, settings, onAdd, onDelete, onUpdate }: Props) {
  const now = new Date();

  const [view, setView]   = useState<'month' | 'day'>('month');
  const [dayDate, setDay] = useState(todayStr());
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState<EditState | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === 'day') {
      setTimeout(() => {
        timelineRef.current?.scrollTo({ top: 7 * HOUR_H, behavior: 'smooth' });
      }, 80);
    }
  }, [view, dayDate]);

  // Build eventsByDate — multi-day events appear on every covered day
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const end = e.dateEnd ?? e.date;
      let cur = e.date;
      let guard = 0;
      while (cur <= end && guard++ < 366) {
        if (!map.has(cur)) map.set(cur, []);
        map.get(cur)!.push(e);
        cur = addDays(cur, 1);
      }
    }
    return map;
  }, [events]);

  // ── Month helpers ──
  const today     = todayStr();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const firstDow  = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells     = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMon }, (_, i) => i + 1)] as (number | null)[];
  const fmtDate   = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const prevMon   = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMon   = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  // ── Day helpers ──
  const monday     = getMonday(dayDate);
  const weekDays   = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const dayEvts    = eventsByDate.get(dayDate) ?? [];
  const timedEvts  = [...dayEvts].filter(e => e.timeStart && !e.dateEnd).sort((a, b) => a.timeStart!.localeCompare(b.timeStart!));
  const allDayEvts = dayEvts.filter(e => !e.timeStart || e.dateEnd);

  const dayLabel = (() => {
    const d = new Date(dayDate + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  })();

  // ── Form actions ──
  const submitAdd = () => {
    if (!addForm.title.trim()) return;
    const { reminderMinutes, reminderAt } = formToReminder(addForm);
    onAdd({
      id: makeId(), title: addForm.title.trim(), date: dayDate,
      dateEnd:   addForm.multiDay && addForm.dateEnd > dayDate ? addForm.dateEnd : undefined,
      timeStart: !addForm.multiDay && addForm.timeStart ? addForm.timeStart : undefined,
      timeEnd:   !addForm.multiDay && addForm.timeEnd   ? addForm.timeEnd   : undefined,
      person: addForm.person, notes: addForm.notes.trim() || undefined,
      reminderMinutes, reminderAt,
      createdAt: new Date().toISOString(),
    });
    setAddForm(emptyForm()); setShowAdd(false);
  };

  const submitEdit = () => {
    if (!editing?.title.trim()) return;
    const orig = events.find(e => e.id === editing.id);
    if (!orig) return;
    const { reminderMinutes, reminderAt } = formToReminder(editing);
    onUpdate({
      ...orig, title: editing.title.trim(),
      dateEnd:   editing.multiDay && editing.dateEnd > orig.date ? editing.dateEnd : undefined,
      timeStart: !editing.multiDay && editing.timeStart ? editing.timeStart : undefined,
      timeEnd:   !editing.multiDay && editing.timeEnd   ? editing.timeEnd   : undefined,
      person: editing.person, notes: editing.notes.trim() || undefined,
      reminderMinutes, reminderAt,
    });
    setEditing(null);
  };

  const startEdit = (evt: CalendarEvent) => {
    const { reminderMode, reminderDate, reminderTime } = eventToReminderForm(evt);
    setEditing({
      id: evt.id, title: evt.title, person: evt.person,
      multiDay:  !!evt.dateEnd,
      dateEnd:   evt.dateEnd   ?? '',
      timeStart: evt.timeStart ?? '',
      timeEnd:   evt.timeEnd   ?? '',
      notes:     evt.notes     ?? '',
      reminderMode, reminderDate, reminderTime,
    });
    setShowAdd(false);
  };

  // ══════════════════════════════════════════════
  //  MONTH VIEW
  // ══════════════════════════════════════════════
  if (view === 'month') {
    return (
      <div className="px-3 pt-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMon} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><ChevronLeft size={20} /></button>
          <h2 className="text-base font-semibold text-gray-800">{MONTH_NAMES[month]} {year}</h2>
          <button onClick={nextMon} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><ChevronRight size={20} /></button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {DOW_SHORT.map(d => <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const ds   = fmtDate(day);
            const evts = eventsByDate.get(ds) ?? [];
            const isTd = ds === today;
            const hasP1   = evts.some(e => e.person === 'person1');
            const hasP2   = evts.some(e => e.person === 'person2');
            const hasBoth = evts.some(e => e.person === 'both');
            const hasMulti = evts.some(e => e.dateEnd);
            return (
              <button key={ds} onClick={() => { setDay(ds); setView('day'); setShowAdd(false); setEditing(null); }}
                className={`flex flex-col items-center rounded-xl py-1 transition-colors ${isTd ? 'bg-slate-700' : 'hover:bg-gray-100'}`}>
                <span className={`text-sm font-medium leading-tight ${isTd ? 'text-white' : 'text-gray-700'}`}>{day}</span>
                <div className="flex gap-0.5 mt-0.5 h-2 items-center">
                  {hasP1   && <span className={`${hasMulti ? 'w-3 h-1.5 rounded-sm' : 'w-1.5 h-1.5 rounded-full'} ${P1_DOT}`} />}
                  {hasP2   && <span className={`${hasMulti ? 'w-3 h-1.5 rounded-sm' : 'w-1.5 h-1.5 rounded-full'} ${P2_DOT}`} />}
                  {hasBoth && <span className={`${hasMulti ? 'w-3 h-1.5 rounded-sm' : 'w-1.5 h-1.5 rounded-full'} ${PB_DOT}`} />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex items-center gap-4 justify-center flex-wrap">
          <div className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${P1_DOT}`} /><span className="text-xs text-gray-500">{settings.person1Name}</span></div>
          <div className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${P2_DOT}`} /><span className="text-xs text-gray-500">{settings.person2Name}</span></div>
          <div className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${PB_DOT}`} /><span className="text-xs text-gray-500">Zusammen</span></div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  //  DAY VIEW
  // ══════════════════════════════════════════════
  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 168px)' }}>

      {/* ── Week strip ── */}
      <div className="px-3 pt-3 pb-2 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setDay(d => addDays(d, -7))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft size={18} /></button>
          <button onClick={() => { setView('month'); setShowAdd(false); setEditing(null); }}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:bg-gray-100 px-3 py-1.5 rounded-xl transition-colors">
            <CalendarDays size={15} />
            {MONTH_NAMES[new Date(dayDate + 'T00:00:00').getMonth()]} {new Date(dayDate + 'T00:00:00').getFullYear()}
          </button>
          <button onClick={() => setDay(d => addDays(d, 7))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {weekDays.map((d, i) => {
            const isSel = d === dayDate;
            const isTd  = d === today;
            const dayN  = new Date(d + 'T00:00:00').getDate();
            const evts  = eventsByDate.get(d) ?? [];
            return (
              <button key={d} onClick={() => { setDay(d); setShowAdd(false); setEditing(null); }}
                className={`flex flex-col items-center py-1.5 rounded-xl transition-colors ${isSel ? 'bg-slate-700' : isTd ? 'bg-slate-100' : 'hover:bg-gray-100'}`}>
                <span className={`text-[9px] font-medium ${isSel ? 'text-slate-300' : 'text-gray-400'}`}>{DOW_SHORT[i]}</span>
                <span className={`text-sm font-semibold mt-0.5 ${isSel ? 'text-white' : isTd ? 'text-slate-700' : 'text-gray-700'}`}>{dayN}</span>
                <div className="flex gap-0.5 mt-0.5 h-1.5 items-center">
                  {evts.some(e => e.person === 'person1') && <span className={`w-1 h-1 rounded-full ${P1_DOT}`} />}
                  {evts.some(e => e.person === 'person2') && <span className={`w-1 h-1 rounded-full ${P2_DOT}`} />}
                  {evts.some(e => e.person === 'both')    && <span className={`w-1 h-1 rounded-full ${PB_DOT}`} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Day title bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-600 truncate">{dayLabel}</p>
        <button onClick={() => { setShowAdd(s => !s); setEditing(null); }}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-white text-xs font-medium rounded-xl hover:bg-slate-800 transition-colors flex-shrink-0 ml-2">
          <Plus size={13} /> Eintrag
        </button>
      </div>

      {/* ── Add / Edit form ── */}
      {(showAdd || editing) && (
        <div className="px-3 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0 overflow-y-auto" style={{ maxHeight: '55vh' }}>
          {showAdd && (
            <EventForm form={addForm} startDate={dayDate} settings={settings}
              onChange={f => setAddForm(f as FormState)}
              onSave={submitAdd}
              onCancel={() => { setShowAdd(false); setAddForm(emptyForm()); }}
              heading="Neuer Eintrag" />
          )}
          {editing && (
            <EventForm form={editing} startDate={events.find(e => e.id === editing.id)?.date ?? dayDate} settings={settings}
              onChange={f => setEditing(f as EditState)}
              onSave={submitEdit}
              onCancel={() => setEditing(null)}
              heading="Eintrag bearbeiten" showDelete
              onDelete={() => { onDelete(editing.id); setEditing(null); }} />
          )}
        </div>
      )}

      {/* ── All-day / multi-day events ── */}
      {allDayEvts.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100 bg-white flex-shrink-0">
          <p className="text-[10px] font-medium text-gray-400 mb-1.5">Ganztags</p>
          <div className="space-y-1">
            {allDayEvts.map(evt => {
              const isBoth = evt.person === 'both';
              const isP1   = evt.person === 'person1';
              const badge  = isBoth ? PB_BADGE : isP1 ? P1_BADGE : P2_BADGE;
              const name   = isBoth ? 'Zusammen' : isP1 ? settings.person1Name : settings.person2Name;
              const isEdit = editing?.id === evt.id;
              return (
                <button key={evt.id + dayDate} onClick={() => startEdit(evt)}
                  className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                    isBoth ? 'bg-orange-50 border border-orange-200 hover:bg-orange-100'
                    : isP1 ? 'bg-green-50 border border-green-200 hover:bg-green-100'
                           : 'bg-violet-50 border border-violet-200 hover:bg-violet-100'
                  } ${isEdit ? 'ring-2 ring-slate-400' : ''}`}>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${badge}`}>{name}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{evt.title}</p>
                    {evt.dateEnd && (
                      <p className="text-[10px] text-gray-400">{fmtShortDate(evt.date)} – {fmtShortDate(evt.dateEnd)}</p>
                    )}
                  </div>
                  <Pencil size={12} className="text-gray-400 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Timeline ── */}
      <div ref={timelineRef} className="flex-1 overflow-y-auto bg-white">
        <div className="relative" style={{ height: `${24 * HOUR_H}px` }}>

          {/* Hour lines */}
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="absolute left-0 right-0 flex items-start pointer-events-none"
              style={{ top: h * HOUR_H }}>
              <span className="text-[10px] text-gray-400 flex-shrink-0 -mt-[9px] select-none text-right pr-2"
                style={{ width: LABEL_W }}>
                {`${String(h).padStart(2, '0')}:00`}
              </span>
              <div className="flex-1 border-t border-gray-100" />
            </div>
          ))}

          {/* Current time indicator */}
          {dayDate === today && (() => {
            const n = new Date();
            const px = (n.getHours() + n.getMinutes() / 60) * HOUR_H;
            return (
              <div className="absolute flex items-center pointer-events-none"
                style={{ top: px, left: LABEL_W - 4, right: 0, zIndex: 10 }}>
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                <div className="flex-1 h-px bg-red-400" />
              </div>
            );
          })()}

          {/* Timed events: P1 = left, P2 = right */}
          {timedEvts.map(evt => {
            const isBoth = evt.person === 'both';
            const isP1   = evt.person === 'person1';
            const top    = toPx(evt.timeStart!);
            const height = Math.max(durPx(evt.timeStart!, evt.timeEnd), 28);
            const blk    = isBoth ? PB_BLOCK : isP1 ? P1_BLOCK : P2_BLOCK;
            const time   = evt.timeStart + (evt.timeEnd ? ` – ${evt.timeEnd}` : '');
            const isEdit = editing?.id === evt.id;

            return (
              <button key={evt.id}
                onClick={() => startEdit(evt)}
                className={`absolute rounded-md px-1.5 py-1 overflow-hidden text-left transition-opacity ${blk} ${isEdit ? 'ring-2 ring-slate-500 opacity-60' : 'hover:brightness-95'}`}
                style={{
                  top: top + 1, height: height - 2,
                  left: isBoth ? `${LABEL_W + 2}px` : isP1 ? `${LABEL_W + 2}px` : 'calc(50% + 1px)',
                  right: isBoth ? '2px' : isP1 ? 'calc(50% + 1px)' : '2px',
                  zIndex: 4, minWidth: 24,
                }}>
                <p className="text-[11px] font-semibold leading-tight truncate">{evt.title}</p>
                {height >= 32 && (
                  <p className="text-[10px] leading-tight flex items-center gap-0.5 opacity-75 mt-0.5">
                    <Clock size={8} />{time}
                  </p>
                )}
                {evt.notes && height >= 48 && (
                  <p className="text-[10px] opacity-60 truncate mt-0.5">{evt.notes}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
