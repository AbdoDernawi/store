create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.users(id) on delete cascade,
  label text not null default 'عنوان',
  recipient_name text not null,
  phone varchar(32) not null,
  city_id uuid not null references public.cities(id) on delete restrict,
  zone_id uuid not null references public.zones(id) on delete restrict,
  address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_addresses_customer
on public.customer_addresses(customer_id, is_default desc, created_at desc);

alter table public.customer_addresses enable row level security;

grant select, insert, update, delete on public.customer_addresses to authenticated, service_role;

drop policy if exists customer_addresses_owner_select on public.customer_addresses;
create policy customer_addresses_owner_select
on public.customer_addresses for select
using (customer_id = auth.uid() or private.is_admin());

drop policy if exists customer_addresses_owner_insert on public.customer_addresses;
create policy customer_addresses_owner_insert
on public.customer_addresses for insert
with check (customer_id = auth.uid());

drop policy if exists customer_addresses_owner_update on public.customer_addresses;
create policy customer_addresses_owner_update
on public.customer_addresses for update
using (customer_id = auth.uid())
with check (customer_id = auth.uid());

drop policy if exists customer_addresses_owner_delete on public.customer_addresses;
create policy customer_addresses_owner_delete
on public.customer_addresses for delete
using (customer_id = auth.uid());

create or replace function public.get_customer_catalog()
returns table (
  id uuid,
  category_id uuid,
  category_name text,
  name_ar text,
  description_ar text,
  images jsonb,
  customer_price numeric,
  available_quantity integer,
  variants jsonb
)
language sql
stable
security definer
set search_path = public, private
as $$
  select
    p.id,
    p.category_id,
    c.name_ar as category_name,
    p.name_ar,
    p.description_ar,
    p.images,
    p.customer_price,
    coalesce(product_stock.available_quantity, 0)::int as available_quantity,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pv.id,
          'color', pv.color,
          'size', pv.size,
          'type', pv.type,
          'image_url', pv.image_url,
          'extra_price', pv.extra_price,
          'available_quantity', coalesce(variant_stock.available_quantity, 0)
        )
        order by pv.color nulls last, pv.size nulls last, pv.type nulls last
      ) filter (where pv.id is not null),
      '[]'::jsonb
    ) as variants
  from public.products p
  left join public.categories c on c.id = p.category_id and c.is_active = true
  left join lateral (
    select coalesce(sum(wi.quantity_available), 0)::int as available_quantity
    from public.product_variants pv2
    left join public.warehouse_inventory wi on wi.product_variant_id = pv2.id
    where pv2.product_id = p.id and pv2.is_active = true
  ) product_stock on true
  left join public.product_variants pv on pv.product_id = p.id and pv.is_active = true
  left join lateral (
    select coalesce(sum(wi.quantity_available), 0)::int as available_quantity
    from public.warehouse_inventory wi
    where wi.product_variant_id = pv.id
  ) variant_stock on true
  where p.is_active = true
    and private.current_user_role() = 'customer'
  group by p.id, c.name_ar, product_stock.available_quantity
  order by p.created_at desc;
$$;

