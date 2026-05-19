create schema if not exists private;

grant usage on schema private to anon, authenticated, service_role;

do $$
begin
  if to_regprocedure('public.current_user_role()') is not null then alter function public.current_user_role() set schema private; end if;
  if to_regprocedure('public.is_super_admin()') is not null then alter function public.is_super_admin() set schema private; end if;
  if to_regprocedure('public.is_admin()') is not null then alter function public.is_admin() set schema private; end if;
  if to_regprocedure('public.has_city_scope(uuid)') is not null then alter function public.has_city_scope(uuid) set schema private; end if;
  if to_regprocedure('public.has_warehouse_scope(uuid)') is not null then alter function public.has_warehouse_scope(uuid) set schema private; end if;
  if to_regprocedure('public.can_admin_access_order(uuid)') is not null then alter function public.can_admin_access_order(uuid) set schema private; end if;
  if to_regprocedure('public.can_access_order(uuid)') is not null then alter function public.can_access_order(uuid) set schema private; end if;
  if to_regprocedure('public.can_access_chat(uuid)') is not null then alter function public.can_access_chat(uuid) set schema private; end if;
  if to_regprocedure('public.touch_updated_at()') is not null then alter function public.touch_updated_at() set schema private; end if;
end $$;

create or replace function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid() and is_active = true
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(private.current_user_role() = 'super_admin', false)
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(private.current_user_role() in ('super_admin', 'admin'), false)
$$;

create or replace function private.has_city_scope(target_city_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.is_super_admin()
    or exists (
      select 1
      from public.admin_scopes s
      where s.user_id = auth.uid()
        and s.scope_type = 'city'
        and s.scope_id = target_city_id
    )
$$;

create or replace function private.has_warehouse_scope(target_warehouse_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.is_super_admin()
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

create or replace function private.can_admin_access_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.is_super_admin()
    or exists (
      select 1
      from public.orders o
      where o.id = target_order_id
        and private.has_city_scope(o.city_id)
    )
    or exists (
      select 1
      from public.order_items oi
      where oi.order_id = target_order_id
        and oi.warehouse_id is not null
        and private.has_warehouse_scope(oi.warehouse_id)
    )
$$;

create or replace function private.can_access_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = target_order_id
      and (
        private.can_admin_access_order(o.id)
        or o.marketer_id = auth.uid()
        or o.delivery_id = auth.uid()
        or o.customer_id = auth.uid()
      )
  )
$$;

create or replace function private.can_access_chat(target_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.order_chats c
    join public.orders o on o.id = c.order_id
    where c.id = target_chat_id
      and (
        private.can_admin_access_order(o.id)
        or o.marketer_id = auth.uid()
        or o.delivery_id = auth.uid()
      )
  )
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant execute on all functions in schema private to anon, authenticated, service_role;
