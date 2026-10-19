create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  course text not null default '',
  due_date date,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists description text not null default '';

alter table public.tasks enable row level security;

drop policy if exists "Users can view their own tasks" on public.tasks;
create policy "Users can view their own tasks"
  on public.tasks for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks"
  on public.tasks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
  on public.tasks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
  on public.tasks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.tasks to authenticated;

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  course text not null default '',
  description text not null default '',
  kind text not null check (kind in ('class_material', 'past_question')),
  category text not null default 'lecture_notes',
  academic_level text,
  file_name text not null,
  file_path text not null unique,
  uploaded_by uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  uploaded_by_name text not null default 'LASU student',
  created_at timestamptz not null default now()
);

alter table public.resources
  add column if not exists academic_level text;

alter table public.resources
  add column if not exists category text not null default 'lecture_notes';

alter table public.resources
  add column if not exists uploaded_by_name text not null default 'LASU student';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'resources_category_check'
      and conrelid = 'public.resources'::regclass
  ) then
    alter table public.resources
      add constraint resources_category_check
      check (category in ('past_question', 'lecture_notes', 'course_handout', 'study_guide'));
  end if;
end;
$$;

update public.resources
set category = case when kind = 'past_question' then 'past_question' else 'lecture_notes' end
where category not in ('past_question', 'lecture_notes', 'course_handout', 'study_guide')
   or (kind = 'past_question' and category = 'lecture_notes');

update public.resources as resource
set uploaded_by_name = coalesce(
  nullif(left(trim(concat_ws(' ',
    nullif(user_record.raw_user_meta_data ->> 'first_name', ''),
    nullif(user_record.raw_user_meta_data ->> 'last_name', '')
  )), 80), ''),
  'LASU student'
)
from auth.users as user_record
where resource.uploaded_by = user_record.id
  and resource.uploaded_by_name = 'LASU student';

create or replace function public.set_resource_uploader_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.uploaded_by_name := left(
    coalesce(nullif(trim(concat_ws(' ',
      nullif(auth.jwt() -> 'user_metadata' ->> 'first_name', ''),
      nullif(auth.jwt() -> 'user_metadata' ->> 'last_name', '')
    )), ''), 'LASU student'),
    80
  );
  return new;
end;
$$;

drop trigger if exists set_resource_uploader_name on public.resources;
create trigger set_resource_uploader_name
  before insert on public.resources
  for each row execute function public.set_resource_uploader_name();

alter table public.resources enable row level security;

drop policy if exists "Anyone can read shared resources" on public.resources;
create policy "Anyone can read shared resources"
  on public.resources for select
  to anon, authenticated
  using (true);

drop policy if exists "Signed-in users can upload resources" on public.resources;
create policy "Signed-in users can upload resources"
  on public.resources for insert
  to authenticated
  with check ((select auth.uid()) = uploaded_by);

grant select on public.resources to anon, authenticated;
grant insert on public.resources to authenticated;

drop policy if exists "Users can delete their own resources" on public.resources;
create policy "Users can delete their own resources"
  on public.resources for delete
  to authenticated
  using ((select auth.uid()) = uploaded_by);

grant delete on public.resources to authenticated;

