# Catriver Cost – Projektregeln für Claude

## Pflichtcheck vor jedem Commit

### CRUD-Operationen
Jede neue Schreib-Operation (insert, update, delete) gegen Supabase **muss** das etablierte Muster aus `storage.ts` verwenden:

1. **Snapshot** des alten State nehmen
2. **Optimistisches Update** im lokalen State
3. **Await** des Supabase-Calls mit expliziter Fehlerprüfung
4. **Rollback** auf den Snapshot bei Fehler
5. **setOpError()** aufrufen mit verständlicher Fehlermeldung

**Referenzimplementierung:** `deleteExpense` und `addExpense` in `src/storage.ts`

```typescript
// ✅ Korrekt
deleteShoppingItem(id: string) {
  const snapshot = shoppingItems;
  setShoppingItems(prev => prev.filter(i => i.id !== id));
  void (async () => {
    try {
      const { error: err } = await supabase.from('shopping_items').delete().eq('id', id);
      if (err) { setShoppingItems(snapshot); setOpError(`...${err.message}`); }
    } catch (err: unknown) {
      setShoppingItems(snapshot); setOpError(`Netzwerkfehler...`);
    }
  })();
},

// ❌ Verboten – Silent Failure
void supabase.from('shopping_items').delete().eq('id', id);
```

### Code-Review vor dem Commit
Nach jeder Implementierung, **bevor** `git commit` ausgeführt wird:

- Neue CRUD-Operationen gegen das Referenzmuster prüfen
- Konsistenz mit bestehenden Operationen im selben File sicherstellen
- Proaktiv auf Lücken (fehlendes Error-Handling, fehlende Rollbacks) hinweisen

### Build-Check
Immer `npm run build` vor dem Commit ausführen — TypeScript-Fehler dürfen nicht committed werden.

---

## Architektur-Überblick

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Lucide React Icons
- **Backend:** Supabase (PostgreSQL + Realtime WebSocket + REST)
- **State:** Custom Hook `useStore()` in `src/storage.ts` — optimistische Updates mit Rollback
- **Deploy:** Vercel Auto-Deploy aus GitHub `main`
- **PWA:** Service Worker + Web App Manifest, installierbar auf iOS/Android

## Git-Workflow

1. Feature-Branch: `claude/app-sync-rename-cash-count-SJrvs`
2. Commit auf Feature-Branch
3. Fast-Forward Merge auf `main`
4. Push `main` → Vercel deployt automatisch

## Supabase-Tabellen

| Tabelle | Zweck |
|---|---|
| `expenses` | Ausgaben (aktiv + archiviert) |
| `settings` | Personennamen (Singleton, id=1) |
| `kassensturz` | Archivierungszeitpunkte |
| `shopping_items` | Einkaufsliste |

Alle Tabellen: RLS aktiv, anon-Policies für SELECT/INSERT/UPDATE/DELETE.
