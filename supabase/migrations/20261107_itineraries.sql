-- Run in existing Supabase projects after the V1 schema.
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
