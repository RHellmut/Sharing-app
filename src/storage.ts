import { useState, useEffect } from 'react';
import { Expense, Settings } from './types';
import { DEFAULT_SETTINGS, STORAGE_KEY } from './constants';

interface StoreData {
  expenses: Expense[];
  settings: Settings;
}

function load(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoreData;
  } catch {}
  return { expenses: [], settings: DEFAULT_SETTINGS };
}

function save(data: StoreData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Speichern fehlgeschlagen:', e);
  }
}

export function useStore() {
  const [data, setData] = useState<StoreData>(load);

  useEffect(() => {
    save(data);
  }, [data]);

  return {
    expenses: data.expenses,
    settings: data.settings,

    addExpense(expense: Expense) {
      setData(prev => ({ ...prev, expenses: [expense, ...prev.expenses] }));
    },

    deleteExpense(id: string) {
      setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
    },

    updateSettings(settings: Settings) {
      setData(prev => ({ ...prev, settings }));
    },
  };
}
