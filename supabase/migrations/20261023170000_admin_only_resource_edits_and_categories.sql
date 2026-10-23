-- Shared resources (including past questions) can only be edited by admins.
drop policy if exists "Users can update their own resources" on public.resources;
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

-- The only class-material category is lecture notes. Past questions keep their
-- own category because they are a separate resource kind.
update public.resources
set category = case when kind = 'past_question' then 'past_question' else 'lecture_notes' end
where category not in ('past_question', 'lecture_notes')
   or (kind = 'class_material' and category = 'past_question')
   or (kind = 'past_question' and category = 'lecture_notes');

alter table public.resources drop constraint if exists resources_category_check;
alter table public.resources add constraint resources_category_check
  check (category in ('past_question', 'lecture_notes'));

notify pgrst, 'reload schema';
