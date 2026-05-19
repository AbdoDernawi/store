create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('super_admin', 'admin', 'marketer', 'delivery', 'customer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.admin_scope_type as enum ('warehouse', 'city');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_movement_type as enum ('in', 'out', 'reserved', 'unreserved', 'return', 'transfer_in', 'transfer_out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discount_type as enum ('percentage', 'fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discount_applies_to as enum ('all', 'customer_only', 'marketer_only');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_type as enum ('customer', 'marketer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'bank_transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'confirmed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'pending_approval', 'approved', 'rejected', 'preparing', 'ready',
    'out_for_delivery', 'delivered', 'partial_return', 'full_return', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_type as enum ('original', 'virtual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.return_type as enum ('full', 'partial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.return_status as enum ('pending', 'confirmed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.treasury_type as enum ('cash', 'bank_transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_flow as enum ('in', 'out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wallet_transaction_source as enum ('order_commission', 'manual_payout');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_handover_type as enum ('cash_full', 'cash_partial', 'return_goods');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.handover_status as enum ('pending', 'confirmed', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.purchase_payment_type as enum ('immediate', 'debt', 'partial');
exception when duplicate_object then null; end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone varchar(32) unique not null,
  password_hash text,
  full_name text not null,
  role public.app_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  is_active boolean not null default true
);

create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  is_active boolean not null default true
);

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city_id uuid not null references public.cities(id) on delete restrict,
  address text,
  is_active boolean not null default true
);

create table if not exists public.admin_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scope_type public.admin_scope_type not null,
  scope_id uuid not null,
  unique (user_id, scope_type, scope_id)
);

create table if not exists public.virtual_stores (
  id uuid primary key default gen_random_uuid(),
  marketer_id uuid not null references public.users(id) on delete cascade,
  store_name text not null,
  logo_url text,
  primary_color varchar(24),
  secondary_color varchar(24),
  contact_phone varchar(32),
  address text,
  invoice_note text,
  unique (marketer_id)
);

create table if not exists public.marketer_customers (
  id uuid primary key default gen_random_uuid(),
  marketer_id uuid not null references public.users(id) on delete cascade,
  customer_name text not null,
  customer_phone varchar(32) not null,
  last_ordered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (marketer_id, customer_phone)
);

create table if not exists public.warehouse_priorities (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  priority_order integer not null check (priority_order > 0),
  unique (city_id, warehouse_id),
  unique (city_id, priority_order)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  images jsonb not null default '[]'::jsonb,
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  customer_price numeric(12,2) not null default 0 check (customer_price >= 0),
  marketer_price numeric(12,2) not null default 0 check (marketer_price >= 0),
  marketer_commission numeric(12,2) not null default 0 check (marketer_commission >= 0),
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color text,
  size text,
  type text,
  image_url text,
  extra_price numeric(12,2) not null default 0,
  is_active boolean not null default true
);

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.discount_type not null,
  value numeric(12,2) not null check (value >= 0),
  applies_to public.discount_applies_to not null default 'all',
  auto_apply boolean not null default false,
  product_ids jsonb not null default '[]'::jsonb,
  code varchar(80) unique,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null
);

