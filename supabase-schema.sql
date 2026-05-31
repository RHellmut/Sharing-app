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

-- Fixkosten-Tabelle (monatliche Fixkosten, eine Zeile pro Kategorie)
create table if not exists public.fixkosten (
  key            text          primary key,   -- 'miete' | 'gez' | 'strom' | 'internet'
  person1_amount numeric(10,2) not null default 0,
  person2_amount numeric(10,2) not null default 0
);

-- Standardwerte einfügen
insert into public.fixkosten (key, person1_amount, person2_amount) values
  ('miete',    0, 0),
  ('gez',      0, 0),
  ('strom',    0, 0),
  ('internet', 0, 0)
on conflict (key) do nothing;

alter table public.fixkosten enable row level security;

create policy "anon_select_fixkosten" on public.fixkosten for select to anon using (true);
create policy "anon_insert_fixkosten" on public.fixkosten for insert to anon with check (true);
create policy "anon_update_fixkosten" on public.fixkosten for update to anon using (true) with check (true);

-- Verträge-Tabelle (Vertragsdaten für Strom und Internet)
create table if not exists public.vertraege (
  key            text    primary key,   -- 'strom' | 'internet'
  anbieter       text    not null default '',
  vertragsbeginn date,
  vertragsende   date,
  gekuendigt     boolean not null default false,
  neuer_anbieter text    not null default '',
  laeuft_ab      date
);

insert into public.vertraege (key) values ('strom'), ('internet')
on conflict (key) do nothing;

alter table public.vertraege enable row level security;

create policy "anon_select_vertraege" on public.vertraege for select to anon using (true);
create policy "anon_insert_vertraege" on public.vertraege for insert to anon with check (true);
create policy "anon_update_vertraege" on public.vertraege for update to anon using (true) with check (true);

-- Bereiste Länder-Tabelle (Lisl's World Travel)
create table if not exists public.visited_countries (
  country_code text primary key   -- ISO-3166 numeric (z.B. '276') oder Spezial-Code (z.B. 'x-kosovo')
);

alter table public.visited_countries enable row level security;

create policy "anon_select_visited" on public.visited_countries for select to anon using (true);
create policy "anon_insert_visited" on public.visited_countries for insert to anon with check (true);
create policy "anon_delete_visited" on public.visited_countries for delete to anon using (true);

-- Kalender-Tabelle
create table if not exists public.calendar_events (
  id         uuid        primary key default gen_random_uuid(),
  title      text        not null,
  date       date        not null,
  person     text        not null check (person in ('person1', 'person2')),
  notes      text,
  created_at timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

create policy "anon_select_calendar" on public.calendar_events for select to anon using (true);
create policy "anon_insert_calendar" on public.calendar_events for insert to anon with check (true);
create policy "anon_delete_calendar" on public.calendar_events for delete to anon using (true);

-- Realtime aktivieren (Sofort-Sync zwischen den Handys)
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.settings;
alter publication supabase_realtime add table public.kassensturz;
alter publication supabase_realtime add table public.shopping_items;
alter publication supabase_realtime add table public.fixkosten;
alter publication supabase_realtime add table public.vertraege;
alter publication supabase_realtime add table public.visited_countries;
alter publication supabase_realtime add table public.calendar_events;
