import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, ArrowRight, HandCoins, X, Palmtree, ImagePlus, Trash2 } from 'lucide-react';
import { Expense, Settings } from '../types';
import { calculateBalance, formatCurrency } from '../calculations';

const STORAGE_KEY = 'vacation_photo_v1';

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = (height * MAX) / width; width = MAX; }
          else { width = (width * MAX) / height; height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = ev.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Props {
  expenses: Expense[];
  settings: Settings;
  onSettle: () => void;
}

export function BalanceCard({ expenses, settings, onSettle }: Props) {
  const [confirming, setConfirming]     = useState(false);
  const [vacationOpen, setVacationOpen] = useState(false);
  const [photo, setPhoto]               = useState<string | null>(null);
  const [uploading, setUploading]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const balance = calculateBalance(expenses);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setPhoto(saved);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      localStorage.setItem(STORAGE_KEY, compressed);
      setPhoto(compressed);
    } catch {
      alert('Foto konnte nicht geladen werden.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPhoto(null);
  };

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
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      onClick={() => setVacationOpen(false)}
    >
      {/* Close button */}
      <button
        onClick={() => setVacationOpen(false)}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors z-10"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
        aria-label="Schließen"
      >
        <X size={22} />
      </button>

      {photo ? (
        /* Show photo */
        <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
          <img
            src={photo}
            alt="Vacation"
            className="rounded-2xl shadow-2xl object-contain"
            style={{ maxWidth: '92vw', maxHeight: '78vh' }}
          />
          <button
            onClick={handleRemovePhoto}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-red-500/70 text-white text-xs font-medium rounded-full transition-colors border border-white/20"
          >
            <Trash2 size={12} />
            Foto entfernen
          </button>
        </div>
      ) : (
        /* No photo yet — upload prompt */
        <div
          className="flex flex-col items-center gap-4 text-white text-center px-8"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center">
            <Palmtree size={36} className="opacity-70" />
          </div>
          <div>
            <p className="text-lg font-semibold mb-1">Vacation Mode</p>
            <p className="text-sm text-white/70">Füge euer gemeinsames Foto hinzu</p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-6 py-3 bg-white text-gray-800 font-semibold rounded-xl shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-60"
          >
            <ImagePlus size={18} />
            {uploading ? 'Wird geladen…' : 'Foto auswählen'}
          </button>
          <p className="text-xs text-white/50">Das Foto wird nur auf diesem Gerät gespeichert</p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
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