create or replace function public.get_customer_orders()
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
  if actor_role <> 'customer' then
    raise exception 'FORBIDDEN_CUSTOMER' using errcode = 'P0001';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'order_number', o.order_number,
          'customer_name', o.customer_name,
          'customer_phone', o.customer_phone,
          'customer_address', o.customer_address,
          'city_name', c.name_ar,
          'zone_name', z.name_ar,
          'delivery_name', d.full_name,
          'delivery_phone', d.phone,
          'delivery_fee', o.delivery_fee,
          'subtotal', o.subtotal,
          'discount_amount', o.discount_amount,
          'total', o.total,
          'payment_method', o.payment_method,
          'payment_status', o.payment_status,
          'status', o.status,
          'cancellation_requested_by', o.cancellation_requested_by,
          'created_at', o.created_at,
          'items_count', coalesce(items.items_count, 0)
        )
        order by o.created_at desc
      )
      from public.orders o
      left join public.cities c on c.id = o.city_id
      left join public.zones z on z.id = o.zone_id
      left join public.users d on d.id = o.delivery_id
      left join lateral (
        select count(*)::int as items_count
        from public.order_items oi
        where oi.order_id = o.id
      ) items on true
      where o.customer_id = actor_id
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_customer_order_details(p_order_id uuid)
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
  if actor_role <> 'customer' then
    raise exception 'FORBIDDEN_CUSTOMER' using errcode = 'P0001';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_id
    and customer_id = actor_id;

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
      'city_id', target_order.city_id,
      'zone_id', target_order.zone_id,
      'city_name', (select c.name_ar from public.cities c where c.id = target_order.city_id),
      'zone_name', (select z.name_ar from public.zones z where z.id = target_order.zone_id),
      'delivery_name', (select u.full_name from public.users u where u.id = target_order.delivery_id),
      'delivery_phone', (select u.phone from public.users u where u.id = target_order.delivery_id),
      'delivery_fee', target_order.delivery_fee,
      'subtotal', target_order.subtotal,
      'discount_amount', target_order.discount_amount,
      'total', target_order.total,
      'payment_method', target_order.payment_method,
      'payment_status', target_order.payment_status,
      'transfer_image_url', target_order.transfer_image_url,
      'status', target_order.status,
      'cancellation_reason', target_order.cancellation_reason,
      'cancellation_requested_by', target_order.cancellation_requested_by,
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
    )
  );
end;
$$;

