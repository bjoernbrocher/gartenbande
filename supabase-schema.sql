create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null default '',
  nickname text not null default '',
  district text not null default 'Hemmingen-Westerfeld',
  rules_accepted boolean not null default false,
  is_admin boolean not null default false,
  status text not null default 'aktiv' check (status in ('aktiv', 'gesperrt')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('moment', 'plants', 'lend', 'help', 'info', 'events', 'challenge')),
  type text not null default '',
  text text not null,
  district text not null default 'Hemmingen-Westerfeld',
  contact text not null default '',
  image_data text not null default '',
  approved boolean not null default true,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null default 'Nachbar',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.entries enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid() and status = 'aktiv'),
    false
  );
$$;

create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and coalesce(old.is_admin, false) = false then
    new.is_admin = old.is_admin;
    new.status = old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_admin_fields on public.profiles;
create trigger profiles_protect_admin_fields
before update on public.profiles
for each row execute function public.protect_profile_admin_fields();

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "entries_select_visible" on public.entries;
create policy "entries_select_visible"
on public.entries for select
to authenticated
using (approved or user_id = auth.uid() or public.is_admin());

drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own"
on public.entries for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "entries_update_own_or_admin" on public.entries;
create policy "entries_update_own_or_admin"
on public.entries for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "entries_delete_own_or_admin" on public.entries;
create policy "entries_delete_own_or_admin"
on public.entries for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

create index if not exists entries_created_at_idx on public.entries (created_at desc);
create index if not exists entries_kind_idx on public.entries (kind);
create index if not exists entries_district_idx on public.entries (district);

-- Nach der ersten Anmeldung kannst du dich so zum Admin machen:
-- update public.profiles set is_admin = true where email = 'deine-mail@example.de';
