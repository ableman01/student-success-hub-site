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
  with check (
    bucket_id = 'study-chat-images'
    and (storage.foldername(name))[1] = 'rooms'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "Group members can view group chat images" on storage.objects;
create policy "Group members can view group chat images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'study-chat-images'
    and (storage.foldername(name))[1] = 'groups'
    and exists (
      select 1 from public.study_group_members member
      where member.group_id::text = (storage.foldername(name))[2]
        and member.user_id = (select auth.uid())
    )
  );

drop policy if exists "Group members can upload group chat images" on storage.objects;
create policy "Group members can upload group chat images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'study-chat-images'
    and (storage.foldername(name))[1] = 'groups'
    and (storage.foldername(name))[3] = (select auth.uid())::text
    and exists (
      select 1 from public.study_group_members member
      where member.group_id::text = (storage.foldername(name))[2]
        and member.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own study chat images" on storage.objects;
create policy "Users can delete their own study chat images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'study-chat-images'
    and (
      ((storage.foldername(name))[1] = 'rooms' and (storage.foldername(name))[2] = (select auth.uid())::text)
      or ((storage.foldername(name))[1] = 'groups' and (storage.foldername(name))[3] = (select auth.uid())::text)
    )
  );

notify pgrst, 'reload schema';
