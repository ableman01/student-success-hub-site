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

notify pgrst, 'reload schema';
