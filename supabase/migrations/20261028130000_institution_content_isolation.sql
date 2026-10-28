-- Keep a server-controlled institution assignment for each account. User
-- metadata is editable by the account owner, so it must not authorize access.
create table if not exists public.student_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  institution_type text not null check (institution_type in ('university', 'polytechnic', 'education', 'monotechnic')),
  institution text not null check (length(trim(institution)) between 1 and 180),
  institution_key text not null,
  created_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;
drop policy if exists "Students can read their own institution profile" on public.student_profiles;
create policy "Students can read their own institution profile"
  on public.student_profiles for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.student_profiles from anon, authenticated;
grant select on public.student_profiles to authenticated;

create or replace function public.current_student_institution_key ()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.institution_key
  from public.student_profiles as profile
  where profile.user_id = (select auth.uid())
$$;

revoke all on function public.current_student_institution_key () from public, anon;
grant execute on function public.current_student_institution_key () to authenticated;

create or replace function public.institution_key (institution_type text, institution_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(trim(institution_type)) || ':' || case
    when lower(trim(institution_type)) = 'university'
      and lower(trim(regexp_replace(institution_name, '\s+', ' ', 'g')))
        ~ '^lagos state university( \(lasu\))?(, ojo(, lagos)?)?$'
      then 'lagos state university (lasu), ojo'
    else lower(trim(regexp_replace(institution_name, '\s+', ' ', 'g')))
  end
$$;

create or replace function public.notify_resource_upload ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.app_notifications (recipient_id, resource_id, type, message)
  select moderator.user_id, new.id, 'resource_uploaded',
    'New upload awaiting review: ' || left(new.title, 350)
  from public.resource_moderators moderator
  join public.student_profiles profile on profile.user_id = moderator.user_id
  where profile.institution_key = new.institution_key;
  return new;
end;
$$;

create or replace function public.create_student_institution_profile ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_type text := lower(trim(coalesce(new.raw_user_meta_data ->> 'institution_type', 'university')));
  chosen_name text := trim(regexp_replace(coalesce(new.raw_user_meta_data ->> 'institution', ''), '\s+', ' ', 'g'));
begin
  if chosen_type not in ('university', 'polytechnic', 'education', 'monotechnic') then
    chosen_type := 'university';
  end if;
  if chosen_name = '' then
    chosen_type := 'university';
    chosen_name := 'Lagos State University (LASU), Ojo';
  end if;
  insert into public.student_profiles (user_id, institution_type, institution, institution_key)
  values (
    new.id,
    chosen_type,
    chosen_name,
    public.institution_key(chosen_type, chosen_name)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_student_institution_profile () from public, anon, authenticated;
drop trigger if exists create_student_institution_profile on auth.users;
create trigger create_student_institution_profile
  after insert on auth.users
  for each row execute function public.create_student_institution_profile();

-- Existing LASU hub records and legacy accounts stay in the LASU tenant.
insert into public.student_profiles (user_id, institution_type, institution, institution_key)
select
  account.id,
  case when lower(coalesce(account.raw_user_meta_data ->> 'institution_type', ''))
    in ('university', 'polytechnic', 'education', 'monotechnic')
    then lower(account.raw_user_meta_data ->> 'institution_type') else 'university' end,
  coalesce(nullif(left(trim(regexp_replace(account.raw_user_meta_data ->> 'institution', '\s+', ' ', 'g')), 180), ''), 'Lagos State University (LASU), Ojo'),
  public.institution_key(
    case when lower(coalesce(account.raw_user_meta_data ->> 'institution_type', ''))
    in ('university', 'polytechnic', 'education', 'monotechnic')
    then lower(account.raw_user_meta_data ->> 'institution_type') else 'university' end,
    coalesce(nullif(left(trim(regexp_replace(account.raw_user_meta_data ->> 'institution', '\s+', ' ', 'g')), 180), ''), 'Lagos State University (LASU), Ojo')
  )
from auth.users as account
on conflict (user_id) do nothing;

alter table public.resources
  add column if not exists institution_key text not null default 'university:lagos state university (lasu), ojo';
update public.resources resource
set institution_key = profile.institution_key
from public.student_profiles profile
where profile.user_id = resource.uploaded_by;

drop policy if exists "Users can read their notifications" on public.app_notifications;
create policy "Students can read their institution notifications"
  on public.app_notifications for select to authenticated
  using (
    recipient_id = (select auth.uid())
    and (
      (resource_id is null and type <> 'resource_uploaded')
      or exists (
        select 1 from public.resources resource
        where resource.id = app_notifications.resource_id
          and resource.institution_key = (select public.current_student_institution_key())
      )
    )
  );
drop policy if exists "Users can mark their notifications read" on public.app_notifications;
create policy "Students can mark their institution notifications read"
  on public.app_notifications for update to authenticated
  using (
    recipient_id = (select auth.uid())
    and exists (
      select 1 from public.resources resource
      where resource.id = app_notifications.resource_id
        and resource.institution_key = (select public.current_student_institution_key())
    )
  )
  with check (recipient_id = (select auth.uid()));

create or replace function public.set_resource_institution_key ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select profile.institution_key into new.institution_key
  from public.student_profiles as profile
  where profile.user_id = new.uploaded_by;
  if new.institution_key is null then
    raise exception 'A valid institution profile is required to share resources.';
  end if;
  return new;
end;
$$;

drop trigger if exists set_resource_institution_key on public.resources;
create trigger set_resource_institution_key
  before insert on public.resources
  for each row execute function public.set_resource_institution_key();

drop policy if exists "Anyone can read shared resources" on public.resources;
drop policy if exists "Students can read approved resources and their own uploads" on public.resources;
create policy "Students can read resources from their institution"
  on public.resources for select to authenticated
  using (
    institution_key = (select public.current_student_institution_key())
    and (
      status = 'approved'
      or uploaded_by = (select auth.uid())
      or exists (select 1 from public.resource_moderators moderator where moderator.user_id = (select auth.uid()))
    )
  );

drop policy if exists "Resource moderators can update any resource" on public.resources;
drop policy if exists "Resource moderators can review uploads" on public.resources;
drop policy if exists "Users can update their own resources" on public.resources;
create policy "Students can update their own resources at their institution"
  on public.resources for update to authenticated
  using (
    uploaded_by = (select auth.uid())
    and institution_key = (select public.current_student_institution_key())
  )
  with check (
    uploaded_by = (select auth.uid())
    and institution_key = (select public.current_student_institution_key())
  );
create policy "Institution moderators can update their resources"
  on public.resources for update to authenticated
  using (
    institution_key = (select public.current_student_institution_key())
    and exists (select 1 from public.resource_moderators moderator where moderator.user_id = (select auth.uid()))
  )
  with check (
    institution_key = (select public.current_student_institution_key())
    and exists (select 1 from public.resource_moderators moderator where moderator.user_id = (select auth.uid()))
  );

drop policy if exists "Resource moderators can delete resources" on public.resources;
drop policy if exists "Users can delete their own resources" on public.resources;
create policy "Students can delete their own resources at their institution"
  on public.resources for delete to authenticated
  using (
    uploaded_by = (select auth.uid())
    and institution_key = (select public.current_student_institution_key())
  );
create policy "Institution moderators can delete their resources"
  on public.resources for delete to authenticated
  using (
    institution_key = (select public.current_student_institution_key())
    and exists (select 1 from public.resource_moderators moderator where moderator.user_id = (select auth.uid()))
  );

drop policy if exists "Anyone can read shared resource PDFs" on storage.objects;
drop policy if exists "Students can read approved and owned resource PDFs" on storage.objects;
drop policy if exists "Students can read approved and pending owned resource PDFs" on storage.objects;
create policy "Students can read PDFs from their institution"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'student-resources'
    and exists (
      select 1 from public.resources resource
      where resource.file_path = name
        and resource.institution_key = (select public.current_student_institution_key())
        and (
          resource.status = 'approved'
          or resource.uploaded_by = (select auth.uid())
          or exists (select 1 from public.resource_moderators moderator where moderator.user_id = (select auth.uid()))
        )
    )
  );

drop policy if exists "Resource moderators can delete resource PDFs" on storage.objects;
create policy "Institution moderators can delete resource PDFs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'student-resources'
    and exists (
      select 1 from public.resources resource
      where resource.file_path = name
        and resource.institution_key = (select public.current_student_institution_key())
        and exists (select 1 from public.resource_moderators moderator where moderator.user_id = (select auth.uid()))
    )
  );