create table if not exists public.study_messages (
  id uuid primary key default gen_random_uuid(),
  course text not null check (length(trim(course)) between 1 and 80),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  sender_name text not null default 'Student',
  message_type text not null default 'discussion'
    check (message_type in ('discussion', 'assignment')),
  content text not null check (length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.study_messages enable row level security;

drop policy if exists "Signed-in students can read study room messages" on public.study_messages;
create policy "Signed-in students can read study room messages"
  on public.study_messages for select
  to authenticated
  using (true);

drop policy if exists "Students can post as themselves in study rooms" on public.study_messages;
create policy "Students can post as themselves in study rooms"
  on public.study_messages for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create or replace function public.set_study_message_sender_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.sender_name := left(
    coalesce(auth.jwt() -> 'user_metadata' ->> 'first_name', 'Student'),
    80
  );
  return new;
end;
$$;

drop trigger if exists set_study_message_sender_name on public.study_messages;
create trigger set_study_message_sender_name
  before insert on public.study_messages
  for each row execute function public.set_study_message_sender_name();

grant select, insert on public.study_messages to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_messages'
  ) then
    alter publication supabase_realtime add table public.study_messages;
  end if;
end;
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'student-resources',
  'student-resources',
  true,
  20971520,
  array['application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read shared resource PDFs" on storage.objects;
create policy "Anyone can read shared resource PDFs"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'student-resources');

drop policy if exists "Signed-in users can upload their own resource PDFs" on storage.objects;
create policy "Signed-in users can upload their own resource PDFs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'student-resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own resource PDFs" on storage.objects;
create policy "Users can delete their own resource PDFs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'student-resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

notify pgrst, 'reload schema';


-- Private study groups and member-only discussion.
create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 80),
  course text not null check (length(trim(course)) between 1 and 80),
  description text not null default '' check (length(description) <= 300),
  invite_code uuid not null unique default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.study_group_members (
  group_id uuid not null references public.study_groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.study_group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sender_name text not null default 'LASU student',
  post_type text not null check (post_type in ('discussion', 'question', 'assignment', 'practice')),
  content text not null check (length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists study_group_members_user_group_idx
  on public.study_group_members (user_id, group_id);
create index if not exists study_group_posts_group_created_idx
  on public.study_group_posts (group_id, created_at desc);

alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;
alter table public.study_group_posts enable row level security;

drop policy if exists "Members can view their study groups" on public.study_groups;
create policy "Members can view their study groups"
  on public.study_groups for select to authenticated
  using ((select auth.uid()) = owner_id or exists (
    select 1 from public.study_group_members member
    where member.group_id = study_groups.id and member.user_id = (select auth.uid())
  ));

drop policy if exists "Owners can update their study groups" on public.study_groups;
create policy "Owners can update their study groups"
  on public.study_groups for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can delete their study groups" on public.study_groups;
create policy "Owners can delete their study groups"
  on public.study_groups for delete to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Members can view group memberships" on public.study_group_members;
create policy "Members can view group memberships"
  on public.study_group_members for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Members can leave groups" on public.study_group_members;
create policy "Members can leave groups"
  on public.study_group_members for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Members can read group posts" on public.study_group_posts;
create policy "Members can read group posts"
  on public.study_group_posts for select to authenticated
  using (exists (
    select 1 from public.study_group_members member
    where member.group_id = study_group_posts.group_id
      and member.user_id = (select auth.uid())
  ));

drop policy if exists "Members can post to their groups" on public.study_group_posts;
create policy "Members can post to their groups"
  on public.study_group_posts for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.study_group_members member
      where member.group_id = study_group_posts.group_id
        and member.user_id = (select auth.uid())
    )
  );

create or replace function public.set_study_group_post_sender_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.sender_name := left(coalesce(
    nullif(trim(concat_ws(' ',
      nullif(auth.jwt() -> 'user_metadata' ->> 'first_name', ''),
      nullif(auth.jwt() -> 'user_metadata' ->> 'last_name', '')
    )), ''), 'LASU student'
  ), 80);
  return new;
end;
$$;

drop trigger if exists set_study_group_post_sender_name on public.study_group_posts;
create trigger set_study_group_post_sender_name
  before insert on public.study_group_posts
  for each row execute function public.set_study_group_post_sender_name();

grant select, update, delete on public.study_groups to authenticated;
grant select, delete on public.study_group_members to authenticated;
grant select, insert on public.study_group_posts to authenticated;
drop policy if exists "Owners can add themselves as a member" on public.study_group_members;
drop policy if exists "Students can create study groups" on public.study_groups;
revoke insert on public.study_groups from authenticated;
revoke insert on public.study_group_members from authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'study_group_posts'
  ) then
    alter publication supabase_realtime add table public.study_group_posts;
  end if;
end;
$$;



-- Cover group-owner and group-post author foreign keys.
create index if not exists study_groups_owner_idx
  on public.study_groups (owner_id);

create index if not exists study_group_posts_user_idx
  on public.study_group_posts (user_id);

notify pgrst, 'reload schema';


-- Restrict direct API invocation of the RLS event-trigger function.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

notify pgrst, 'reload schema';
