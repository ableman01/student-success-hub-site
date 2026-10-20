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
alter table public.resources
  add column if not exists status text not null default 'approved',
  add column if not exists reviewed_at timestamptz;

alter table public.resources
  alter column status set default 'pending';

alter table public.resources
  drop constraint if exists resources_status_check;
alter table public.resources
  add constraint resources_status_check
  check (status in ('pending', 'approved', 'rejected'));
alter table public.resources
  drop constraint if exists resources_category_check;
alter table public.resources
  add constraint resources_category_check
  check (category in ('past_question', 'lecture_notes', 'course_handout', 'study_guide', 'assignment'));

create table if not exists public.resource_moderators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.resource_moderators enable row level security;
drop policy if exists "Moderators can view their own role" on public.resource_moderators;
create policy "Moderators can view their own role"
  on public.resource_moderators for select
  to authenticated
  using ((select auth.uid()) = user_id);
grant select on public.resource_moderators to anon, authenticated;

insert into public.resource_moderators (user_id)
select id from auth.users where id = '4b49e7de-d90c-47a2-bd92-23bcddf9afd8'
on conflict (user_id) do nothing;

drop policy if exists "Users can view their own tasks" on public.tasks;
create policy "Students and creators can view tasks"
  on public.tasks for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.resource_moderators as moderator
      where moderator.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own tasks" on public.tasks;
drop policy if exists "Students can delete their own tasks" on public.tasks;
drop policy if exists "Resource moderators can delete tasks" on public.tasks;
create policy "Resource moderators can delete tasks"
  on public.tasks for delete
  to authenticated
  using (exists (
    select 1 from public.resource_moderators as moderator
    where moderator.user_id = (select auth.uid())
  ));

drop policy if exists "Users can delete their own resources" on public.resources;
drop policy if exists "Resource moderators can delete resources" on public.resources;
create policy "Resource moderators can delete resources"
  on public.resources for delete
  to authenticated
  using (exists (
    select 1 from public.resource_moderators as moderator
    where moderator.user_id = (select auth.uid())
  ));

drop policy if exists "Users can delete their own resource PDFs" on storage.objects;
drop policy if exists "Resource moderators can delete resource PDFs" on storage.objects;
create policy "Resource moderators can delete resource PDFs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'student-resources'
    and exists (
      select 1 from public.resource_moderators as moderator
      where moderator.user_id = (select auth.uid())
    )
  );

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  resource_id uuid references public.resources (id) on delete set null,
  type text not null check (type in ('resource_uploaded', 'resource_approved', 'resource_rejected')),
  message text not null check (length(message) <= 500),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists app_notifications_recipient_created_idx
  on public.app_notifications (recipient_id, created_at desc);
create index if not exists app_notifications_resource_id_idx
  on public.app_notifications (resource_id);

alter table public.app_notifications enable row level security;
drop policy if exists "Users can read their notifications" on public.app_notifications;
create policy "Users can read their notifications"
  on public.app_notifications for select
  to authenticated
  using ((select auth.uid()) = recipient_id);
drop policy if exists "Users can mark their notifications read" on public.app_notifications;
create policy "Users can mark their notifications read"
  on public.app_notifications for update
  to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);
grant select on public.app_notifications to authenticated;
grant update (is_read) on public.app_notifications to authenticated;

create or replace function public.notify_resource_upload()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.app_notifications (recipient_id, resource_id, type, message)
  select moderator.user_id, new.id, 'resource_uploaded',
    'New upload awaiting review: ' || left(new.title, 350)
  from public.resource_moderators as moderator;
  return new;
end;
$$;

revoke all on function public.notify_resource_upload() from public, anon, authenticated;
drop trigger if exists notify_resource_upload on public.resources;
create trigger notify_resource_upload
  after insert on public.resources
  for each row execute function public.notify_resource_upload();

