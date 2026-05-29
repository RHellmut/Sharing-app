import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X } from 'lucide-react';
import { Expense, PersonId, CategoryId, Settings } from '../types';
import { USER_CATEGORIES } from '../constants';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  settings: Settings;
  onAdd: (expense: Expense) => void;
  onDone: () => void;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        // Bilder auf max. 500 px + 60 % Qualität verkleinern → ~30–60 KB für Cloud-Sync
        const MAX = 500;
        let { width, height } = img;
        if (width > height ? width > MAX : height > MAX) {
          if (width > height) { height = (height * MAX) / width; width = MAX; }
          else { width = (width * MAX) / height; height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
      img.src = ev.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AddExpenseForm({ settings, onAdd, onDone }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>('sonstiges');
  const [paidBy, setPaidBy] = useState<PersonId>('person1');
  const [splitMode, setSplitMode] = useState<'half' | 'custom'>('half');
  const [p1Split, setP1Split] = useState(50);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | undefined>();
  const [imgLoading, setImgLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    const el = dateRef.current;
    if (!el) return;
    if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
      (el as HTMLInputElement & { showPicker: () => void }).showPicker();
    } else {
      el.focus();
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgLoading(true);
    try { setReceiptImage(await compressImage(file)); }
    catch { alert('Bild konnte nicht geladen werden.'); }
    finally { setImgLoading(false); }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!description.trim()) errs.description = 'Bitte eine Beschreibung eingeben';
    const n = parseFloat(amount.replace(',', '.'));
    if (isNaN(n) || n <= 0) errs.amount = 'Bitte einen gültigen Betrag eingeben';
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const n = parseFloat(amount.replace(',', '.'));
    onAdd({
      id: crypto.randomUUID(),
      description: description.trim(),
      amount: Math.round(n * 100) / 100,
      categoryId,
      paidBy,
      splitRatio: splitMode === 'half' ? 0.5 : p1Split / 100,
      date,
      notes: notes.trim() || undefined,
      receiptImage,
      createdAt: new Date().toISOString(),
    });
    onDone();
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Description */}
      <div>
        <label className="text-sm font-medium text-gray-600 block mb-1.5">Beschreibung *</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="z.B. Wocheneinkauf Rewe"
          className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 ${errors.description ? 'border-red-400' : 'border-gray-200'}`}
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
      </div>

      {/* Amount */}
      <div>
        <label className="text-sm font-medium text-gray-600 block mb-1.5">Betrag *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium select-none">€</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0,00"
            min="0"
            step="0.01"
            className={`w-full border rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 ${errors.amount ? 'border-red-400' : 'border-gray-200'}`}
          />
        </div>
        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
      </div>

      {/* Category */}
      <div>
        <label className="text-sm font-medium text-gray-600 block mb-1.5">Kategorie</label>
        <div className="grid grid-cols-4 gap-2">
          {USER_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                categoryId === cat.id
                  ? 'border-slate-600 bg-slate-100'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
            >
              <CategoryIcon cat={cat} imgClassName="w-7 h-7" />
              <span className="text-[10px] text-gray-600 leading-tight text-center">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Paid by */}
      <div>
        <label className="text-sm font-medium text-gray-600 block mb-1.5">Bezahlt von</label>
        <div className="flex gap-2">
          {(['person1', 'person2'] as PersonId[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPaidBy(p)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all border-2 ${
                paidBy === p
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {p === 'person1' ? settings.person1Name : settings.person2Name}
            </button>
          ))}
        </div>
      </div>

      {/* Split */}
      <div>
        <label className="text-sm font-medium text-gray-600 block mb-1.5">Aufteilung</label>
        <div className="flex gap-2 mb-3">
          {(['half', 'custom'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setSplitMode(mode)}
              className={`flex-1 py-2.5 rounded-xl font-medium transition-all border-2 ${
                splitMode === mode
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {mode === 'half' ? '50 / 50' : 'Individuell'}
            </button>
          ))}
        </div>

        {splitMode === 'custom' && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">{settings.person1Name}</span>
              <span className="font-medium text-gray-700">{settings.person2Name}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={p1Split}
                onChange={e => setP1Split(Math.min(100, Math.max(0, +e.target.value)))}
                className="w-14 text-center border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={p1Split}
                onChange={e => setP1Split(+e.target.value)}
                className="flex-1 accent-slate-700"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={100 - p1Split}
                onChange={e => setP1Split(100 - Math.min(100, Math.max(0, +e.target.value)))}
                className="w-14 text-center border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div className="h-2 rounded-full overflow-hidden flex">
              <div className="bg-slate-600 h-full transition-all" style={{ width: `${p1Split}%` }} />
              <div className="bg-blue-400 flex-1 h-full" />
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
                {settings.person1Name}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                {settings.person2Name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Date */}
      <div>
        <label className="text-sm font-medium text-gray-600 block mb-1.5">Datum</label>
        <div
          onClick={openDatePicker}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && openDatePicker()}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 cursor-pointer bg-white text-gray-800 text-base"
        >
          {new Date(date + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {createPortal(
        <input
          ref={dateRef}
          type="date"
          tabIndex={-1}
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ position: 'fixed', top: '-100vh', left: '-100vw', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
        />,
        document.body
      )}

      {/* Receipt */}
      <div>
        <label className="text-sm font-medium text-gray-600 block mb-1.5">Beleg-Foto (optional)</label>
        {receiptImage ? (
          <div className="relative">
            <img src={receiptImage} alt="Beleg" className="w-full max-h-52 object-cover rounded-xl" />
            <button
              type="button"
              onClick={() => setReceiptImage(undefined)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={imgLoading}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-7 flex flex-col items-center gap-2 text-gray-400 hover:border-slate-400 hover:text-slate-500 transition-colors"
          >
            <Camera size={24} />
            <span className="text-sm">{imgLoading ? 'Wird geladen…' : 'Foto aufnehmen oder auswählen'}</span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImage}
          className="hidden"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium text-gray-600 block mb-1.5">Notizen (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Weitere Informationen…"
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        className="w-full bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white rounded-xl py-4 font-semibold text-lg transition-colors shadow-md"
      >
        Ausgabe hinzufügen
      </button>
    </div>
  );
}
