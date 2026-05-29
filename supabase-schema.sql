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
  person1_name  text not null default 'René',
  person2_name  text not null default 'Lisa',
  check (id = 1)
);

-- Kassensturz-Tabelle (ein Eintrag pro Kassensturz)
create table if not exists public.kassensturz (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Standard-Einstellungen einfügen / auf René & Lisa aktualisieren
insert into public.settings (id, person1_name, person2_name)
values (1, 'René', 'Lisa')
on conflict (id) do update set person1_name = 'René', person2_name = 'Lisa';

-- Row Level Security aktivieren
alter table public.expenses enable row level security;
alter table public.settings enable row level security;
alter table public.kassensturz enable row level security;

-- Zugriffsrechte für den anon-Key (Ausgaben)
create policy "anon_select_expenses" on public.expenses
  for select to anon using (true);

create policy "anon_insert_expenses" on public.expenses
  for insert to anon with check (true);

create policy "anon_delete_expenses" on public.expenses
  for delete to anon using (true);

-- Zugriffsrechte für den anon-Key (Einstellungen)
create policy "anon_select_settings" on public.settings
  for select to anon using (true);

create policy "anon_update_settings" on public.settings
  for update to anon using (true) with check (true);

-- Zugriffsrechte für den anon-Key (Kassensturz)
create policy "anon_select_kassensturz" on public.kassensturz
  for select to anon using (true);

create policy "anon_insert_kassensturz" on public.kassensturz
  for insert to anon with check (true);

create policy "anon_delete_kassensturz" on public.kassensturz
  for delete to anon using (true);

-- Einkaufsliste-Tabelle
create table if not exists public.shopping_items (
  id         uuid        primary key default gen_random_uuid(),
  text       text        not null,
  checked    boolean     not null default false,
  created_at timestamptz not null default now()
);

alter table public.shopping_items enable row level security;

create policy "anon_select_shopping"  on public.shopping_items for select to anon using (true);
create policy "anon_insert_shopping"  on public.shopping_items for insert to anon with check (true);
create policy "anon_update_shopping"  on public.shopping_items for update to anon using (true) with check (true);
create policy "anon_delete_shopping"  on public.shopping_items for delete to anon using (true);

-- Realtime aktivieren (Sofort-Sync zwischen den Handys)
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.settings;
alter publication supabase_realtime add table public.kassensturz;
alter publication supabase_realtime add table public.shopping_items;
