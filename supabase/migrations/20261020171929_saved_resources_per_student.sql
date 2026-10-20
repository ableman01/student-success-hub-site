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