create or replace function public.notify_resource_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status in ('approved', 'rejected') then
    insert into public.app_notifications (recipient_id, resource_id, type, message)
    values (
      new.uploaded_by,
      new.id,
      case when new.status = 'approved' then 'resource_approved' else 'resource_rejected' end,
      'Your upload "' || left(new.title, 300) || '" was '
        || case when new.status = 'approved' then 'approved and is now available to students.'
                else 'not approved. Please review it and upload a corrected copy if needed.' end
    );
  end if;
  return new;
end;
$$;

revoke all on function public.notify_resource_review() from public, anon, authenticated;
drop trigger if exists notify_resource_review on public.resources;
create trigger notify_resource_review
  after update of status on public.resources
  for each row execute function public.notify_resource_review();

drop policy if exists "Anyone can read shared resources" on public.resources;
create policy "Students can read approved resources and their own uploads"
  on public.resources for select
  to anon, authenticated
  using (
    status = 'approved'
    or (select auth.uid()) = uploaded_by
    or exists (
      select 1 from public.resource_moderators as moderator
      where moderator.user_id = (select auth.uid())
    )
  );

drop policy if exists "Resource moderators can review uploads" on public.resources;
create policy "Resource moderators can review uploads"
  on public.resources for update
  to authenticated
  using (exists (
    select 1 from public.resource_moderators as moderator
    where moderator.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.resource_moderators as moderator
    where moderator.user_id = (select auth.uid())
  ));
grant update (status, reviewed_at) on public.resources to authenticated;

update storage.buckets
set public = false
where id = 'student-resources';

drop policy if exists "Anyone can read shared resource PDFs" on storage.objects;
create policy "Students can read approved and owned resource PDFs"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'student-resources'
    and exists (
      select 1 from public.resources as resource
      where resource.file_path = name
        and (
          resource.status = 'approved'
          or resource.uploaded_by = (select auth.uid())
          or exists (
            select 1 from public.resource_moderators as moderator
            where moderator.user_id = (select auth.uid())
          )
        )
    )
  );

create table if not exists public.saved_resources (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  resource_id uuid not null
    references public.resources (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create index if not exists saved_resources_resource_id_idx
  on public.saved_resources (resource_id);

alter table public.saved_resources enable row level security;

drop policy if exists "Students can view their saved resources" on public.saved_resources;
create policy "Students can view their saved resources"
  on public.saved_resources for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Students can save approved resources" on public.saved_resources;
create policy "Students can save approved resources"
  on public.saved_resources for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.resources as resource
      where resource.id = resource_id
        and resource.status = 'approved'
    )
  );

drop policy if exists "Students can remove their saved resources" on public.saved_resources;
create policy "Students can remove their saved resources"
  on public.saved_resources for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.saved_resources from anon;
grant select, insert, delete on table public.saved_resources to authenticated;

notify pgrst, 'reload schema';

-- Private image attachments for course and group study chats.
alter table public.study_messages
  add column if not exists image_path text;
alter table public.study_group_posts
  add column if not exists image_path text;
alter table public.study_messages
  drop constraint if exists study_messages_content_check,
  add constraint study_messages_content_check
    check (length(trim(content)) <= 2000 and (length(trim(content)) > 0 or image_path is not null));
alter table public.study_group_posts
  drop constraint if exists study_group_posts_content_check,
  add constraint study_group_posts_content_check
    check (length(trim(content)) <= 2000 and (length(trim(content)) > 0 or image_path is not null));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('study-chat-images', 'study-chat-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Signed-in users can view course chat images" on storage.objects;
create policy "Signed-in users can view course chat images"
  on storage.objects for select to authenticated
  using (bucket_id = 'study-chat-images' and (storage.foldername(name))[1] = 'rooms');
drop policy if exists "Signed-in users can upload course chat images" on storage.objects;
create policy "Signed-in users can upload course chat images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'study-chat-images' and (storage.foldername(name))[1] = 'rooms' and (storage.foldername(name))[2] = (select auth.uid())::text);
drop policy if exists "Group members can view group chat images" on storage.objects;
create policy "Group members can view group chat images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'study-chat-images' and (storage.foldername(name))[1] = 'groups'
    and exists (select 1 from public.study_group_members member where member.group_id::text = (storage.foldername(name))[2] and member.user_id = (select auth.uid()))
  );
