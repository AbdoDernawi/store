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
    insert into public.marketer_customers (marketer_id, customer_name, customer_phone, last_ordered_at)
    values (actor_id, trim(p_customer_name), trim(p_customer_phone), now())
    on conflict (marketer_id, customer_phone)
    do update set customer_name = excluded.customer_name, last_ordered_at = now();
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

grant execute on function public.create_store_order(
  text, text, text, uuid, uuid, public.payment_method, text, jsonb, uuid, numeric
) to authenticated, service_role;