update storage.buckets
set public = false
where id = 'student-resources';

alter table public.study_groups
  add column if not exists institution_key text not null default 'university:lagos state university (lasu), ojo';
update public.study_groups study_group
set institution_key = profile.institution_key
from public.student_profiles profile
where profile.user_id = study_group.owner_id;

create or replace function public.set_study_group_institution_key ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select profile.institution_key into new.institution_key
  from public.student_profiles as profile
  where profile.user_id = new.owner_id;
  if new.institution_key is null then
    raise exception 'A valid institution profile is required to create a group.';
  end if;
  return new;
end;
$$;

drop trigger if exists set_study_group_institution_key on public.study_groups;
create trigger set_study_group_institution_key
  before insert on public.study_groups
  for each row execute function public.set_study_group_institution_key();

create or replace function public.prevent_study_group_tenant_change ()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.institution_key is distinct from old.institution_key or new.owner_id is distinct from old.owner_id then
    raise exception 'A study group owner and institution cannot be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_study_group_tenant_change on public.study_groups;
create trigger prevent_study_group_tenant_change
  before update on public.study_groups
  for each row execute function public.prevent_study_group_tenant_change();

create or replace function public.enforce_study_group_member_institution ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_institution text;
  group_institution text;
begin
  select profile.institution_key into member_institution
  from public.student_profiles profile where profile.user_id = new.user_id;
  select study_group.institution_key into group_institution
  from public.study_groups study_group where study_group.id = new.group_id;
  if member_institution is null or group_institution is null or member_institution <> group_institution then
    raise exception 'Study group invitations are limited to students at the same institution.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_study_group_member_institution on public.study_group_members;
