create table if not exists public.delivery_excuses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  delivery_id uuid not null references public.users(id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, delivery_id, status)
);

alter table public.delivery_excuses enable row level security;

grant select, insert, update on public.delivery_excuses to authenticated, service_role;

drop policy if exists delivery_excuses_delivery_select on public.delivery_excuses;
create policy delivery_excuses_delivery_select
on public.delivery_excuses for select
using (delivery_id = auth.uid() or private.is_admin());

drop policy if exists delivery_excuses_delivery_insert on public.delivery_excuses;
create policy delivery_excuses_delivery_insert
on public.delivery_excuses for insert
with check (delivery_id = auth.uid());

drop policy if exists delivery_excuses_admin_update on public.delivery_excuses;
create policy delivery_excuses_admin_update
on public.delivery_excuses for update
using (private.is_admin())
with check (private.is_admin());

create or replace function public.get_delivery_available_packages()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  actor_role public.app_role := private.current_user_role();
begin
  if actor_role <> 'delivery' then
    raise exception 'FORBIDDEN_DELIVERY' using errcode = 'P0001';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'package_number', p.package_number,
          'qr_code_hash', p.qr_code_hash,
          'created_at', p.created_at,
          'order_count', coalesce(summary.order_count, 0),
          'order_numbers', coalesce(summary.order_numbers, '[]'::jsonb),
          'cities', coalesce(summary.cities, '[]'::jsonb),
          'cash_total', coalesce(summary.cash_total, 0)
        )
        order by p.created_at
      )
      from public.order_packages p
      left join lateral (
        select
          count(*)::int as order_count,
          jsonb_agg(o.order_number order by o.order_number) as order_numbers,
          jsonb_agg(distinct c.name_ar) filter (where c.name_ar is not null) as cities,
          coalesce(sum(o.total) filter (where o.payment_method = 'cash'), 0) as cash_total
        from jsonb_array_elements_text(p.order_ids) ids(order_id)
        join public.orders o on o.id = ids.order_id::uuid
        left join public.cities c on c.id = o.city_id
      ) summary on true
      where p.assigned_to is null
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_delivery_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  actor_role public.app_role := private.current_user_role();
begin
  if actor_role <> 'delivery' then
    raise exception 'FORBIDDEN_DELIVERY' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'custody_count',
      (select count(*) from public.orders where delivery_id = actor_id and status = 'out_for_delivery'),
    'cash_with_me',
      coalesce((
        select sum(total)
        from public.orders
        where delivery_id = actor_id
          and payment_method = 'cash'
          and payment_status = 'pending'
          and status in ('delivered', 'partial_return', 'full_return')
      ), 0),
    'returns_count',
      (select count(*) from public.orders where delivery_id = actor_id and status in ('partial_return', 'full_return')),
    'delivered_today',
      (select count(*)
       from public.order_status_history h
       join public.orders o on o.id = h.order_id
       where o.delivery_id = actor_id
         and h.status = 'delivered'
         and h.created_at >= date_trunc('day', now())),
    'notifications_unread',
      (select count(*) from public.notifications where user_id = actor_id and is_read = false),
    'available_packages',
      public.get_delivery_available_packages()
  );
end;
$$;

create or replace function public.get_delivery_order_details(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  actor_role public.app_role := private.current_user_role();
  target_order public.orders%rowtype;
begin
  if actor_role <> 'delivery' then
    raise exception 'FORBIDDEN_DELIVERY' using errcode = 'P0001';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_id
    and delivery_id = actor_id;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'order',
    jsonb_build_object(
      'id', target_order.id,
      'order_number', target_order.order_number,
      'customer_name', target_order.customer_name,
      'customer_phone', target_order.customer_phone,
      'customer_address', target_order.customer_address,
      'city_name', (select c.name_ar from public.cities c where c.id = target_order.city_id),
      'zone_name', (select z.name_ar from public.zones z where z.id = target_order.zone_id),
      'delivery_fee', target_order.delivery_fee,
      'subtotal', target_order.subtotal,
      'discount_amount', target_order.discount_amount,
      'total', target_order.total,
      'payment_method', target_order.payment_method,
      'payment_status', target_order.payment_status,
      'status', target_order.status,
      'created_at', target_order.created_at
    ),
    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', p.name_ar,
            'variant_id', oi.product_variant_id,
            'variant_label', coalesce(nullif(concat_ws(' / ', pv.color, pv.size, pv.type), ''), 'الخيار الأساسي'),
            'warehouse_id', oi.warehouse_id,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price
          )
          order by p.name_ar
        )
        from public.order_items oi
        join public.products p on p.id = oi.product_id
        join public.product_variants pv on pv.id = oi.product_variant_id
        where oi.order_id = p_order_id
      ),
      '[]'::jsonb
    ),
    'history',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', h.id,
            'status', h.status,
            'note', h.note,
            'changed_by_name', u.full_name,
            'created_at', h.created_at
          )
          order by h.created_at
        )
        from public.order_status_history h
        left join public.users u on u.id = h.changed_by
        where h.order_id = p_order_id
      ),
      '[]'::jsonb
    ),
    'chat',
    (
      select jsonb_build_object('id', c.id, 'is_open', c.is_open)
      from public.order_chats c
      where c.order_id = p_order_id
    ),
    'excuse',
    (
      select jsonb_build_object('id', e.id, 'status', e.status, 'reason', e.reason, 'created_at', e.created_at)
      from public.delivery_excuses e
      where e.order_id = p_order_id
        and e.delivery_id = actor_id
      order by e.created_at desc
      limit 1
    )
  );
