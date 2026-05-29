import { useState, useEffect, useMemo } from 'react';
import { Expense, Settings, Kassensturz, ShoppingItem } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { supabase } from './supabaseClient';

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

function dbToKassensturz(row: Record<string, unknown>): Kassensturz {
  return {
    id:        row.id as string,
    createdAt: row.created_at as string,
  };
}

function dbToShoppingItem(row: Record<string, unknown>): ShoppingItem {
  return {
    id:        row.id as string,
    text:      row.text as string,
    checked:   row.checked as boolean,
    createdAt: row.created_at as string,
  };
}

export interface StoreResult {
  expenses:             Expense[];
  activeExpenses:       Expense[];
  archivedExpenses:     Expense[];
  kassensturzList:      Kassensturz[];
  shoppingItems:        ShoppingItem[];
  settings:             Settings;
  loading:              boolean;
  error:                string | null;
  opError:              string | null;
  clearOpError:         () => void;
  addExpense:           (e: Expense) => void;
  deleteExpense:        (id: string) => void;
  updateSettings:       (s: Settings) => void;
  performKassensturz:   () => Promise<void>;
  deleteKassensturz:    (ksId: string, expenseIds: string[]) => Promise<void>;
  addShoppingItem:      (text: string) => void;
  toggleShoppingItem:   (id: string) => void;
  deleteShoppingItem:   (id: string) => void;
  resetShoppingList:    () => Promise<void>;
}

