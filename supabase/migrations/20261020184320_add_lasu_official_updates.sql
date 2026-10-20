create table if not exists public.lasu_official_updates (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique check (length(source_key) between 1 and 120),
  title text not null check (length(title) between 1 and 300),
  summary text not null default '' check (length(summary) <= 500),
  category text not null check (category in ('announcement', 'deadline', 'registration', 'academic', 'opportunity')),
  official_url text not null check (official_url ~ '^https://([a-z0-9-]+[.])*lasu[.]edu[.]ng(/|$)'),
  published_at timestamptz,
  source_label text not null default 'LASU official website',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists lasu_official_updates_published_idx
  on public.lasu_official_updates (published_at desc nulls last, first_seen_at desc);

alter table public.lasu_official_updates enable row level security;

drop policy if exists "Anyone can read official LASU updates" on public.lasu_official_updates;
create policy "Anyone can read official LASU updates"
  on public.lasu_official_updates for select
  to anon, authenticated
  using (true);

grant select on public.lasu_official_updates to anon, authenticated;