create table if not exists public.warehouse_inventory (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  product_variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity_available integer not null default 0 check (quantity_available >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now(),
  unique (warehouse_id, product_variant_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated by default as identity unique,
  type public.order_type not null,
  customer_name text not null,
  customer_phone varchar(32) not null,
  customer_address text not null,
  city_id uuid not null references public.cities(id) on delete restrict,
  zone_id uuid not null references public.zones(id) on delete restrict,
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  payment_method public.payment_method not null default 'cash',
  payment_status public.payment_status not null default 'pending',
  transfer_image_url text,
  status public.order_status not null default 'pending_approval',
  invoice_type public.invoice_type not null default 'original',
  virtual_store_id uuid references public.virtual_stores(id) on delete set null,
  customer_id uuid references public.users(id) on delete set null,
  marketer_id uuid references public.users(id) on delete set null,
  delivery_id uuid references public.users(id) on delete set null,
  rejection_reason text,
  cancellation_reason text,
  cancellation_requested_by uuid references public.users(id) on delete set null,
  merged_with uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_variant_id uuid not null references public.product_variants(id) on delete restrict,
  warehouse_id uuid references public.warehouses(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  commission_per_unit numeric(12,2) not null default 0 check (commission_per_unit >= 0),
  total_price numeric(12,2) not null check (total_price >= 0),
  total_commission numeric(12,2) not null default 0 check (total_commission >= 0)
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  changed_by uuid references public.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_packages (
  id uuid primary key default gen_random_uuid(),
  package_number bigint generated by default as identity unique,
  qr_code_hash varchar(255) unique not null,
  order_ids jsonb not null default '[]'::jsonb,
  assigned_to uuid references public.users(id) on delete set null,
  assigned_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_custom_statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color varchar(24) not null,
  sort_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null
);

create table if not exists public."returns" (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  type public.return_type not null,
  reason text,
  return_warehouse_id uuid references public.warehouses(id) on delete restrict,
  status public.return_status not null default 'pending',
  confirmed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public."returns"(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  product_variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  original_warehouse_id uuid references public.warehouses(id) on delete restrict
);

create table if not exists public.order_chats (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.order_chats(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.warehouse_movements (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  product_variant_id uuid not null references public.product_variants(id) on delete restrict,
  type public.inventory_movement_type not null,
  quantity integer not null check (quantity > 0),
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.treasury (
  id uuid primary key default gen_random_uuid(),
  type public.treasury_type not null unique,
  balance numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.treasury_transactions (
  id uuid primary key default gen_random_uuid(),
  treasury_type public.treasury_type not null,
  flow public.transaction_flow not null,
  amount numeric(14,2) not null check (amount >= 0),
  source_type text,
  source_id uuid,
  note text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.warehouse_treasury_logs (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  flow public.transaction_flow not null,
  amount numeric(14,2) not null check (amount >= 0),
  source_type text,
  source_id uuid,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  amount numeric(14,2) not null check (amount >= 0),
  note text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  balance numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  flow public.transaction_flow not null,
  amount numeric(14,2) not null check (amount >= 0),
  source_type public.wallet_transaction_source not null,
  source_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_handovers (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.users(id) on delete cascade,
  type public.delivery_handover_type not null,
  order_ids jsonb not null default '[]'::jsonb,
  total_amount numeric(14,2) not null default 0,
  status public.handover_status not null default 'pending',
  confirmed_by uuid references public.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone varchar(32),
  notes text,
  total_debt numeric(14,2) not null default 0,
  is_active boolean not null default true
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  total_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  debt_amount numeric(14,2) not null default 0,
  due_date date,
  payment_type public.purchase_payment_type not null,
  status text not null default 'pending',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  total_cost numeric(14,2) not null check (total_cost >= 0)
);

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  note text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number bigint generated by default as identity unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  invoice_type public.invoice_type not null,
  virtual_store_id uuid references public.virtual_stores(id) on delete set null,
  has_return boolean not null default false,
  return_id uuid references public."returns"(id) on delete set null,
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  delivery_fee numeric(14,2) not null default 0,
  payment_method public.payment_method not null,
  printed_at timestamptz,
  printed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  link text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text,
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_scopes_user on public.admin_scopes(user_id);
create index if not exists idx_zones_city on public.zones(city_id);
create index if not exists idx_warehouses_city on public.warehouses(city_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_variants_product on public.product_variants(product_id);
create index if not exists idx_inventory_variant on public.warehouse_inventory(product_variant_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_city on public.orders(city_id);
create index if not exists idx_orders_marketer on public.orders(marketer_id);
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_delivery on public.orders(delivery_id);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_warehouse on public.order_items(warehouse_id);
create index if not exists idx_packages_assigned_to on public.order_packages(assigned_to);
create index if not exists idx_movements_warehouse on public.warehouse_movements(warehouse_id);
create index if not exists idx_wallet_transactions_wallet on public.wallet_transactions(wallet_id);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read);

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid() and is_active = true
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'super_admin', false)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('super_admin', 'admin'), false)
$$;

create or replace function public.has_city_scope(target_city_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.admin_scopes s
      where s.user_id = auth.uid()
        and s.scope_type = 'city'
        and s.scope_id = target_city_id
    )
$$;

create or replace function public.has_warehouse_scope(target_warehouse_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.admin_scopes s
      where s.user_id = auth.uid()
        and s.scope_type = 'warehouse'
        and s.scope_id = target_warehouse_id
    )
    or exists (
      select 1
      from public.admin_scopes s
      join public.warehouses w on w.city_id = s.scope_id
      where s.user_id = auth.uid()
        and s.scope_type = 'city'
        and w.id = target_warehouse_id
    )
$$;

create or replace function public.can_admin_access_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.orders o
      where o.id = target_order_id
        and public.has_city_scope(o.city_id)
    )
    or exists (
      select 1
      from public.order_items oi
      where oi.order_id = target_order_id
        and oi.warehouse_id is not null
        and public.has_warehouse_scope(oi.warehouse_id)
    )
$$;

create or replace function public.can_access_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = target_order_id
      and (
        public.can_admin_access_order(o.id)
        or o.marketer_id = auth.uid()
        or o.delivery_id = auth.uid()
        or o.customer_id = auth.uid()
      )
  )
$$;

create or replace function public.can_access_chat(target_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.order_chats c
    join public.orders o on o.id = c.order_id
    where c.id = target_chat_id
      and (
        public.can_admin_access_order(o.id)
        or o.marketer_id = auth.uid()
        or o.delivery_id = auth.uid()
      )
  )
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_warehouse_inventory_updated_at on public.warehouse_inventory;
create trigger touch_warehouse_inventory_updated_at
before update on public.warehouse_inventory
for each row execute function public.touch_updated_at();

drop trigger if exists touch_treasury_updated_at on public.treasury;
create trigger touch_treasury_updated_at
before update on public.treasury
for each row execute function public.touch_updated_at();

drop trigger if exists touch_wallets_updated_at on public.wallets;
create trigger touch_wallets_updated_at
before update on public.wallets
for each row execute function public.touch_updated_at();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'users', 'admin_scopes', 'virtual_stores', 'marketer_customers',
    'cities', 'zones', 'warehouses', 'warehouse_priorities',
    'warehouse_inventory', 'warehouse_movements', 'categories', 'products',
    'product_variants', 'discounts', 'orders', 'order_items',
    'order_status_history', 'order_packages', 'order_custom_statuses',
    'returns', 'return_items', 'order_chats', 'chat_messages', 'treasury',
    'treasury_transactions', 'warehouse_treasury_logs', 'expenses',
    'wallets', 'wallet_transactions', 'delivery_handovers', 'suppliers',
    'purchase_orders', 'purchase_order_items', 'supplier_payments',
    'invoices', 'banners', 'notifications'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('drop policy if exists super_admin_all on public.%I', table_name);
    execute format(
      'create policy super_admin_all on public.%I for all using (public.is_super_admin()) with check (public.is_super_admin())',
      table_name
    );
  end loop;
end $$;

create policy users_self_select on public.users for select using (id = auth.uid());
create policy users_customer_insert on public.users for insert with check (id = auth.uid() and role = 'customer');
create policy users_self_update on public.users
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role() and is_active = true);

create policy admin_scopes_self_select on public.admin_scopes for select using (user_id = auth.uid());

create policy virtual_stores_marketer_all on public.virtual_stores
  for all using (marketer_id = auth.uid()) with check (marketer_id = auth.uid());

create policy marketer_customers_marketer_all on public.marketer_customers
  for all using (marketer_id = auth.uid()) with check (marketer_id = auth.uid());

create policy active_cities_read on public.cities for select using (is_active = true and auth.uid() is not null);
create policy active_zones_read on public.zones for select using (is_active = true and auth.uid() is not null);
create policy active_warehouses_read on public.warehouses for select using (is_active = true and auth.uid() is not null);
create policy admin_cities_manage on public.cities for all using (public.is_admin()) with check (public.is_admin());
create policy admin_zones_manage on public.zones for all using (public.has_city_scope(city_id)) with check (public.has_city_scope(city_id));
create policy admin_warehouses_manage on public.warehouses for all using (public.has_city_scope(city_id) or public.has_warehouse_scope(id)) with check (public.has_city_scope(city_id));

create policy admin_warehouse_priorities_all on public.warehouse_priorities
  for all using (public.has_city_scope(city_id) or public.has_warehouse_scope(warehouse_id))
  with check (public.has_city_scope(city_id) or public.has_warehouse_scope(warehouse_id));

create policy admin_inventory_all on public.warehouse_inventory
  for all using (public.has_warehouse_scope(warehouse_id))
  with check (public.has_warehouse_scope(warehouse_id));

create policy admin_movements_all on public.warehouse_movements
  for all using (public.has_warehouse_scope(warehouse_id))
  with check (public.has_warehouse_scope(warehouse_id));

create policy categories_active_read on public.categories for select using (is_active = true and auth.uid() is not null);
create policy categories_admin_all on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy products_admin_all on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy variants_admin_all on public.product_variants for all using (public.is_admin()) with check (public.is_admin());
create policy discounts_admin_all on public.discounts for all using (public.is_admin()) with check (public.is_admin());

create policy orders_role_select on public.orders
  for select using (
    public.can_admin_access_order(id)
    or marketer_id = auth.uid()
    or delivery_id = auth.uid()
    or customer_id = auth.uid()
  );

create policy orders_marketer_customer_insert on public.orders
  for insert with check (
    (type = 'marketer' and marketer_id = auth.uid())
    or (type = 'customer' and customer_id = auth.uid())
    or public.has_city_scope(city_id)
  );

create policy orders_role_update on public.orders
  for update using (
    public.can_admin_access_order(id)
    or marketer_id = auth.uid()
    or delivery_id = auth.uid()
    or customer_id = auth.uid()
  )
  with check (
    public.can_admin_access_order(id)
    or marketer_id = auth.uid()
    or delivery_id = auth.uid()
    or customer_id = auth.uid()
  );

create policy order_items_access_by_order on public.order_items
  for select using (public.can_access_order(order_id));
create policy order_items_admin_all on public.order_items
  for all using (public.can_admin_access_order(order_id))
  with check (public.can_admin_access_order(order_id));
create policy order_items_customer_marketer_insert on public.order_items
  for insert with check (public.can_access_order(order_id));

create policy order_status_history_access_by_order on public.order_status_history
  for select using (public.can_access_order(order_id));
create policy order_status_history_admin_insert on public.order_status_history
  for insert with check (public.can_admin_access_order(order_id));

create policy packages_admin_all on public.order_packages
  for all using (public.is_admin()) with check (public.is_admin());
create policy packages_delivery_read on public.order_packages
  for select using (assigned_to is null or assigned_to = auth.uid());
create policy packages_delivery_claim on public.order_packages
  for update using (assigned_to is null or assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

create policy custom_statuses_admin_all on public.order_custom_statuses
  for all using (public.is_admin()) with check (public.is_admin());

create policy returns_access_by_order on public."returns"
  for select using (public.can_access_order(order_id));
create policy returns_admin_delivery_insert on public."returns"
  for insert with check (
    public.can_admin_access_order(order_id)
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.delivery_id = auth.uid()
    )
  );
create policy returns_admin_update on public."returns"
  for update using (public.can_admin_access_order(order_id)) with check (public.can_admin_access_order(order_id));

create policy return_items_access_by_return on public.return_items
  for select using (
    exists (
      select 1 from public."returns" r
      where r.id = return_id and public.can_access_order(r.order_id)
    )
  );
create policy return_items_admin_delivery_insert on public.return_items
  for insert with check (
    exists (
      select 1 from public."returns" r
      join public.orders o on o.id = r.order_id
      where r.id = return_id
        and (public.can_admin_access_order(r.order_id) or o.delivery_id = auth.uid())
    )
  );

create policy chats_access_by_order on public.order_chats
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          public.can_admin_access_order(o.id)
          or o.marketer_id = auth.uid()
          or o.delivery_id = auth.uid()
        )
    )
  );
create policy chats_admin_delivery_insert on public.order_chats
  for insert with check (
    public.can_admin_access_order(order_id)
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.delivery_id = auth.uid()
    )
  );
create policy chats_admin_delivery_update on public.order_chats
  for update using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          public.can_admin_access_order(o.id)
          or o.marketer_id = auth.uid()
          or o.delivery_id = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          public.can_admin_access_order(o.id)
          or o.marketer_id = auth.uid()
          or o.delivery_id = auth.uid()
        )
    )
  );