create trigger enforce_study_group_member_institution
  before insert or update on public.study_group_members
  for each row execute function public.enforce_study_group_member_institution();

drop policy if exists "Members can view their study groups" on public.study_groups;
create policy "Members can view groups at their institution"
  on public.study_groups for select to authenticated
  using (
    institution_key = (select public.current_student_institution_key())
    and ((select auth.uid()) = owner_id or exists (
      select 1 from public.study_group_members member
      where member.group_id = study_groups.id and member.user_id = (select auth.uid())
    ))
  );

drop policy if exists "Members can read group posts" on public.study_group_posts;
create policy "Members can read posts at their institution"
  on public.study_group_posts for select to authenticated
  using (exists (
    select 1 from public.study_group_members member
    join public.study_groups study_group on study_group.id = member.group_id
    where member.group_id = study_group_posts.group_id
      and member.user_id = (select auth.uid())
      and study_group.institution_key = (select public.current_student_institution_key())
  ));

drop policy if exists "Members can post to their groups" on public.study_group_posts;
create policy "Members can post to groups at their institution"
  on public.study_group_posts for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.study_group_members member
      join public.study_groups study_group on study_group.id = member.group_id
      where member.group_id = study_group_posts.group_id
        and member.user_id = (select auth.uid())
        and study_group.institution_key = (select public.current_student_institution_key())
    )
  );

alter table public.study_rooms
  add column if not exists institution_key text not null default 'university:lagos state university (lasu), ojo';
update public.study_rooms room
set institution_key = profile.institution_key
from public.student_profiles profile
where profile.user_id = room.created_by;
alter table public.study_messages
  add column if not exists institution_key text not null default 'university:lagos state university (lasu), ojo';
update public.study_messages message
set institution_key = profile.institution_key
from public.student_profiles profile
where profile.user_id = message.user_id;

alter table public.study_messages drop constraint if exists study_messages_course_room_fkey;
do $$
declare primary_key_name text;
begin
  select constraint_row.conname into primary_key_name
  from pg_constraint constraint_row
  where constraint_row.conrelid = 'public.study_rooms'::regclass and constraint_row.contype = 'p';
  if primary_key_name is not null then
    execute format('alter table public.study_rooms drop constraint %I', primary_key_name);
  end if;
end;
$$;
insert into public.study_rooms (institution_key, course, created_by, created_at)
select distinct on (message.institution_key, message.course)
  message.institution_key, message.course, message.user_id, message.created_at
from public.study_messages message
where not exists (
  select 1 from public.study_rooms room
  where room.institution_key = message.institution_key and room.course = message.course
)
order by message.institution_key, message.course, message.created_at, message.id;
alter table public.study_rooms add constraint study_rooms_pkey primary key (institution_key, course);
alter table public.study_messages
  add constraint study_messages_course_room_fkey
  foreign key (institution_key, course)
  references public.study_rooms (institution_key, course) on delete cascade;

