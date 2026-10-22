-- Lets a student edit the class materials they shared, lets the site creator
-- edit any assignment or material, and keeps the approval flow creator-only.

drop policy if exists "Users can update their own resources" on public.resources;
create policy "Users can update their own resources"
  on public.resources for update
  to authenticated
  using ((select auth.uid()) = uploaded_by)
  with check ((select auth.uid()) = uploaded_by);

drop policy if exists "Resource moderators can update any resource" on public.resources;
create policy "Resource moderators can update any resource"
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

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
  on public.tasks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Resource moderators can update any task" on public.tasks;
create policy "Resource moderators can update any task"
  on public.tasks for update
  to authenticated
  using (exists (
    select 1 from public.resource_moderators as moderator
    where moderator.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.resource_moderators as moderator
    where moderator.user_id = (select auth.uid())
  ));

-- Only the columns the app edits are writable, so an uploader can never
-- approve their own upload.
revoke update on public.resources from anon;
revoke update on public.resources from authenticated;
grant update (title, course, description, category, academic_level, status, reviewed_at, review_comment)
  on public.resources to authenticated;

create or replace function public.enforce_resource_review_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.resource_moderators as moderator
    where moderator.user_id = (select auth.uid())
  ) then
    return new;
  end if;

  if new.uploaded_by is distinct from old.uploaded_by
     or new.status is distinct from old.status
     or new.reviewed_at is distinct from old.reviewed_at
     or new.review_comment is distinct from old.review_comment then
    raise exception 'Only the site creator can review a shared resource.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_resource_review_scope() from public, anon, authenticated;
drop trigger if exists enforce_resource_review_scope on public.resources;
create trigger enforce_resource_review_scope
  before update on public.resources
  for each row execute function public.enforce_resource_review_scope();

notify pgrst, 'reload schema';