create policy messages_access_by_chat on public.chat_messages
  for select using (public.can_access_chat(chat_id));
create policy messages_participant_insert on public.chat_messages
  for insert with check (sender_id = auth.uid() and public.can_access_chat(chat_id));
create policy messages_participant_update on public.chat_messages
  for update using (public.can_access_chat(chat_id)) with check (public.can_access_chat(chat_id));

create policy treasury_admin_all on public.treasury for all using (public.is_admin()) with check (public.is_admin());
create policy treasury_transactions_admin_all on public.treasury_transactions for all using (public.is_admin()) with check (public.is_admin());
create policy warehouse_treasury_logs_admin_all on public.warehouse_treasury_logs
  for all using (public.has_warehouse_scope(warehouse_id)) with check (public.has_warehouse_scope(warehouse_id));
create policy expenses_admin_all on public.expenses for all using (public.is_admin()) with check (public.is_admin());

create policy wallets_owner_select on public.wallets for select using (user_id = auth.uid());
create policy wallets_admin_all on public.wallets for all using (public.is_admin()) with check (public.is_admin());
create policy wallet_transactions_owner_select on public.wallet_transactions
  for select using (
    exists (select 1 from public.wallets w where w.id = wallet_id and w.user_id = auth.uid())
  );
create policy wallet_transactions_admin_all on public.wallet_transactions
  for all using (public.is_admin()) with check (public.is_admin());

