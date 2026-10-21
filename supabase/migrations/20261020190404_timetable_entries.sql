create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  course text not null default '' check (char_length(course) <= 120),
  location text not null default '' check (char_length(location) <= 120),
  notes text not null default '' check (char_length(notes) <= 500),
  repeats_weekly boolean not null default true,
  day_of_week smallint,
  event_date date,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint timetable_entry_time_range check (end_time > start_time),
  constraint timetable_entry_schedule_type check (
    (repeats_weekly and day_of_week between 0 and 6 and event_date is null)
    or (not repeats_weekly and day_of_week is null and event_date is not null)
  )
);

create index if not exists timetable_entries_user_day_time_idx
  on public.timetable_entries (user_id, day_of_week, start_time)
  where repeats_weekly;

create index if not exists timetable_entries_user_date_time_idx
  on public.timetable_entries (user_id, event_date, start_time)
  where not repeats_weekly;

alter table public.timetable_entries enable row level security;

grant select, insert, update, delete on public.timetable_entries to authenticated;

create policy "Students can view their timetable entries"
  on public.timetable_entries for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students can add their timetable entries"
  on public.timetable_entries for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Students can update their timetable entries"
  on public.timetable_entries for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Students can delete their timetable entries"
  on public.timetable_entries for delete
  to authenticated
  using ((select auth.uid()) = user_id);
