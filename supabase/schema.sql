-- Run once in the Supabase SQL editor. The anon key is safe to expose; never expose a service role key.
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination text not null check (char_length(destination) between 1 and 120),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint trip_dates check (end_date >= start_date)
);
create index if not exists trips_user_id_idx on public.trips(user_id);
alter table public.trips enable row level security;
revoke all on public.trips from anon;
grant select, insert, update, delete on public.trips to authenticated;
create policy "own trips select" on public.trips for select to authenticated using ((select auth.uid()) = user_id);
create policy "own trips insert" on public.trips for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own trips update" on public.trips for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own trips delete" on public.trips for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  type text not null check (type in ('flight','hotel','activity')),
  title text not null check (char_length(title) between 1 and 120),
  start_at timestamp without time zone not null,
  end_at timestamp without time zone,
  location text not null default '' check (char_length(location) <= 180),
  address text not null default '' check (char_length(address) <= 240),
  reference text not null default '' check (char_length(reference) <= 80),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  constraint booking_dates check (end_at is null or end_at >= start_at)
);
create index if not exists bookings_trip_id_start_at_idx on public.bookings(trip_id, start_at);
alter table public.bookings enable row level security;
revoke all on public.bookings from anon;
grant select, insert, update, delete on public.bookings to authenticated;
create policy "own bookings select" on public.bookings for select to authenticated using (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
);
create policy "own bookings insert" on public.bookings for insert to authenticated with check (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
);
create policy "own bookings update" on public.bookings for update to authenticated using (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
);
create policy "own bookings delete" on public.bookings for delete to authenticated using (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
);

-- Atomic daily quota prevents unbounded model spend for authenticated users.
create table if not exists public.import_quota (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  used integer not null default 0,
  primary key (user_id, day)
);
revoke all on public.import_quota from anon, authenticated;
create or replace function public.claim_import_quota()
returns boolean language plpgsql security definer set search_path = '' as $$
declare claimed integer;
begin
  if auth.uid() is null then return false; end if;
  insert into public.import_quota (user_id, day, used) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set used = public.import_quota.used + 1
  where public.import_quota.used < 10
  returning used into claimed;
  return claimed is not null;
end;
$$;
revoke all on function public.claim_import_quota() from public, anon;
grant execute on function public.claim_import_quota() to authenticated;

-- A saved daily plan belongs to the trip owner.
create table if not exists public.itineraries (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  pace text not null check (pace in ('rest', 'balanced', 'active')),
  days jsonb not null check (jsonb_typeof(days) = 'array'),
  booking_signature text not null,
  generated_at timestamptz not null default now()
);
alter table public.itineraries enable row level security;
revoke all on public.itineraries from anon;
grant select, insert, update, delete on public.itineraries to authenticated;
create policy "own itineraries select" on public.itineraries for select to authenticated using (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
);
create policy "own itineraries insert" on public.itineraries for insert to authenticated with check (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
);
create policy "own itineraries update" on public.itineraries for update to authenticated using (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
);
create policy "own itineraries delete" on public.itineraries for delete to authenticated using (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
);