export function useStore(): StoreResult {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [kassensturzList, setKassensturzList] = useState<Kassensturz[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const activeExpenses = useMemo(() => {
    const last = kassensturzList[0];
    if (!last) return expenses;
    return expenses.filter(e => e.createdAt > last.createdAt);
  }, [expenses, kassensturzList]);

  const archivedExpenses = useMemo(() => {
    const last = kassensturzList[0];
    if (!last) return [];
    return expenses.filter(e => e.createdAt <= last.createdAt);
  }, [expenses, kassensturzList]);

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
        .from('settings').select('*').eq('id', 1).single();
      if (!mounted || !data) return;
      const names = { person1Name: data.person1_name, person2Name: data.person2_name };
      if (names.person1Name === 'Du' && names.person2Name === 'Freundin') {
        setSettings(DEFAULT_SETTINGS);
        void supabase.from('settings')
          .update({ person1_name: DEFAULT_SETTINGS.person1Name, person2_name: DEFAULT_SETTINGS.person2Name })
          .eq('id', 1);
      } else {
        setSettings(names);
      }
    };

    const fetchKassensturz = async () => {
      const { data } = await supabase
        .from('kassensturz').select('*').order('created_at', { ascending: false });
      if (!mounted) return;
      setKassensturzList((data ?? []).map(dbToKassensturz));
    };

    const fetchShoppingItems = async () => {
      const { data } = await supabase
        .from('shopping_items').select('*').order('created_at', { ascending: true });
      if (!mounted) return;
      setShoppingItems((data ?? []).map(dbToShoppingItem));
    };

    void Promise.all([
      fetchExpenses(), fetchSettings(), fetchKassensturz(), fetchShoppingItems(),
    ]).finally(() => { if (mounted) setLoading(false); });

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchExpenses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kassensturz' }, fetchKassensturz)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, fetchShoppingItems)
      .subscribe();

    const poll = setInterval(() => {
      void fetchExpenses();
      void fetchKassensturz();
      void fetchShoppingItems();
    }, 30_000);

    return () => {
      mounted = false;
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    expenses,
    activeExpenses,
    archivedExpenses,
    kassensturzList,
    shoppingItems,
    settings,
    loading,
    error,
    opError,
    clearOpError: () => setOpError(null),

    addExpense(expense: Expense) {
      console.log('[addExpense] START:', expense.description, expense.amount);
      setExpenses(prev => [expense, ...prev]);
      void (async () => {
        try {
          const { error: err } = await supabase.from('expenses').insert({
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
          if (err) {
            setExpenses(prev => prev.filter(e => e.id !== expense.id));
            setOpError(`Eintrag konnte nicht gespeichert werden: ${err.message}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setExpenses(prev => prev.filter(e => e.id !== expense.id));
          setOpError(`Netzwerkfehler beim Speichern – Internetverbindung prüfen. (${msg})`);
        }
      })();
    },

    deleteExpense(id: string) {
      const snapshot = expenses;
      setExpenses(prev => prev.filter(e => e.id !== id));
      void (async () => {
        try {
          const { error: err } = await supabase.from('expenses').delete().eq('id', id);
          if (err) {
            setExpenses(snapshot);
            setOpError(`Eintrag konnte nicht gelöscht werden: ${err.message}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setExpenses(snapshot);
          setOpError(`Netzwerkfehler beim Löschen – Internetverbindung prüfen. (${msg})`);
        }
      })();
    },

    updateSettings(s: Settings) {
      setSettings(s);
      void supabase.from('settings')
        .update({ person1_name: s.person1Name, person2_name: s.person2Name })
        .eq('id', 1);
    },

    async performKassensturz() {
      const newKs: Kassensturz = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setKassensturzList(prev => [newKs, ...prev]);
      const { error: err } = await supabase.from('kassensturz').insert({
        id: newKs.id, created_at: newKs.createdAt,
      });
      if (err) {
        setKassensturzList(prev => prev.filter(k => k.id !== newKs.id));
        throw err;
      }
    },

    async deleteKassensturz(ksId: string, expenseIds: string[]) {
      const prevExpenses = expenses;
      const prevKsList   = kassensturzList;
      setExpenses(prev => prev.filter(e => !expenseIds.includes(e.id)));
      setKassensturzList(prev => prev.filter(k => k.id !== ksId));
      try {
        if (expenseIds.length > 0) {
          const { error: expErr } = await supabase.from('expenses').delete().in('id', expenseIds);
          if (expErr) throw expErr;
        }
        const { error: ksErr } = await supabase.from('kassensturz').delete().eq('id', ksId);
        if (ksErr) throw ksErr;
      } catch (err: unknown) {
        setExpenses(prevExpenses);
        setKassensturzList(prevKsList);
        const msg = err instanceof Error ? err.message : String(err);
        setOpError(`Kassensturz konnte nicht gelöscht werden: ${msg}`);
      }
    },

    addShoppingItem(text: string) {
      const item: ShoppingItem = {
        id: crypto.randomUUID(),
        text,
        checked: false,
        createdAt: new Date().toISOString(),
      };
      setShoppingItems(prev => [...prev, item]);
      void supabase.from('shopping_items').insert({
        id: item.id, text: item.text, checked: false, created_at: item.createdAt,
      }).then(({ error: err }) => {
        if (err) {
          setShoppingItems(prev => prev.filter(i => i.id !== item.id));
          setOpError(`Artikel konnte nicht gespeichert werden: ${err.message}`);
        }
      });
    },

    toggleShoppingItem(id: string) {
      setShoppingItems(prev =>
        prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
      );
      const item = shoppingItems.find(i => i.id === id);
      if (!item) return;
      void supabase.from('shopping_items')
        .update({ checked: !item.checked })
        .eq('id', id);
    },

    deleteShoppingItem(id: string) {
      const snapshot = shoppingItems;
      setShoppingItems(prev => prev.filter(i => i.id !== id));
      void (async () => {
        try {
          const { error: err } = await supabase.from('shopping_items').delete().eq('id', id);
          if (err) {
            setShoppingItems(snapshot);
            setOpError(`Artikel konnte nicht gelöscht werden: ${err.message}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setShoppingItems(snapshot);
          setOpError(`Netzwerkfehler beim Löschen. (${msg})`);
        }
      })();
    },

    async resetShoppingList() {
      const ids = shoppingItems.map(i => i.id);
      setShoppingItems([]);
      if (ids.length > 0) {
        const { error: err } = await supabase.from('shopping_items').delete().in('id', ids);
        if (err) setOpError(`Liste konnte nicht zurückgesetzt werden: ${err.message}`);
      }
    },
  };
}
