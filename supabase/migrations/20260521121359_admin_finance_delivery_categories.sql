create table if not exists public.expense_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint payment_methods_code_format check (code ~ '^[a-z0-9_]+$')
);

create table if not exists public.payment_method_treasuries (
  id uuid primary key default gen_random_uuid(),
  payment_method_id uuid not null unique references public.payment_methods(id) on delete cascade,
  balance numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_treasury_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_method_id uuid not null references public.payment_methods(id) on delete restrict,
  flow public.transaction_flow not null,
  amount numeric(14,2) not null check (amount >= 0),
  source_type text,
  source_id uuid,
  note text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.expenses
  add column if not exists expense_type_id uuid references public.expense_types(id) on delete set null,
  add column if not exists payment_method_id uuid references public.payment_methods(id) on delete set null;

create index if not exists idx_expenses_expense_type on public.expenses(expense_type_id);
create index if not exists idx_expenses_payment_method on public.expenses(payment_method_id);
create index if not exists idx_payment_treasury_transactions_method
on public.payment_treasury_transactions(payment_method_id, created_at desc);

alter table public.expense_types enable row level security;
alter table public.payment_methods enable row level security;
alter table public.payment_method_treasuries enable row level security;
alter table public.payment_treasury_transactions enable row level security;

grant select on public.expense_types to authenticated, service_role;
grant select on public.payment_methods to authenticated, service_role;
grant select on public.payment_method_treasuries to authenticated, service_role;
grant select on public.payment_treasury_transactions to authenticated, service_role;
grant insert, update, delete on public.expense_types to authenticated, service_role;
grant insert, update, delete on public.payment_methods to authenticated, service_role;
grant insert, update, delete on public.payment_method_treasuries to authenticated, service_role;
grant insert, update, delete on public.payment_treasury_transactions to authenticated, service_role;

drop policy if exists expense_types_read on public.expense_types;
create policy expense_types_read
on public.expense_types for select
using (is_active = true or private.is_admin());

drop policy if exists expense_types_admin_all on public.expense_types;
create policy expense_types_admin_all
on public.expense_types for all
using (private.is_admin())
with check (private.is_admin());

drop policy if exists payment_methods_read on public.payment_methods;
create policy payment_methods_read
on public.payment_methods for select
using (is_active = true or private.is_admin());

drop policy if exists payment_methods_admin_all on public.payment_methods;
create policy payment_methods_admin_all
on public.payment_methods for all
using (private.is_admin())
with check (private.is_admin());

drop policy if exists payment_method_treasuries_admin_all on public.payment_method_treasuries;
create policy payment_method_treasuries_admin_all
on public.payment_method_treasuries for all
using (private.is_admin())
with check (private.is_admin());

drop policy if exists payment_treasury_transactions_admin_all on public.payment_treasury_transactions;
create policy payment_treasury_transactions_admin_all
on public.payment_treasury_transactions for all
using (private.is_admin())
with check (private.is_admin());

insert into public.expense_types (name, sort_order, is_active)
values
  ('مصاريف تشغيلية', 10, true),
  ('إعلانات وتسويق', 20, true),
  ('رواتب ومكافآت', 30, true),
  ('نقل وشحن', 40, true),
  ('مشتريات مكتبية', 50, true),
  ('صيانة', 60, true)
on conflict (name) do update set sort_order = excluded.sort_order, is_active = true;

insert into public.payment_methods (code, name_ar, name_en, sort_order, is_active)
values
  ('cash', 'كاش', 'Cash', 10, true),
  ('bank_transfer', 'حوالة مصرفية', 'Bank transfer', 20, true),
  ('card', 'بطاقة', 'Card', 30, true),
  ('mobile_wallet', 'محفظة إلكترونية', 'Mobile wallet', 40, true)
on conflict (code) do update
set name_ar = excluded.name_ar,
    name_en = excluded.name_en,
    sort_order = excluded.sort_order,
    is_active = true;

insert into public.payment_method_treasuries (payment_method_id, balance)
select pm.id, coalesce(t.balance, 0)
from public.payment_methods pm
left join public.treasury t on t.type::text = pm.code
where pm.code in ('cash', 'bank_transfer')
on conflict (payment_method_id) do update
set balance = excluded.balance,
    updated_at = now();

insert into public.payment_method_treasuries (payment_method_id, balance)
select pm.id, 0
from public.payment_methods pm
where not exists (
  select 1
  from public.payment_method_treasuries pmt
  where pmt.payment_method_id = pm.id
);

create or replace function public.admin_create_expense_type(
  p_name text,
  p_sort_order integer default 0
)
returns jsonb
language plpgsql
set search_path = public, private
as $$
declare
  row_data public.expense_types%rowtype;
begin
  if not private.is_admin() then
    raise exception 'FORBIDDEN_ADMIN' using errcode = 'P0001';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'INVALID_EXPENSE_TYPE' using errcode = 'P0001';
  end if;

  insert into public.expense_types (name, sort_order, is_active)
  values (trim(p_name), coalesce(p_sort_order, 0), true)
  on conflict (name)
  do update set sort_order = excluded.sort_order, is_active = true
  returning * into row_data;

  return to_jsonb(row_data);
end;
$$;

create or replace function public.admin_create_payment_method(
  p_code text,
  p_name_ar text,
  p_name_en text default null,
  p_sort_order integer default 0
)
returns jsonb
language plpgsql
set search_path = public, private
as $$
declare
  normalized_code text := lower(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9_]+', '_', 'g'));
  row_data public.payment_methods%rowtype;
begin
  if not private.is_admin() then
    raise exception 'FORBIDDEN_ADMIN' using errcode = 'P0001';
  end if;

  normalized_code := trim(both '_' from normalized_code);

  if nullif(normalized_code, '') is null then
    raise exception 'INVALID_PAYMENT_METHOD_CODE' using errcode = 'P0001';
  end if;

  if nullif(trim(p_name_ar), '') is null then
    raise exception 'INVALID_PAYMENT_METHOD_NAME' using errcode = 'P0001';
  end if;

  insert into public.payment_methods (code, name_ar, name_en, sort_order, is_active)
  values (normalized_code, trim(p_name_ar), nullif(trim(coalesce(p_name_en, '')), ''), coalesce(p_sort_order, 0), true)
  on conflict (code)
  do update set name_ar = excluded.name_ar,
                name_en = excluded.name_en,
                sort_order = excluded.sort_order,
                is_active = true
  returning * into row_data;

  insert into public.payment_method_treasuries (payment_method_id, balance)
  values (row_data.id, 0)
  on conflict (payment_method_id) do nothing;

  return to_jsonb(row_data);
end;
$$;

create or replace function public.admin_record_expense_v2(
  p_expense_type_id uuid,
  p_payment_method_id uuid,
  p_amount numeric,
  p_note text default null
)
returns jsonb
language plpgsql
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  expense_type_row public.expense_types%rowtype;
  method_row public.payment_methods%rowtype;
  expense_row public.expenses%rowtype;
begin
  if not private.is_admin() then
    raise exception 'FORBIDDEN_ADMIN' using errcode = 'P0001';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'INVALID_EXPENSE_AMOUNT' using errcode = 'P0001';
  end if;

  select * into expense_type_row
  from public.expense_types
  where id = p_expense_type_id
    and is_active = true;

  if not found then
    raise exception 'EXPENSE_TYPE_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into method_row
  from public.payment_methods
  where id = p_payment_method_id
    and is_active = true;

  if not found then
    raise exception 'PAYMENT_METHOD_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.expenses (type, expense_type_id, payment_method_id, amount, note, created_by)
  values (expense_type_row.name, expense_type_row.id, method_row.id, p_amount, p_note, actor_id)
  returning * into expense_row;

  insert into public.payment_method_treasuries (payment_method_id, balance)
  values (method_row.id, 0)
  on conflict (payment_method_id) do nothing;

  update public.payment_method_treasuries
  set balance = balance - p_amount,
      updated_at = now()
  where payment_method_id = method_row.id;

  insert into public.payment_treasury_transactions (
    payment_method_id, flow, amount, source_type, source_id, note, created_by
  )
  values (
    method_row.id, 'out', p_amount, 'expense', expense_row.id, p_note, actor_id
  );

  if method_row.code in ('cash', 'bank_transfer') then
    update public.treasury
    set balance = balance - p_amount,
        updated_at = now()
    where type::text = method_row.code;

    insert into public.treasury_transactions (treasury_type, flow, amount, source_type, source_id, note, created_by)
    values (method_row.code::public.treasury_type, 'out', p_amount, 'expense', expense_row.id, p_note, actor_id);
  end if;

  return to_jsonb(expense_row);
end;
$$;

grant execute on function public.admin_create_expense_type(text, integer) to authenticated, service_role;
grant execute on function public.admin_create_payment_method(text, text, text, integer) to authenticated, service_role;
grant execute on function public.admin_record_expense_v2(uuid, uuid, numeric, text) to authenticated, service_role;
