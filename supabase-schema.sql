-- ============================================================
-- Kosten-Teilen App – Supabase Datenbankschema
--
-- Diese SQL bitte im Supabase SQL-Editor ausführen:
-- Dashboard → SQL Editor → New Query → einfügen → "Run"
-- ============================================================

-- Ausgaben-Tabelle
create table if not exists public.expenses (
  id            uuid          primary key default gen_random_uuid(),
  description   text          not null,
  amount        numeric(10,2) not null,
  category_id   text          not null,
  paid_by       text          not null,
  split_ratio   numeric(5,4)  not null,
  date          date          not null,
  receipt_image text,
  notes         text,
  created_at    timestamptz   not null default now()
);

-- Einstellungen-Tabelle (immer genau eine Zeile)
create table if not exists public.settings (
  id            smallint primary key default 1,
  person1_name  text not null default 'Du',
  person2_name  text not null default 'Freundin',
  check (id = 1)
);

-- Standard-Einstellungen einfügen
insert into public.settings (id, person1_name, person2_name)
values (1, 'Du', 'Freundin')
on conflict (id) do nothing;

-- Row Level Security aktivieren
alter table public.expenses enable row level security;
alter table public.settings enable row level security;

-- Zugriffsrechte für den anon-Key
-- (beide Personen teilen denselben Key – für eine Privatapp ausreichend)
create policy "anon_select_expenses" on public.expenses
  for select to anon using (true);

create policy "anon_insert_expenses" on public.expenses
  for insert to anon with check (true);

create policy "anon_delete_expenses" on public.expenses
  for delete to anon using (true);

create policy "anon_select_settings" on public.settings
  for select to anon using (true);

create policy "anon_update_settings" on public.settings
  for update to anon using (true) with check (true);

-- Realtime aktivieren (Sofort-Sync zwischen den Handys)
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.settings;
