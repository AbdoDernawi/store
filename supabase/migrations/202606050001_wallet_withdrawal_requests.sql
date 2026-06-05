create table if not exists public.wallet_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  marketer_id uuid not null references public.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text not null default 'bank_transfer',
  account_details text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wallet_withdrawal_requests_wallet
  on public.wallet_withdrawal_requests(wallet_id, created_at desc);

create index if not exists idx_wallet_withdrawal_requests_marketer
  on public.wallet_withdrawal_requests(marketer_id, created_at desc);

create index if not exists idx_wallet_withdrawal_requests_status
  on public.wallet_withdrawal_requests(status, created_at desc);

drop trigger if exists touch_wallet_withdrawal_requests_updated_at on public.wallet_withdrawal_requests;
create trigger touch_wallet_withdrawal_requests_updated_at
before update on public.wallet_withdrawal_requests
for each row execute function private.touch_updated_at();

alter table public.wallet_withdrawal_requests enable row level security;

drop policy if exists wallet_withdrawal_requests_owner_select on public.wallet_withdrawal_requests;
create policy wallet_withdrawal_requests_owner_select
  on public.wallet_withdrawal_requests
  for select
  using (marketer_id = auth.uid());

drop policy if exists wallet_withdrawal_requests_owner_insert on public.wallet_withdrawal_requests;
create policy wallet_withdrawal_requests_owner_insert
  on public.wallet_withdrawal_requests
  for insert
  with check (
    marketer_id = auth.uid()
    and exists (
      select 1
      from public.wallets w
      where w.id = wallet_id
        and w.user_id = auth.uid()
    )
  );

drop policy if exists wallet_withdrawal_requests_admin_all on public.wallet_withdrawal_requests;
create policy wallet_withdrawal_requests_admin_all
  on public.wallet_withdrawal_requests
  for all
  using (private.is_admin())
  with check (private.is_admin());
