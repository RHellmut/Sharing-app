import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, RotateCcw, CheckSquare, Square } from 'lucide-react';
import { ShoppingItem } from '../types';

interface Props {
  items: ShoppingItem[];
  onAdd:    (text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onReset:  () => Promise<void>;
}

export function ShoppingList({ items, onAdd, onToggle, onDelete, onReset }: Props) {
  const [input, setInput]         = useState('');
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const unchecked = items.filter(i => !i.checked);
  const checked   = items.filter(i => i.checked);

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    onAdd(text);
    setInput('');
    inputRef.current?.focus();
  };

  const handleReset = async () => {
    await onReset();
    setConfirming(false);
  };

  // Submit on Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-16">
          <span className="text-5xl mb-3">🛒</span>
          <p className="font-medium text-gray-500">Liste ist leer</p>
          <p className="text-sm mt-1">Füge deinen ersten Artikel hinzu</p>
        </div>
        <InputBar
          ref={inputRef}
          value={input}
          onChange={setInput}
          onKeyDown={handleKeyDown}
          onAdd={handleAdd}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Item list */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-2">
        {unchecked.map(item => (
          <Item key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
        ))}

        {checked.length > 0 && unchecked.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t border-dashed border-gray-200" />
            <span className="text-xs text-gray-400">{checked.length} erledigt</span>
            <div className="flex-1 border-t border-dashed border-gray-200" />
          </div>
        )}

        {checked.map(item => (
          <Item key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
        ))}

        {/* Reset section */}
        <div className="pt-2">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={items.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400 transition-colors text-sm font-medium disabled:opacity-40"
            >
              <RotateCcw size={15} />
              Liste nach dem Einkauf zurücksetzen
            </button>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-sm text-red-700 text-center mb-3">
                Alle {items.length} {items.length === 1 ? 'Artikel' : 'Artikel'} löschen?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Zurücksetzen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <InputBar
        ref={inputRef}
        value={input}
        onChange={setInput}
        onKeyDown={handleKeyDown}
        onAdd={handleAdd}
      />
    </div>
  );
}

function Item({ item, onToggle, onDelete }: {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border transition-all ${
        item.checked ? 'border-gray-100 opacity-60' : 'border-gray-100'
      }`}
    >
      <button
        onClick={() => onToggle(item.id)}
        className={`flex-shrink-0 transition-colors ${
          item.checked ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'
        }`}
      >
        {item.checked
          ? <CheckSquare size={22} />
          : <Square size={22} />
        }
      </button>
      <span className={`flex-1 text-sm font-medium ${
        item.checked ? 'line-through text-gray-400' : 'text-gray-800'
      }`}>
        {item.text}
      </span>
      <button
        onClick={() => onDelete(item.id)}
        className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors p-1"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

const InputBar = React.forwardRef<HTMLInputElement, {
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onAdd: () => void;
}>(({ value, onChange, onKeyDown, onAdd }, ref) => (
  <div className="border-t border-gray-100 pt-3 pb-1">
    <div className="flex gap-2">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Artikel hinzufügen…"
        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button
        onClick={onAdd}
        disabled={!value.trim()}
        className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
      >
        <Plus size={22} />
      </button>
    </div>
  </div>
));
InputBar.displayName = 'InputBar';
