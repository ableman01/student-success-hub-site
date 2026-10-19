drop policy if exists "Users can delete their own resources" on public.resources;
create policy "Users can delete their own resources"
  on public.resources for delete
  to authenticated
  using ((select auth.uid()) = uploaded_by);

grant delete on public.resources to authenticated;