end;
$$;

create or replace function public.request_delivery_excuse(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  actor_role public.app_role := private.current_user_role();
  target_order public.orders%rowtype;
  excuse_row public.delivery_excuses%rowtype;
begin
  if actor_role <> 'delivery' then
    raise exception 'FORBIDDEN_DELIVERY' using errcode = 'P0001';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_id
    and delivery_id = actor_id
    and status = 'out_for_delivery';

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'INVALID_EXCUSE_REASON' using errcode = 'P0001';
  end if;

  insert into public.delivery_excuses (order_id, delivery_id, reason, status)
  values (p_order_id, actor_id, trim(p_reason), 'pending')
  on conflict (order_id, delivery_id, status)
  do update set reason = excluded.reason, created_at = now()
  returning * into excuse_row;

  insert into public.order_status_history (order_id, status, changed_by, note)
  values (p_order_id, target_order.status, actor_id, 'طلب اعتذار من المندوب: ' || trim(p_reason));

  perform private.notify_admins_for_order(
    p_order_id,
    'طلب اعتذار من مندوب التوصيل',
    trim(p_reason),
    'delivery_excuse_requested'
  );

  return to_jsonb(excuse_row);
end;
$$;

create or replace function public.create_delivery_handover(
  p_type text,
  p_order_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  actor_role public.app_role := private.current_user_role();
  handover_type public.delivery_handover_type;
  selected_ids uuid[];
  selected_total numeric(14,2) := 0;
  handover_row public.delivery_handovers%rowtype;
begin
  if actor_role <> 'delivery' then
    raise exception 'FORBIDDEN_DELIVERY' using errcode = 'P0001';
  end if;

  if p_type not in ('cash_full', 'cash_partial', 'return_goods') then
    raise exception 'INVALID_HANDOVER_TYPE' using errcode = 'P0001';
  end if;

  handover_type := p_type::public.delivery_handover_type;

  if handover_type = 'cash_full' then
    select array_agg(id order by created_at)
    into selected_ids
    from public.orders
    where delivery_id = actor_id
      and payment_method = 'cash'
      and payment_status = 'pending'
      and status in ('delivered', 'partial_return', 'full_return');
  else
    selected_ids := coalesce(p_order_ids, array[]::uuid[]);
  end if;

  if coalesce(array_length(selected_ids, 1), 0) = 0 then
    raise exception 'NO_HANDOVER_ORDERS' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.orders o
    where o.id = any(selected_ids)
      and o.delivery_id <> actor_id
  ) then
    raise exception 'FORBIDDEN_ORDER_SCOPE' using errcode = 'P0001';
  end if;

  if handover_type in ('cash_full', 'cash_partial') then
    select coalesce(sum(total), 0)
    into selected_total
    from public.orders
    where id = any(selected_ids)
      and delivery_id = actor_id
      and payment_method = 'cash'
      and payment_status = 'pending'
      and status in ('delivered', 'partial_return', 'full_return');

    if selected_total <= 0 then
      raise exception 'NO_CASH_TO_HANDOVER' using errcode = 'P0001';
    end if;
  else
    if exists (
      select 1
      from public.orders
      where id = any(selected_ids)
        and status not in ('partial_return', 'full_return')
    ) then
      raise exception 'INVALID_RETURN_HANDOVER' using errcode = 'P0001';
    end if;
  end if;

  insert into public.delivery_handovers (delivery_id, type, order_ids, total_amount, status)
  values (actor_id, handover_type, to_jsonb(selected_ids), selected_total, 'pending')
  returning * into handover_row;

  insert into public.notifications (user_id, title, body, type, reference_id)
  select u.id,
         'عهدة جديدة من مندوب',
         'يوجد طلب عهدة يحتاج تأكيداً من الإدارة.',
         'delivery_handover_requested',
         handover_row.id
  from public.users u
  where u.role in ('super_admin', 'admin') and u.is_active = true;

  return to_jsonb(handover_row);
end;
$$;

grant execute on function public.get_delivery_available_packages() to authenticated, service_role;
grant execute on function public.get_delivery_dashboard() to authenticated, service_role;
grant execute on function public.get_delivery_order_details(uuid) to authenticated, service_role;
grant execute on function public.request_delivery_excuse(uuid, text) to authenticated, service_role;
grant execute on function public.create_delivery_handover(text, uuid[]) to authenticated, service_role;
