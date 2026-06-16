create table if not exists public.agent_test_runs (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  mode text not null default 'dry_run' check (mode in ('dry_run', 'scheduled', 'manual')),
  status text not null default 'running' check (status in ('running', 'passed', 'warning', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  base_url text,
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null
);

create table if not exists public.agent_test_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_test_runs(id) on delete cascade,
  agent_key text not null,
  role text not null,
  scenario text not null,
  step text not null,
  status text not null check (status in ('passed', 'warning', 'failed', 'info')),
  message text not null,
  target_type text,
  target_id uuid,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_test_events_run on public.agent_test_events(run_id, created_at);
create index if not exists idx_agent_test_events_status on public.agent_test_events(status);
create index if not exists idx_agent_test_runs_started on public.agent_test_runs(started_at desc);

alter table public.agent_test_runs enable row level security;
alter table public.agent_test_events enable row level security;

drop policy if exists agent_runs_admin_read on public.agent_test_runs;
create policy agent_runs_admin_read on public.agent_test_runs
  for select using (private.is_admin());

drop policy if exists agent_runs_service_all on public.agent_test_runs;
create policy agent_runs_service_all on public.agent_test_runs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists agent_events_admin_read on public.agent_test_events;
create policy agent_events_admin_read on public.agent_test_events
  for select using (private.is_admin());

drop policy if exists agent_events_service_all on public.agent_test_events;
create policy agent_events_service_all on public.agent_test_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant select on public.agent_test_runs to authenticated;
grant select on public.agent_test_events to authenticated;

grant all on public.agent_test_runs to service_role;
grant all on public.agent_test_events to service_role;
