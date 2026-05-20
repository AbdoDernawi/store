insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-logos',
  'store-logos',
  true,
  2097152,
  array['image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists store_logos_public_read on storage.objects;
create policy store_logos_public_read
on storage.objects for select
using (bucket_id = 'store-logos');

drop policy if exists store_logos_marketer_insert on storage.objects;
create policy store_logos_marketer_insert
on storage.objects for insert
with check (
  bucket_id = 'store-logos'
  and private.current_user_role() = 'marketer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists store_logos_marketer_update on storage.objects;
create policy store_logos_marketer_update
on storage.objects for update
using (
  bucket_id = 'store-logos'
  and (
    private.is_admin()
    or (
      private.current_user_role() = 'marketer'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  )
)
with check (
  bucket_id = 'store-logos'
  and (
    private.is_admin()
    or (
      private.current_user_role() = 'marketer'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);

drop policy if exists store_logos_marketer_delete on storage.objects;
create policy store_logos_marketer_delete
on storage.objects for delete
using (
  bucket_id = 'store-logos'
  and (
    private.is_admin()
    or (
      private.current_user_role() = 'marketer'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);

create or replace function public.get_marketer_order_details(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  target_order public.orders%rowtype;
begin
  select * into target_order
  from public.orders
  where id = p_order_id
    and marketer_id = actor_id;

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
      'invoice_type', target_order.invoice_type,
      'virtual_store_id', target_order.virtual_store_id,
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
            'changed_by', h.changed_by,
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
    )
  );
end;
$$;

create or replace function public.update_pending_marketer_order(
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
  target_order public.orders%rowtype;
  delivery_amount numeric(12,2);
begin
  select * into target_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or target_order.marketer_id <> actor_id then
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
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, changed_by, note)
  values (p_order_id, 'pending_approval', actor_id, 'تم تعديل بيانات الطلب من المسوق');

  insert into public.marketer_customers (
    marketer_id, customer_name, customer_phone, customer_address,
    city_id, zone_id, last_ordered_at
  )
  values (
    actor_id, trim(p_customer_name), trim(p_customer_phone), trim(p_customer_address),
    p_city_id, p_zone_id, now()
  )
  on conflict (marketer_id, customer_phone)
  do update set
    customer_name = excluded.customer_name,
    customer_address = excluded.customer_address,
    city_id = excluded.city_id,
    zone_id = excluded.zone_id,
    last_ordered_at = now();

  return (
    select to_jsonb(o)
    from public.orders o
    where o.id = p_order_id
  );
end;
$$;

create or replace function public.request_order_cancellation(
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
  target_order public.orders%rowtype;
begin
  select * into target_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or target_order.marketer_id <> actor_id then
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

    update public.order_chats
    set is_open = false
    where order_id = p_order_id;

    insert into public.order_status_history (order_id, status, changed_by, note)
    values (p_order_id, 'cancelled', actor_id, p_reason);

    return jsonb_build_object('order_id', p_order_id, 'status', 'cancelled', 'requested', false);
  end if;

  update public.orders
  set cancellation_reason = p_reason,
      cancellation_requested_by = actor_id
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, changed_by, note)
  values (p_order_id, target_order.status, actor_id, 'طلب إلغاء من المسوق: ' || coalesce(p_reason, 'بدون سبب'));

  perform private.notify_admins_for_order(
    p_order_id,
    'طلب إلغاء من المسوق',
    coalesce(p_reason, 'يوجد طلب إلغاء يحتاج مراجعة.'),
    'order_cancellation_requested'
  );

  return jsonb_build_object('order_id', p_order_id, 'status', target_order.status, 'requested', true);
end;
$$;

create or replace function public.get_or_create_marketer_chat(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  target_order public.orders%rowtype;
  chat_row public.order_chats%rowtype;
begin
  select * into target_order
  from public.orders
  where id = p_order_id
    and marketer_id = actor_id;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if target_order.status <> 'out_for_delivery' then
    raise exception 'CHAT_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  insert into public.order_chats (order_id, is_open)
  values (p_order_id, true)
  on conflict (order_id) do update
  set is_open = public.order_chats.is_open
  returning * into chat_row;

  return jsonb_build_object(
    'id', chat_row.id,
    'order_id', chat_row.order_id,
    'is_open', chat_row.is_open,
    'created_at', chat_row.created_at
  );
end;
$$;

grant execute on function public.get_marketer_order_details(uuid) to authenticated, service_role;
grant execute on function public.update_pending_marketer_order(uuid, text, text, text, uuid, uuid) to authenticated, service_role;
grant execute on function public.request_order_cancellation(uuid, text) to authenticated, service_role;
grant execute on function public.get_or_create_marketer_chat(uuid) to authenticated, service_role;
