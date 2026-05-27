import { useState, useEffect } from 'react';
import { Expense, Settings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { supabase } from './supabaseClient';

// DB-Zeile → TypeScript-Typ
function dbToExpense(row: Record<string, unknown>): Expense {
  return {
    id:           row.id as string,
    description:  row.description as string,
    amount:       Number(row.amount),
    categoryId:   row.category_id as Expense['categoryId'],
    paidBy:       row.paid_by as Expense['paidBy'],
    splitRatio:   Number(row.split_ratio),
    date:         (row.date as string).slice(0, 10),
    receiptImage: (row.receipt_image as string | null) ?? undefined,
    notes:        (row.notes as string | null) ?? undefined,
    createdAt:    row.created_at as string,
  };
}

export interface StoreResult {
  expenses:       Expense[];
  settings:       Settings;
  loading:        boolean;
  error:          string | null;
  addExpense:     (e: Expense) => void;
  deleteExpense:  (id: string) => void;
  updateSettings: (s: Settings) => void;
}

export function useStore(): StoreResult {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchExpenses = async () => {
      const { data, error: err } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });
      if (!mounted) return;
      if (err) { setError(err.message); return; }
      setExpenses((data ?? []).map(dbToExpense));
    };

    const fetchSettings = async () => {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (!mounted || !data) return;
      setSettings({ person1Name: data.person1_name, person2Name: data.person2_name });
    };

    // Erstes Laden
    void Promise.all([fetchExpenses(), fetchSettings()]).finally(() => {
      if (mounted) setLoading(false);
    });

    // Echtzeit-Subscription → beide Handys synken automatisch
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchExpenses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchSettings)
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    expenses,
    settings,
    loading,
    error,

    addExpense(expense: Expense) {
      // Sofort lokal anzeigen (optimistisch), Supabase synct im Hintergrund
      setExpenses(prev => [expense, ...prev]);
      void supabase.from('expenses').insert({
        id:            expense.id,
        description:   expense.description,
        amount:        expense.amount,
        category_id:   expense.categoryId,
        paid_by:       expense.paidBy,
        split_ratio:   expense.splitRatio,
        date:          expense.date,
        receipt_image: expense.receiptImage ?? null,
        notes:         expense.notes ?? null,
        created_at:    expense.createdAt,
      });
    },

    deleteExpense(id: string) {
      // Sofort lokal entfernen, Supabase synct im Hintergrund
      setExpenses(prev => prev.filter(e => e.id !== id));
      void supabase.from('expenses').delete().eq('id', id);
    },

    updateSettings(s: Settings) {
      // Sofort lokal aktualisieren, Supabase synct im Hintergrund
      setSettings(s);
      void supabase.from('settings')
        .update({ person1_name: s.person1Name, person2_name: s.person2Name })
        .eq('id', 1);
    },
  };
}
