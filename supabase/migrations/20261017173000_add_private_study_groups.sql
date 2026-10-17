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

drop policy if exists "Students can create study groups" on public.study_groups;
create policy "Students can create study groups"
  on public.study_groups for insert to authenticated
  with check ((select auth.uid()) = owner_id);

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

drop policy if exists "Owners can add themselves as a member" on public.study_group_members;
create policy "Owners can add themselves as a member"
  on public.study_group_members for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.study_groups study_group
      where study_group.id = study_group_members.group_id
        and study_group.owner_id = (select auth.uid())
    )
  );

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

grant select, insert, update, delete on public.study_groups to authenticated;
grant select, insert, delete on public.study_group_members to authenticated;
grant select, insert on public.study_group_posts to authenticated;

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

notify pgrst, 'reload schema';
