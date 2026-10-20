create schema if not exists internal;
revoke all on schema internal from public, anon, authenticated;

create table if not exists internal.lasu_update_sync_gate (
  gate_id boolean primary key default true check (gate_id),
  last_started_at timestamptz not null
);
alter table internal.lasu_update_sync_gate enable row level security;
revoke all on internal.lasu_update_sync_gate from public, anon, authenticated, service_role;

create or replace function public.claim_lasu_update_sync ()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed boolean;
begin
  insert into internal.lasu_update_sync_gate (gate_id, last_started_at)
  values (true, now())
  on conflict (gate_id) do update
    set last_started_at = excluded.last_started_at
    where internal.lasu_update_sync_gate.last_started_at < now() - interval '10 minutes'
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

revoke all on function public.claim_lasu_update_sync () from public, anon, authenticated;
grant execute on function public.claim_lasu_update_sync () to service_role;