create or replace function public.set_study_room_institution_key ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select profile.institution_key into new.institution_key
  from public.student_profiles as profile
  where profile.user_id = coalesce(new.created_by, (select auth.uid()));
  if new.institution_key is null then
    raise exception 'A valid institution profile is required to open a study room.';
  end if;
  return new;
end;
$$;

create or replace function public.set_study_message_institution_key ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select profile.institution_key into new.institution_key
  from public.student_profiles as profile
  where profile.user_id = new.user_id;
  if new.institution_key is null then
    raise exception 'A valid institution profile is required to post in a study room.';
  end if;
  return new;
end;
$$;

drop trigger if exists set_study_room_institution_key on public.study_rooms;
create trigger set_study_room_institution_key
  before insert on public.study_rooms
  for each row execute function public.set_study_room_institution_key();
drop trigger if exists set_study_message_institution_key on public.study_messages;
create trigger set_study_message_institution_key
  before insert on public.study_messages
  for each row execute function public.set_study_message_institution_key();

drop policy if exists "Signed-in students can view live course rooms" on public.study_rooms;
create policy "Students can view their institution course rooms"
  on public.study_rooms for select to authenticated
  using (institution_key = (select public.current_student_institution_key()));
drop policy if exists "Students can open one room per course" on public.study_rooms;
create policy "Students can open rooms at their institution"
  on public.study_rooms for insert to authenticated
  with check (institution_key = (select public.current_student_institution_key()) and created_by = (select auth.uid()));
drop policy if exists "Admins can delete live course rooms" on public.study_rooms;
create policy "Institution moderators can delete course rooms"
  on public.study_rooms for delete to authenticated
  using (
    institution_key = (select public.current_student_institution_key())
    and exists (select 1 from public.resource_moderators moderator where moderator.user_id = (select auth.uid()))
  );

drop policy if exists "Students can read messages in open course rooms" on public.study_messages;
create policy "Students can read messages at their institution"
  on public.study_messages for select to authenticated
  using (
    institution_key = (select public.current_student_institution_key())
    and exists (
      select 1 from public.study_rooms room
      where room.institution_key = study_messages.institution_key and room.course = study_messages.course
    )
  );
drop policy if exists "Students can post in open course rooms as themselves" on public.study_messages;
create policy "Students can post messages at their institution"
  on public.study_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and institution_key = (select public.current_student_institution_key())
    and exists (
      select 1 from public.study_rooms room
      where room.institution_key = study_messages.institution_key and room.course = study_messages.course
    )
  );

drop policy if exists "Signed-in users can view course chat images" on storage.objects;
create policy "Students can view institution study room images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'study-chat-images'
    and (storage.foldername(name))[1] = 'rooms'
    and exists (
      select 1 from public.study_messages message
      where message.image_path = name
        and message.institution_key = (select public.current_student_institution_key())
    )
  );

drop policy if exists "Group members can view group chat images" on storage.objects;
create policy "Group members can view institution group images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'study-chat-images'
    and (storage.foldername(name))[1] = 'groups'
    and exists (
      select 1 from public.study_group_members member
      join public.study_groups study_group on study_group.id = member.group_id
      where member.group_id::text = (storage.foldername(name))[2]
        and member.user_id = (select auth.uid())
        and study_group.institution_key = (select public.current_student_institution_key())
    )
  );

drop policy if exists "Group members can upload group chat images" on storage.objects;
create policy "Group members can upload institution group images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'study-chat-images'
    and (storage.foldername(name))[1] = 'groups'
    and (storage.foldername(name))[3] = (select auth.uid())::text
    and exists (
      select 1 from public.study_group_members member
      join public.study_groups study_group on study_group.id = member.group_id
      where member.group_id::text = (storage.foldername(name))[2]
        and member.user_id = (select auth.uid())
        and study_group.institution_key = (select public.current_student_institution_key())
    )
  );

-- Realtime presence topics are private and may only be joined by members of
-- the institution encoded in the topic name.
drop policy if exists "Students can use presence for their institution study rooms" on realtime.messages;
create policy "Students can use presence for their institution study rooms"
  on realtime.messages for all to authenticated
  using (
    left(realtime.topic(), length('study-room:' || (select public.current_student_institution_key()) || ':'))
      = 'study-room:' || (select public.current_student_institution_key()) || ':'
  )
  with check (
    left(realtime.topic(), length('study-room:' || (select public.current_student_institution_key()) || ':'))
      = 'study-room:' || (select public.current_student_institution_key()) || ':'
  );

notify pgrst, 'reload schema';
