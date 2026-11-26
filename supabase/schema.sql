-- STAFF TIMETABLE — skema database Supabase
-- Cara guna: Supabase Dashboard > SQL Editor > New query > tampal semua ini > Run

create table if not exists public.tt_settings (
  owner uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.tt_staff (
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner, id)
);

create table if not exists public.tt_weeks (
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner, id)
);

create table if not exists public.tt_assign (
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_id text not null,
  slot_key text not null,
  staff_id text not null,
  updated_at timestamptz not null default now(),
  primary key (owner, week_id, slot_key)
);

-- Kebenaran akses Data API (projek Supabase baharu tidak memberi secara automatik)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.tt_settings, public.tt_staff, public.tt_weeks, public.tt_assign to authenticated;

-- Keselamatan: setiap akaun hanya boleh baca/tulis data sendiri
alter table public.tt_settings enable row level security;
alter table public.tt_staff    enable row level security;
alter table public.tt_weeks    enable row level security;
alter table public.tt_assign   enable row level security;

drop policy if exists "own settings" on public.tt_settings;
drop policy if exists "own staff" on public.tt_staff;
drop policy if exists "own weeks" on public.tt_weeks;
drop policy if exists "own assign" on public.tt_assign;

create policy "own settings" on public.tt_settings for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own staff"    on public.tt_staff    for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own weeks"    on public.tt_weeks    for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own assign"   on public.tt_assign   for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- Realtime: perubahan terus muncul di semua peranti
alter table public.tt_settings replica identity full;
alter table public.tt_staff    replica identity full;
alter table public.tt_weeks    replica identity full;
alter table public.tt_assign   replica identity full;

do $$
begin
  begin alter publication supabase_realtime add table public.tt_settings; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.tt_staff;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.tt_weeks;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.tt_assign;   exception when duplicate_object then null; end;
end $$;
