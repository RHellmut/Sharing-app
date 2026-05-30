import React, { useState } from 'react';
import { X, Save, Users } from 'lucide-react';
import { Settings } from '../types';

interface Props {
  settings: Settings;
  onUpdate: (s: Settings) => void;
  onClose: () => void;
}

export function SettingsModal({ settings, onUpdate, onClose }: Props) {
  const [p1, setP1] = useState(settings.person1Name);
  const [p2, setP2] = useState(settings.person2Name);

  const handleSave = () => {
    if (p1.trim() && p2.trim()) {
      onUpdate({ person1Name: p1.trim(), person2Name: p2.trim() });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={20} className="text-slate-600" />
            Einstellungen
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1.5">Person 1 (Du)</label>
            <input
              type="text"
              value={p1}
              onChange={e => setP1(e.target.value)}
              placeholder="Dein Name"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1.5">Person 2</label>
            <input
              type="text"
              value={p2}
              onChange={e => setP2(e.target.value)}
              placeholder="Name deiner Freundin"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 space-y-3">
          <button
            onClick={handleSave}
            className="w-full bg-slate-700 hover:bg-slate-800 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Save size={18} />
            Speichern
          </button>
          <p className="text-center text-[11px] text-gray-400 leading-relaxed">
            Version {__APP_VERSION__}
            <br />
            Zuletzt aktualisiert:{' '}
            {new Date(__BUILD_TIME__).toLocaleString('de-DE', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })} Uhr
          </p>
        </div>
      </div>
    </div>
  );
}
