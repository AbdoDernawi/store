create table if not exists public.wallet_access_codes (
  marketer_id uuid primary key references public.users(id) on delete cascade,
  code_hash text not null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_wallet_access_codes_updated_at on public.wallet_access_codes;
create trigger touch_wallet_access_codes_updated_at
before update on public.wallet_access_codes
for each row execute function private.touch_updated_at();

alter table public.wallet_access_codes enable row level security;

drop policy if exists wallet_access_codes_admin_all on public.wallet_access_codes;
create policy wallet_access_codes_admin_all
  on public.wallet_access_codes
  for all
  using (private.is_admin())
  with check (private.is_admin());
