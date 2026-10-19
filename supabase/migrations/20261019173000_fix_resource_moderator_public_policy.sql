-- Policies check moderator membership even for public resource queries. RLS
-- still limits anonymous users to an empty result from this role table.
grant select on public.resource_moderators to anon, authenticated;

create index if not exists app_notifications_resource_id_idx
  on public.app_notifications (resource_id);