create or replace function public.update_pending_customer_order(
  p_order_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_city_id uuid,
  p_zone_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  actor_role public.app_role := private.current_user_role();
  target_order public.orders%rowtype;
  delivery_amount numeric(12,2);
begin
  if actor_role <> 'customer' then
    raise exception 'FORBIDDEN_CUSTOMER' using errcode = 'P0001';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or target_order.customer_id <> actor_id then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if target_order.status <> 'pending_approval' then
    raise exception 'ORDER_NOT_EDITABLE' using errcode = 'P0001';
  end if;

  if nullif(trim(p_customer_name), '') is null
    or nullif(trim(p_customer_phone), '') is null
    or nullif(trim(p_customer_address), '') is null then
    raise exception 'INVALID_CUSTOMER_DETAILS' using errcode = 'P0001';
  end if;

  select delivery_fee into delivery_amount
  from public.zones
  where id = p_zone_id
    and city_id = p_city_id
    and is_active = true;

  if delivery_amount is null then
    raise exception 'INVALID_DELIVERY_ZONE' using errcode = 'P0001';
  end if;

  update public.orders
  set customer_name = trim(p_customer_name),
      customer_phone = trim(p_customer_phone),
      customer_address = trim(p_customer_address),
      city_id = p_city_id,
      zone_id = p_zone_id,
      delivery_fee = delivery_amount
  where id = p_order_id
  returning * into target_order;

  insert into public.order_status_history (order_id, status, changed_by, note)
  values (p_order_id, target_order.status, actor_id, 'تعديل بيانات الطلب من الزبون');

  return to_jsonb(target_order);
end;
$$;

create or replace function public.request_customer_order_cancellation(
  p_order_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  actor_role public.app_role := private.current_user_role();
  target_order public.orders%rowtype;
begin
  if actor_role <> 'customer' then
    raise exception 'FORBIDDEN_CUSTOMER' using errcode = 'P0001';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or target_order.customer_id <> actor_id then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if target_order.status in ('rejected', 'cancelled', 'delivered', 'partial_return', 'full_return') then
    raise exception 'ORDER_CANNOT_BE_CANCELLED' using errcode = 'P0001';
  end if;

  if target_order.status = 'pending_approval' then
    update public.orders
    set status = 'cancelled',
        cancellation_reason = p_reason,
        cancellation_requested_by = actor_id
    where id = p_order_id;

    insert into public.order_status_history (order_id, status, changed_by, note)
    values (p_order_id, 'cancelled', actor_id, p_reason);

    return jsonb_build_object('order_id', p_order_id, 'status', 'cancelled', 'requested', false);
  end if;

  update public.orders
  set cancellation_reason = p_reason,
      cancellation_requested_by = actor_id
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, changed_by, note)
  values (p_order_id, target_order.status, actor_id, 'طلب إلغاء من الزبون: ' || coalesce(p_reason, 'بدون سبب'));

  perform private.notify_admins_for_order(
    p_order_id,
    'طلب إلغاء من زبون',
    coalesce(p_reason, 'يوجد طلب إلغاء يحتاج مراجعة.'),
    'order_cancellation_requested'
  );

  return jsonb_build_object('order_id', p_order_id, 'status', target_order.status, 'requested', true);
end;
$$;

create or replace function public.create_store_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_city_id uuid,
  p_zone_id uuid,
  p_payment_method public.payment_method,
  p_transfer_image_url text,
  p_items jsonb,
  p_virtual_store_id uuid default null,
  p_discount_amount numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  actor_role public.app_role := private.current_user_role();
  order_kind public.order_type;
  invoice_kind public.invoice_type := 'original';
  delivery_amount numeric(12,2);
  subtotal_amount numeric(12,2) := 0;
  discount_amount numeric(12,2) := greatest(coalesce(p_discount_amount, 0), 0);
  total_amount numeric(12,2);
  new_order_id uuid;
  item jsonb;
  target_variant_id uuid;
  requested_quantity integer;
  available_quantity integer;
  variant_row record;
  unit_amount numeric(12,2);
  commission_amount numeric(12,2);
begin
  if actor_role not in ('marketer', 'customer') then
    raise exception 'FORBIDDEN_ORDER_CREATOR' using errcode = 'P0001';
  end if;

  if nullif(trim(p_customer_name), '') is null
    or nullif(trim(p_customer_phone), '') is null
    or nullif(trim(p_customer_address), '') is null then
    raise exception 'INVALID_CUSTOMER_DETAILS' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'INVALID_ORDER_ITEMS' using errcode = 'P0001';
  end if;

  select delivery_fee into delivery_amount
  from public.zones
  where id = p_zone_id
    and city_id = p_city_id
    and is_active = true;

  if delivery_amount is null then
    raise exception 'INVALID_DELIVERY_ZONE' using errcode = 'P0001';
  end if;

  if actor_role = 'marketer' then
    order_kind := 'marketer';
    if p_virtual_store_id is not null then
      if not exists (
        select 1 from public.virtual_stores
        where id = p_virtual_store_id
          and marketer_id = actor_id
      ) then
        raise exception 'FORBIDDEN_VIRTUAL_STORE' using errcode = 'P0001';
      end if;
      invoice_kind := 'virtual';
    end if;
  else
    order_kind := 'customer';
    p_virtual_store_id := null;
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    target_variant_id := (item->>'product_variant_id')::uuid;
    requested_quantity := coalesce((item->>'quantity')::integer, 0);

    if target_variant_id is null or requested_quantity <= 0 then
      raise exception 'INVALID_ORDER_ITEM' using errcode = 'P0001';
    end if;

    select
      pv.id as variant_id,
      pv.product_id,
      pv.extra_price,
      p.customer_price,
      p.marketer_price,
      p.marketer_commission
    into variant_row
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = target_variant_id
      and pv.is_active = true
      and p.is_active = true;

    if variant_row.variant_id is null then
      raise exception 'PRODUCT_NOT_AVAILABLE' using errcode = 'P0001';
    end if;

    select coalesce(sum(quantity_available), 0)::int
    into available_quantity
    from public.warehouse_inventory
    where product_variant_id = target_variant_id;

    if available_quantity < requested_quantity then
      raise exception 'PRODUCT_OUT_OF_STOCK' using errcode = 'P0001';
    end if;

    if actor_role = 'marketer' then
      unit_amount := variant_row.marketer_price + variant_row.extra_price;
      commission_amount := variant_row.marketer_commission;
    else
      unit_amount := variant_row.customer_price + variant_row.extra_price;
      commission_amount := 0;
    end if;

    subtotal_amount := subtotal_amount + (unit_amount * requested_quantity);
  end loop;

  total_amount := greatest(subtotal_amount - discount_amount, 0);

  insert into public.orders (
    type, customer_name, customer_phone, customer_address,
    city_id, zone_id, delivery_fee, subtotal, discount_amount, total,
    payment_method, payment_status, transfer_image_url, status,
    invoice_type, virtual_store_id, customer_id, marketer_id
  )
  values (
    order_kind, trim(p_customer_name), trim(p_customer_phone), trim(p_customer_address),
    p_city_id, p_zone_id, delivery_amount, subtotal_amount, discount_amount, total_amount,
    p_payment_method, 'pending', p_transfer_image_url, 'pending_approval',
    invoice_kind, p_virtual_store_id,
    case when actor_role = 'customer' then actor_id else null end,
    case when actor_role = 'marketer' then actor_id else null end
  )
  returning id into new_order_id;

  for item in select value from jsonb_array_elements(p_items)
  loop
    target_variant_id := (item->>'product_variant_id')::uuid;
    requested_quantity := coalesce((item->>'quantity')::integer, 0);

    select
      pv.product_id,
      pv.extra_price,
      p.customer_price,
      p.marketer_price,
      p.marketer_commission
    into variant_row
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = target_variant_id;

    if actor_role = 'marketer' then
      unit_amount := variant_row.marketer_price + variant_row.extra_price;
      commission_amount := variant_row.marketer_commission;
    else
      unit_amount := variant_row.customer_price + variant_row.extra_price;
      commission_amount := 0;
    end if;

    insert into public.order_items (
      order_id, product_id, product_variant_id, quantity,
      unit_price, commission_per_unit, total_price, total_commission
    )
    values (
      new_order_id, variant_row.product_id, target_variant_id, requested_quantity,
      unit_amount, commission_amount, unit_amount * requested_quantity,
      commission_amount * requested_quantity
    );
  end loop;

  insert into public.order_status_history (order_id, status, changed_by, note)
  values (new_order_id, 'pending_approval', actor_id, 'تم إنشاء الطلب بانتظار الاعتماد');

  if actor_role = 'marketer' then
    insert into public.marketer_customers (
      marketer_id, customer_name, customer_phone, customer_address, city_id, zone_id, last_ordered_at
    )
    values (
      actor_id, trim(p_customer_name), trim(p_customer_phone), trim(p_customer_address), p_city_id, p_zone_id, now()
    )
    on conflict (marketer_id, customer_phone)
    do update set
      customer_name = excluded.customer_name,
      customer_address = excluded.customer_address,
      city_id = excluded.city_id,
      zone_id = excluded.zone_id,
      last_ordered_at = now();
  end if;

  perform private.notify_admins_for_order(
    new_order_id,
    'طلب جديد بانتظار الاعتماد',
    'يوجد طلب جديد يحتاج مراجعة واعتماد.',
    'order_pending_approval'
  );

  return (
    select to_jsonb(o)
    from public.orders o
    where o.id = new_order_id
  );
end;
$$;

grant execute on function public.get_customer_catalog() to authenticated, service_role;
grant execute on function public.get_customer_orders() to authenticated, service_role;
grant execute on function public.get_customer_order_details(uuid) to authenticated, service_role;
grant execute on function public.update_pending_customer_order(uuid, text, text, text, uuid, uuid) to authenticated, service_role;
grant execute on function public.request_customer_order_cancellation(uuid, text) to authenticated, service_role;
grant execute on function public.create_store_order(
  text, text, text, uuid, uuid, public.payment_method, text, jsonb, uuid, numeric
) to authenticated, service_role;
