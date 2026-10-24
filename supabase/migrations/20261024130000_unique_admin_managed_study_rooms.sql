-- Model each course room as one canonical, reusable record. A normalized course
-- code is the primary key, so concurrent students cannot create duplicates.
create table if not exists public.study_rooms (
  course text primary key
    check (
      length(course) between 1 and 80
      and course = upper(regexp_replace(btrim(course), '\s+', ' ', 'g'))
    ),
  created_by uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.study_rooms enable row level security;

drop policy if exists "Signed-in students can view live course rooms" on public.study_rooms;
create policy "Signed-in students can view live course rooms"
  on public.study_rooms for select
  to authenticated
  using (true);

drop policy if exists "Students can open one room per course" on public.study_rooms;
create policy "Students can open one room per course"
  on public.study_rooms for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

drop policy if exists "Admins can delete live course rooms" on public.study_rooms;
create policy "Admins can delete live course rooms"
  on public.study_rooms for delete
  to authenticated
  using (exists (
    select 1 from public.resource_moderators as moderator
    where moderator.user_id = (select auth.uid())
  ));

grant select, insert, delete on public.study_rooms to authenticated;

-- Preserve existing chats while coalescing differently cased/spaced course
-- names into the same canonical room.
update public.study_messages
set course = upper(regexp_replace(btrim(course), '\s+', ' ', 'g'))
where course <> upper(regexp_replace(btrim(course), '\s+', ' ', 'g'));

insert into public.study_rooms (course, created_by, created_at)
select distinct on (course) course, user_id, created_at
from public.study_messages
order by course, created_at, id
on conflict (course) do nothing;

alter table public.study_messages
  drop constraint if exists study_messages_course_room_fkey;
alter table public.study_messages
  add constraint study_messages_course_room_fkey
  foreign key (course) references public.study_rooms (course) on delete cascade;

drop policy if exists "Signed-in students can read study room messages" on public.study_messages;
create policy "Students can read messages in open course rooms"
  on public.study_messages for select
  to authenticated
  using (exists (
    select 1 from public.study_rooms as room
    where room.course = study_messages.course
  ));

drop policy if exists "Students can post as themselves in study rooms" on public.study_messages;
create policy "Students can post in open course rooms as themselves"
  on public.study_messages for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.study_rooms as room
      where room.course = study_messages.course
    )
  );

alter table public.study_rooms replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_rooms'
  ) then
    alter publication supabase_realtime add table public.study_rooms;
  end if;
end;
$$;

notify pgrst, 'reload schema';