drop policy if exists "Group members can upload group chat images" on storage.objects;
create policy "Group members can upload group chat images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'study-chat-images' and (storage.foldername(name))[1] = 'groups'
    and (storage.foldername(name))[3] = (select auth.uid())::text
    and exists (select 1 from public.study_group_members member where member.group_id::text = (storage.foldername(name))[2] and member.user_id = (select auth.uid()))
  );
drop policy if exists "Users can delete their own study chat images" on storage.objects;
create policy "Users can delete their own study chat images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'study-chat-images' and (
      ((storage.foldername(name))[1] = 'rooms' and (storage.foldername(name))[2] = (select auth.uid())::text)
      or ((storage.foldername(name))[1] = 'groups' and (storage.foldername(name))[3] = (select auth.uid())::text)
    )
  );

-- Keep rejected uploads out of student resources and show the reviewer's reason.
alter table public.resources
  add column if not exists review_comment text;
alter table public.resources
  drop constraint if exists resources_review_comment_length_check,
  add constraint resources_review_comment_length_check
    check (review_comment is null or length(review_comment) <= 400);
grant update (status, reviewed_at, review_comment) on public.resources to authenticated;

create or replace function public.require_resource_rejection_reason()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status = 'rejected'
    and nullif(trim(new.review_comment), '') is null then
    raise exception 'Add a reviewer comment before rejecting this upload.';
  end if;
  return new;
end;
$$;
revoke all on function public.require_resource_rejection_reason() from public, anon, authenticated;
drop trigger if exists require_resource_rejection_reason on public.resources;
create trigger require_resource_rejection_reason
  before update of status on public.resources
  for each row execute function public.require_resource_rejection_reason();

create or replace function public.notify_resource_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_message text;
begin
  if old.status is distinct from new.status and new.status in ('approved', 'rejected') then
    notification_message := case
      when new.status = 'rejected' then
        'Your upload "' || left(new.title, 100) || '" was not approved. Reason: '
          || left(coalesce(nullif(trim(new.review_comment), ''), 'No reason was provided.'), 300)
      else
        'Your upload "' || left(new.title, 100) || '" was approved and is now available to students.'
          || case when nullif(trim(new.review_comment), '') is null then '' else ' Note: ' || left(trim(new.review_comment), 300) end
    end;
    insert into public.app_notifications (recipient_id, resource_id, type, message)
    values (new.uploaded_by, new.id, case when new.status = 'approved' then 'resource_approved' else 'resource_rejected' end, left(notification_message, 500));
  end if;
  return new;
end;
$$;
revoke all on function public.notify_resource_review() from public, anon, authenticated;
drop trigger if exists notify_resource_review on public.resources;
create trigger notify_resource_review
  after update of status on public.resources
  for each row execute function public.notify_resource_review();

drop policy if exists "Students can read approved and owned resource PDFs" on storage.objects;
drop policy if exists "Students can read approved and pending owned resource PDFs" on storage.objects;
create policy "Students can read approved and pending owned resource PDFs"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'student-resources'
    and exists (
      select 1 from public.resources as resource
      where resource.file_path = name
        and (
          resource.status = 'approved'
          or (resource.status = 'pending' and resource.uploaded_by = (select auth.uid()))
          or exists (select 1 from public.resource_moderators as moderator where moderator.user_id = (select auth.uid()))
        )
    )
  );

create or replace function public.reject_auth_email_changes ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    raise exception 'Email addresses cannot be changed after account creation.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_auth_email_changes () from public, anon, authenticated;
grant execute on function public.reject_auth_email_changes () to supabase_auth_admin;

drop trigger if exists prevent_auth_user_email_change on auth.users;
create trigger prevent_auth_user_email_change
  before update of email on auth.users
  for each row
  execute function public.reject_auth_email_changes ();

notify pgrst, 'reload schema';