create policy handovers_delivery_select on public.delivery_handovers
  for select using (delivery_id = auth.uid() or public.is_admin());
create policy handovers_delivery_insert on public.delivery_handovers
  for insert with check (delivery_id = auth.uid());
create policy handovers_admin_update on public.delivery_handovers
  for update using (public.is_admin()) with check (public.is_admin());

create policy suppliers_admin_all on public.suppliers for all using (public.is_admin()) with check (public.is_admin());
create policy purchase_orders_admin_all on public.purchase_orders
  for all using (public.has_warehouse_scope(warehouse_id)) with check (public.has_warehouse_scope(warehouse_id));
create policy purchase_order_items_admin_all on public.purchase_order_items
  for all using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id and public.has_warehouse_scope(po.warehouse_id)
    )
  )
  with check (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id and public.has_warehouse_scope(po.warehouse_id)
    )
  );
create policy supplier_payments_admin_all on public.supplier_payments for all using (public.is_admin()) with check (public.is_admin());

create policy invoices_access_by_order on public.invoices
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          public.can_admin_access_order(o.id)
          or o.marketer_id = auth.uid()
          or o.customer_id = auth.uid()
        )
    )
  );
create policy invoices_admin_all on public.invoices for all using (public.is_admin()) with check (public.is_admin());

create policy banners_active_read on public.banners for select using (is_active = true and auth.uid() is not null);
create policy banners_admin_all on public.banners for all using (public.is_admin()) with check (public.is_admin());
create policy notifications_owner_select on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_owner_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_admin_insert on public.notifications
  for insert with check (public.is_admin());

insert into public.treasury (type, balance)
values ('cash', 0), ('bank_transfer', 0)
on conflict (type) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/webp', 'image/png', 'image/jpeg']),
  ('store-logos', 'store-logos', true, 2097152, array['image/webp', 'image/png', 'image/jpeg']),
  ('transfer-images', 'transfer-images', false, 5242880, array['image/webp', 'image/png', 'image/jpeg']),
  ('banners', 'banners', true, 5242880, array['image/webp', 'image/png', 'image/jpeg']),
  ('invoices', 'invoices', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;
