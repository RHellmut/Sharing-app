import { useState, useEffect, useMemo } from 'react';
import { Expense, Settings, Kassensturz, KassensturzPeriodData, ShoppingItem, FixkostenAmounts, VertragsEntry, CalendarEvent, CalendarPerson } from './types';
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
  kassensturzPeriods:   KassensturzPeriodData[];
  shoppingItems:        ShoppingItem[];
  fixkosten:            Record<string, FixkostenAmounts>;
  vertraege:            Record<string, VertragsEntry>;
  visitedCountries:     Set<string>;
  calendarEvents:       CalendarEvent[];
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
  updateFixkosten:      (key: string, person: 'person1' | 'person2', amount: number) => void;
  updateVertrag:        (key: string, field: string, value: string | boolean) => void;
  toggleVisitedCountry: (code: string) => void;
  addCalendarEvent:     (event: CalendarEvent) => void;
  deleteCalendarEvent:  (id: string) => void;
  updateCalendarEvent:  (event: CalendarEvent) => void;
}

export function useStore(): StoreResult {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [kassensturzList, setKassensturzList] = useState<Kassensturz[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [fixkosten, setFixkosten] = useState<Record<string, FixkostenAmounts>>({});
  const [vertraege, setVertraege] = useState<Record<string, VertragsEntry>>({});
  const [visitedCountries, setVisitedCountries] = useState<Set<string>>(new Set());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
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

  const kassensturzPeriods = useMemo(() =>
    kassensturzList.map((ks, index) => {
      const prevKs = kassensturzList[index + 1];
      return {
        kassensturz: ks,
        prevCreatedAt: prevKs?.createdAt ?? null,
        expenses: expenses.filter(e =>
          e.createdAt <= ks.createdAt &&
          (!prevKs || e.createdAt > prevKs.createdAt)
        ),
      };
    }),
    [expenses, kassensturzList],
  );

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

    const fetchFixkosten = async () => {
      const { data } = await supabase.from('fixkosten').select('*');
      if (!mounted) return;
      const map: Record<string, FixkostenAmounts> = {};
      for (const row of data ?? []) {
        map[row.key as string] = {
          person1Amount: Number(row.person1_amount),
          person2Amount: Number(row.person2_amount),
        };
      }
      setFixkosten(map);
    };

    const fetchVertraege = async () => {
      const { data } = await supabase.from('vertraege').select('*');
      if (!mounted) return;
      const map: Record<string, VertragsEntry> = {};
      for (const row of data ?? []) {
        map[row.key as string] = {
          key:             row.key as string,
          anbieter:        (row.anbieter       as string)         ?? '',
          vertragsbeginn:  (row.vertragsbeginn as string | null)  ?? null,
          vertragsende:    (row.vertragsende   as string | null)  ?? null,
          gekuendigt:      (row.gekuendigt     as boolean)        ?? false,
          neuerAnbieter:   (row.neuer_anbieter as string)         ?? '',
          laeuftAb:        (row.laeuft_ab      as string | null)  ?? null,
        };
      }
      setVertraege(map);
    };

    const fetchVisitedCountries = async () => {
      const { data } = await supabase.from('visited_countries').select('country_code');
      if (!mounted) return;
      setVisitedCountries(new Set((data ?? []).map(r => r.country_code as string)));
    };

    const fetchCalendarEvents = async () => {
      const { data } = await supabase
        .from('calendar_events').select('*').order('date', { ascending: true });
      if (!mounted) return;
      setCalendarEvents((data ?? []).map(r => ({
        id:        r.id as string,
        title:     r.title as string,
        date:      (r.date     as string).slice(0, 10),
        dateEnd:   (r.date_end as string | null) ? (r.date_end as string).slice(0, 10) : undefined,
        timeStart: (r.time_start as string | null) ?? undefined,
        timeEnd:   (r.time_end   as string | null) ?? undefined,
        person:    r.person as CalendarPerson,
        notes:     (r.notes as string | null) ?? undefined,
        createdAt: r.created_at as string,
      })));
    };

    void Promise.all([
      fetchExpenses(), fetchSettings(), fetchKassensturz(), fetchShoppingItems(),
      fetchFixkosten(), fetchVertraege(), fetchVisitedCountries(), fetchCalendarEvents(),
    ]).finally(() => { if (mounted) setLoading(false); });

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchExpenses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kassensturz' }, fetchKassensturz)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, fetchShoppingItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixkosten' }, fetchFixkosten)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vertraege' }, fetchVertraege)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visited_countries' }, fetchVisitedCountries)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, fetchCalendarEvents)
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
    kassensturzPeriods,
    shoppingItems,
    fixkosten,
    vertraege,
    visitedCountries,
    calendarEvents,
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
      const snapshot = settings;
      setSettings(s);
      void (async () => {
        try {
          const { error: err } = await supabase.from('settings')
            .update({ person1_name: s.person1Name, person2_name: s.person2Name })
            .eq('id', 1);
          if (err) {
            setSettings(snapshot);
            setOpError(`Einstellungen konnten nicht gespeichert werden: ${err.message}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setSettings(snapshot);
          setOpError(`Netzwerkfehler beim Speichern der Einstellungen. (${msg})`);
        }
      })();
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
      const snapshot = shoppingItems;
      setShoppingItems(prev => [...prev, item]);
      void (async () => {
        try {
          const { error: err } = await supabase.from('shopping_items').insert({
            id: item.id, text: item.text, checked: false, created_at: item.createdAt,
          });
          if (err) {
            setShoppingItems(snapshot);
            setOpError(`Artikel konnte nicht gespeichert werden: ${err.message}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setShoppingItems(snapshot);
          setOpError(`Netzwerkfehler beim Speichern. (${msg})`);
        }
      })();
    },

    toggleShoppingItem(id: string) {
      const item = shoppingItems.find(i => i.id === id);
      if (!item) return;
      const snapshot = shoppingItems;
      setShoppingItems(prev =>
        prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
      );
      void (async () => {
        try {
          const { error: err } = await supabase.from('shopping_items')
            .update({ checked: !item.checked })
            .eq('id', id);
          if (err) {
            setShoppingItems(snapshot);
            setOpError(`Artikel konnte nicht aktualisiert werden: ${err.message}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setShoppingItems(snapshot);
          setOpError(`Netzwerkfehler beim Aktualisieren. (${msg})`);
        }
      })();
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

    toggleVisitedCountry(code: string) {
      const wasVisited = visitedCountries.has(code);
      const snapshot = visitedCountries;
      setVisitedCountries(prev => {
        const next = new Set(prev);
        if (wasVisited) next.delete(code); else next.add(code);
        return next;
      });
      void (async () => {
        try {
          if (wasVisited) {
            const { error: err } = await supabase.from('visited_countries').delete().eq('country_code', code);
            if (err) { setVisitedCountries(snapshot); setOpError(`Land konnte nicht entfernt werden: ${err.message}`); }
          } else {
            const { error: err } = await supabase.from('visited_countries').insert({ country_code: code });
            if (err) { setVisitedCountries(snapshot); setOpError(`Land konnte nicht gespeichert werden: ${err.message}`); }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setVisitedCountries(snapshot);
          setOpError(`Netzwerkfehler bei der Reiseliste. (${msg})`);
        }
      })();
    },

    updateVertrag(key: string, field: string, value: string | boolean) {
      const snapshot = vertraege;
      const current: VertragsEntry = vertraege[key] ?? {
        key, anbieter: '', vertragsbeginn: null, vertragsende: null,
        gekuendigt: false, neuerAnbieter: '', laeuftAb: null,
      };
      const fieldValue = typeof value === 'boolean' ? value : (value || null);
      const updated: VertragsEntry = { ...current, [field]: fieldValue };
      setVertraege(prev => ({ ...prev, [key]: updated }));
      void (async () => {
        try {
          const { error: err } = await supabase.from('vertraege').upsert({
            key,
            anbieter:       updated.anbieter,
            vertragsbeginn: updated.vertragsbeginn ?? null,
            vertragsende:   updated.vertragsende   ?? null,
            gekuendigt:     updated.gekuendigt,
            neuer_anbieter: updated.neuerAnbieter,
            laeuft_ab:      updated.laeuftAb       ?? null,
          });
          if (err) {
            setVertraege(snapshot);
            setOpError(`Vertrag konnte nicht gespeichert werden: ${err.message}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setVertraege(snapshot);
          setOpError(`Netzwerkfehler beim Speichern des Vertrags. (${msg})`);
        }
      })();
    },

    updateFixkosten(key: string, person: 'person1' | 'person2', amount: number) {
      const snapshot = fixkosten;
      const current = fixkosten[key] ?? { person1Amount: 0, person2Amount: 0 };
      const updated: FixkostenAmounts = person === 'person1'
        ? { ...current, person1Amount: amount }
        : { ...current, person2Amount: amount };
      setFixkosten(prev => ({ ...prev, [key]: updated }));
      void (async () => {
        try {
          const { error: err } = await supabase.from('fixkosten').upsert({
            key,
            person1_amount: updated.person1Amount,
            person2_amount: updated.person2Amount,
          });
          if (err) {
            setFixkosten(snapshot);
            setOpError(`Fixkosten konnten nicht gespeichert werden: ${err.message}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setFixkosten(snapshot);
          setOpError(`Netzwerkfehler beim Speichern der Fixkosten. (${msg})`);
        }
      })();
    },

    addCalendarEvent(event: CalendarEvent) {
      setCalendarEvents(prev => [...prev, event].sort((a, b) => a.date.localeCompare(b.date)));
      void (async () => {
        try {
          const { error: err } = await supabase.from('calendar_events').insert({
            id:         event.id,
            title:      event.title,
            date:       event.date,
            date_end:   event.dateEnd   ?? null,
            time_start: event.timeStart ?? null,
            time_end:   event.timeEnd   ?? null,
            person:     event.person,
            notes:      event.notes ?? null,
            created_at: event.createdAt,
          });
          if (err) {
            setCalendarEvents(prev => prev.filter(e => e.id !== event.id));
            setOpError(`Termin konnte nicht gespeichert werden: ${err.message}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setCalendarEvents(prev => prev.filter(e => e.id !== event.id));
          setOpError(`Netzwerkfehler beim Speichern des Termins. (${msg})`);
        }
      })();
    },

    deleteCalendarEvent(id: string) {
      const snapshot = calendarEvents;
      setCalendarEvents(prev => prev.filter(e => e.id !== id));
      void (async () => {
        try {
          const { error: err } = await supabase.from('calendar_events').delete().eq('id', id);
          if (err) {
            setCalendarEvents(snapshot);
            setOpError(`Termin konnte nicht gelöscht werden: ${err.message}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setCalendarEvents(snapshot);
          setOpError(`Netzwerkfehler beim Löschen des Termins. (${msg})`);
        }
      })();
    },

    updateCalendarEvent(event: CalendarEvent) {
      const snapshot = calendarEvents;
      setCalendarEvents(prev =>
        prev.map(e => e.id === event.id ? event : e)
            .sort((a, b) => a.date.localeCompare(b.date) || (a.timeStart ?? '').localeCompare(b.timeStart ?? ''))
      );
      void (async () => {
        try {
          const { error: err } = await supabase.from('calendar_events').update({
            title:      event.title,
            date:       event.date,
            date_end:   event.dateEnd   ?? null,
            time_start: event.timeStart ?? null,
            time_end:   event.timeEnd   ?? null,
            person:     event.person,
            notes:      event.notes     ?? null,
          }).eq('id', event.id);
          if (err) {
            setCalendarEvents(snapshot);
            setOpError(`Termin konnte nicht aktualisiert werden: ${err.message}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setCalendarEvents(snapshot);
          setOpError(`Netzwerkfehler beim Aktualisieren des Termins. (${msg})`);
        }
      })();
    },
  };
}
