create or replace function private.require_authenticated()
returns uuid
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  return actor_id;
end;
$$;

create or replace function private.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
begin
  if not private.is_admin() then
    raise exception 'FORBIDDEN_ADMIN' using errcode = 'P0001';
  end if;

  return actor_id;
end;
$$;

create or replace function private.notify_admins_for_order(
  target_order_id uuid,
  notification_title text,
  notification_body text,
  notification_type text
)
returns void
language sql
security definer
set search_path = public, private
as $$
  insert into public.notifications (user_id, title, body, type, reference_id)
  select distinct u.id, notification_title, notification_body, notification_type, target_order_id
  from public.users u
  left join public.orders o on o.id = target_order_id
  left join public.admin_scopes s
    on s.user_id = u.id
    and (
      (s.scope_type = 'city' and s.scope_id = o.city_id)
      or (
        s.scope_type = 'warehouse'
        and exists (
          select 1
          from public.order_items oi
          where oi.order_id = target_order_id
            and oi.warehouse_id = s.scope_id
        )
      )
    )
  where u.is_active = true
    and (
      u.role = 'super_admin'
      or (u.role = 'admin' and s.id is not null)
    );
$$;

create or replace function private.notify_order_participants(
  target_order_id uuid,
  notification_title text,
  notification_body text,
  notification_type text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, title, body, type, reference_id)
  select distinct participant_id, notification_title, notification_body, notification_type, target_order_id
  from (
    select marketer_id as participant_id from public.orders where id = target_order_id
    union
    select customer_id as participant_id from public.orders where id = target_order_id
    union
    select delivery_id as participant_id from public.orders where id = target_order_id
  ) participants
  where participant_id is not null;
$$;

create or replace function private.notify_stock_state(
  target_warehouse_id uuid,
  target_variant_id uuid,
  current_available integer,
  current_threshold integer,
  actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  variant_label text;
  warehouse_label text;
  is_globally_empty boolean;
begin
  select coalesce(p.name_ar, 'منتج') || coalesce(' - ' || nullif(pv.color, ''), '') || coalesce(' / ' || nullif(pv.size, ''), '')
    into variant_label
  from public.product_variants pv
  join public.products p on p.id = pv.product_id
  where pv.id = target_variant_id;

  select name into warehouse_label from public.warehouses where id = target_warehouse_id;

  if current_available <= current_threshold then
    insert into public.notifications (user_id, title, body, type, reference_id)
    select distinct u.id,
      'تنبيه مخزون',
      'الكمية المتاحة من ' || coalesce(variant_label, 'منتج') || ' في ' || coalesce(warehouse_label, 'المخزن') || ' أصبحت منخفضة.',
      'low_stock',
      target_variant_id
    from public.users u
    left join public.warehouses w on w.id = target_warehouse_id
    left join public.admin_scopes s
      on s.user_id = u.id
      and (
        (s.scope_type = 'warehouse' and s.scope_id = target_warehouse_id)
        or (s.scope_type = 'city' and s.scope_id = w.city_id)
      )
    where u.is_active = true
      and (
        u.role = 'super_admin'
        or (u.role = 'admin' and s.id is not null)
      );
  end if;

  select not exists (
    select 1
    from public.warehouse_inventory wi
    where wi.product_variant_id = target_variant_id
      and wi.quantity_available > 0
  ) into is_globally_empty;

  if is_globally_empty then
    insert into public.notifications (user_id, title, body, type, reference_id)
    select u.id,
      'نفاد المنتج',
      'نفدت الكمية المتاحة من ' || coalesce(variant_label, 'منتج') || ' في كل المخازن.',
      'out_of_stock',
      target_variant_id
    from public.users u
    where u.role = 'super_admin'
      and u.is_active = true;
  end if;
end;
$$;

create or replace function public.allocate_stock(p_city_id uuid, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  item jsonb;
  target_variant_id uuid;
  required_qty integer;
  remaining_qty integer;
  take_qty integer;
  inv record;
  allocations jsonb := '[]'::jsonb;
begin
  perform private.require_authenticated();

  if p_city_id is null or p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'INVALID_ALLOCATION_INPUT' using errcode = 'P0001';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    target_variant_id := (item->>'product_variant_id')::uuid;
    required_qty := coalesce((item->>'quantity')::integer, 0);
    remaining_qty := required_qty;

    if target_variant_id is null or required_qty <= 0 then
      raise exception 'INVALID_ALLOCATION_ITEM' using errcode = 'P0001';
    end if;

    for inv in
      select wi.warehouse_id, wi.quantity_available
      from public.warehouse_priorities wp
      join public.warehouse_inventory wi
        on wi.warehouse_id = wp.warehouse_id
       and wi.product_variant_id = target_variant_id
      where wp.city_id = p_city_id
        and wi.quantity_available > 0
      order by wp.priority_order asc
    loop
      take_qty := least(remaining_qty, inv.quantity_available);
      if take_qty > 0 then
        allocations := allocations || jsonb_build_array(jsonb_build_object(
          'product_variant_id', target_variant_id,
          'warehouse_id', inv.warehouse_id,
          'quantity', take_qty
        ));
        remaining_qty := remaining_qty - take_qty;
      end if;

      exit when remaining_qty = 0;
    end loop;

    if remaining_qty > 0 then
      raise exception 'INSUFFICIENT_STOCK:%:%', target_variant_id, remaining_qty using errcode = 'P0001';
    end if;
  end loop;

  return allocations;
end;
$$;

create or replace function public.reserve_order_stock(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  target_order public.orders%rowtype;
  source_item public.order_items%rowtype;
  inv record;
  remaining_qty integer;
  take_qty integer;
  allocation_index integer;
  updated_available integer;
  updated_threshold integer;
  allocations jsonb := '[]'::jsonb;
begin
  select * into target_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not private.can_admin_access_order(p_order_id) then
    raise exception 'FORBIDDEN_ORDER_SCOPE' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.order_items where order_id = p_order_id and warehouse_id is not null) then
    raise exception 'STOCK_ALREADY_RESERVED' using errcode = 'P0001';
  end if;

  for source_item in
    select *
    from public.order_items
    where order_id = p_order_id
    order by id
    for update
  loop
    remaining_qty := source_item.quantity;
    allocation_index := 0;

    for inv in
      select wi.id, wi.warehouse_id, wi.quantity_available
      from public.warehouse_priorities wp
      join public.warehouse_inventory wi
        on wi.warehouse_id = wp.warehouse_id
       and wi.product_variant_id = source_item.product_variant_id
      where wp.city_id = target_order.city_id
        and wi.quantity_available > 0
      order by wp.priority_order asc
      for update of wi
    loop
      take_qty := least(remaining_qty, inv.quantity_available);
      if take_qty <= 0 then
        continue;
      end if;

      update public.warehouse_inventory
      set quantity_available = quantity_available - take_qty,
          quantity_reserved = quantity_reserved + take_qty
      where id = inv.id
        and quantity_available >= take_qty
      returning quantity_available, low_stock_threshold
      into updated_available, updated_threshold;

      if not found then
        raise exception 'STOCK_CHANGED_RETRY' using errcode = 'P0001';
      end if;

      if allocation_index = 0 then
        update public.order_items
        set warehouse_id = inv.warehouse_id,
            quantity = take_qty,
            total_price = unit_price * take_qty,
            total_commission = commission_per_unit * take_qty
        where id = source_item.id;
      else
        insert into public.order_items (
          order_id, product_id, product_variant_id, warehouse_id,
          quantity, unit_price, commission_per_unit, total_price, total_commission
        )
        values (
          source_item.order_id, source_item.product_id, source_item.product_variant_id, inv.warehouse_id,
          take_qty, source_item.unit_price, source_item.commission_per_unit,
          source_item.unit_price * take_qty, source_item.commission_per_unit * take_qty
        );
      end if;

      insert into public.warehouse_movements (
        warehouse_id, product_variant_id, type, quantity, reference_type, reference_id, note, created_by
      )
      values (
        inv.warehouse_id, source_item.product_variant_id, 'reserved', take_qty,
        'order', p_order_id, 'حجز تلقائي عند اعتماد الطلب', actor_id
      );

      allocations := allocations || jsonb_build_array(jsonb_build_object(
        'product_variant_id', source_item.product_variant_id,
        'warehouse_id', inv.warehouse_id,
        'quantity', take_qty
      ));

      perform private.notify_stock_state(inv.warehouse_id, source_item.product_variant_id, updated_available, updated_threshold, actor_id);

      remaining_qty := remaining_qty - take_qty;
      allocation_index := allocation_index + 1;
      exit when remaining_qty = 0;
    end loop;

    if remaining_qty > 0 then
      raise exception 'INSUFFICIENT_STOCK:%:%', source_item.product_variant_id, remaining_qty using errcode = 'P0001';
    end if;
  end loop;

  return allocations;
end;
$$;

create or replace function public.release_order_stock(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  target_item public.order_items%rowtype;
  updated_available integer;
  updated_threshold integer;
  released jsonb := '[]'::jsonb;
begin
  if not private.can_admin_access_order(p_order_id) then
    raise exception 'FORBIDDEN_ORDER_SCOPE' using errcode = 'P0001';
  end if;

  for target_item in
    select *
    from public.order_items
    where order_id = p_order_id
      and warehouse_id is not null
    for update
  loop
    update public.warehouse_inventory
    set quantity_available = quantity_available + target_item.quantity,
        quantity_reserved = greatest(quantity_reserved - target_item.quantity, 0)
    where warehouse_id = target_item.warehouse_id
      and product_variant_id = target_item.product_variant_id
    returning quantity_available, low_stock_threshold
    into updated_available, updated_threshold;

    insert into public.warehouse_movements (
      warehouse_id, product_variant_id, type, quantity, reference_type, reference_id, note, created_by
    )
    values (
      target_item.warehouse_id, target_item.product_variant_id, 'unreserved',
      target_item.quantity, 'order', p_order_id, 'فك حجز الطلب', actor_id
    );

    released := released || jsonb_build_array(jsonb_build_object(
      'product_variant_id', target_item.product_variant_id,
      'warehouse_id', target_item.warehouse_id,
      'quantity', target_item.quantity
    ));
  end loop;

  update public.order_items
  set warehouse_id = null
  where order_id = p_order_id;

  return released;
end;
$$;

create or replace function public.return_stock(p_items jsonb, p_reference_id uuid default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  item jsonb;
  target_variant_id uuid;
  target_warehouse_id uuid;
  target_quantity integer;
  affected jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'INVALID_RETURN_ITEMS' using errcode = 'P0001';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    target_variant_id := (item->>'product_variant_id')::uuid;
    target_warehouse_id := (item->>'target_warehouse_id')::uuid;
    target_quantity := coalesce((item->>'quantity')::integer, 0);

    if target_variant_id is null or target_warehouse_id is null or target_quantity <= 0 then
      raise exception 'INVALID_RETURN_ITEM' using errcode = 'P0001';
    end if;

    if not private.has_warehouse_scope(target_warehouse_id) then
      raise exception 'FORBIDDEN_WAREHOUSE_SCOPE' using errcode = 'P0001';
    end if;

    insert into public.warehouse_inventory (
      warehouse_id, product_variant_id, quantity_available, quantity_reserved, low_stock_threshold
    )
    values (target_warehouse_id, target_variant_id, target_quantity, 0, 0)
    on conflict (warehouse_id, product_variant_id)
    do update set quantity_available = public.warehouse_inventory.quantity_available + excluded.quantity_available;

    insert into public.warehouse_movements (
      warehouse_id, product_variant_id, type, quantity, reference_type, reference_id, note, created_by
    )
    values (
      target_warehouse_id, target_variant_id, 'return', target_quantity,
      'return', p_reference_id, coalesce(p_note, 'إرجاع مخزون'), actor_id
    );

    affected := affected || jsonb_build_array(jsonb_build_object(
      'product_variant_id', target_variant_id,
      'warehouse_id', target_warehouse_id,
      'quantity', target_quantity
    ));
  end loop;

  return affected;
end;
$$;

create or replace function public.transfer_stock(
  p_source_warehouse_id uuid,
  p_target_warehouse_id uuid,
  p_product_variant_id uuid,
  p_quantity integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  source_available integer;
  updated_available integer;
  updated_threshold integer;
begin
  if p_source_warehouse_id = p_target_warehouse_id or p_quantity <= 0 then
    raise exception 'INVALID_TRANSFER' using errcode = 'P0001';
  end if;

  if not private.has_warehouse_scope(p_source_warehouse_id) or not private.has_warehouse_scope(p_target_warehouse_id) then
    raise exception 'FORBIDDEN_WAREHOUSE_SCOPE' using errcode = 'P0001';
  end if;

  select quantity_available into source_available
  from public.warehouse_inventory
  where warehouse_id = p_source_warehouse_id
    and product_variant_id = p_product_variant_id
  for update;

  if source_available is null or source_available < p_quantity then
    raise exception 'INSUFFICIENT_SOURCE_STOCK' using errcode = 'P0001';
  end if;

  update public.warehouse_inventory
  set quantity_available = quantity_available - p_quantity
  where warehouse_id = p_source_warehouse_id
    and product_variant_id = p_product_variant_id
  returning quantity_available, low_stock_threshold
  into updated_available, updated_threshold;

  insert into public.warehouse_inventory (
    warehouse_id, product_variant_id, quantity_available, quantity_reserved, low_stock_threshold
  )
  values (p_target_warehouse_id, p_product_variant_id, p_quantity, 0, 0)
  on conflict (warehouse_id, product_variant_id)
  do update set quantity_available = public.warehouse_inventory.quantity_available + excluded.quantity_available;

  insert into public.warehouse_movements (warehouse_id, product_variant_id, type, quantity, reference_type, note, created_by)
  values
    (p_source_warehouse_id, p_product_variant_id, 'transfer_out', p_quantity, 'transfer', coalesce(p_note, 'تحويل بين المخازن'), actor_id),
    (p_target_warehouse_id, p_product_variant_id, 'transfer_in', p_quantity, 'transfer', coalesce(p_note, 'تحويل بين المخازن'), actor_id);

  perform private.notify_stock_state(p_source_warehouse_id, p_product_variant_id, updated_available, updated_threshold, actor_id);

  return jsonb_build_object(
    'product_variant_id', p_product_variant_id,
    'source_warehouse_id', p_source_warehouse_id,
    'target_warehouse_id', p_target_warehouse_id,
    'quantity', p_quantity
  );
end;
$$;

create or replace function public.scan_package(p_qr_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  actor_role public.app_role := private.current_user_role();
  target_package public.order_packages%rowtype;
  target_order_id uuid;
begin
  if actor_role <> 'delivery' then
    raise exception 'FORBIDDEN_DELIVERY' using errcode = 'P0001';
  end if;

  update public.order_packages
  set assigned_to = actor_id,
      assigned_at = now()
  where qr_code_hash = p_qr_code_hash
    and assigned_to is null
  returning *
  into target_package;

  if not found then
    if exists (select 1 from public.order_packages where qr_code_hash = p_qr_code_hash) then
      raise exception 'PACKAGE_ALREADY_ASSIGNED' using errcode = 'P0001';
    end if;
    raise exception 'PACKAGE_NOT_FOUND' using errcode = 'P0001';
  end if;

  for target_order_id in
    select value::uuid from jsonb_array_elements_text(target_package.order_ids)
  loop
    update public.orders
    set delivery_id = actor_id,
        status = 'out_for_delivery'
    where id = target_order_id;

    insert into public.order_status_history (order_id, status, changed_by, note)
    values (target_order_id, 'out_for_delivery', actor_id, 'تم إسناد الطلب للمندوب عبر QR');

    insert into public.order_chats (order_id, is_open)
    values (target_order_id, true)
    on conflict (order_id) do update set is_open = true;

    perform private.notify_order_participants(
      target_order_id,
      'طلبك خرج للتوصيل',
      'تم إسناد الطلب للمندوب وسيتم التواصل عند الحاجة.',
      'order_out_for_delivery'
    );
  end loop;

  return to_jsonb(target_package);
end;
$$;

create or replace function public.deliver_order(
  p_order_id uuid,
  p_delivery_type text,
  p_reason text default null,
  p_items jsonb default '[]'::jsonb
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
  new_return_id uuid;
  item jsonb;
  new_status public.order_status;
begin
  select * into target_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    private.can_admin_access_order(p_order_id)
    or (actor_role = 'delivery' and target_order.delivery_id = actor_id)
  ) then
    raise exception 'FORBIDDEN_ORDER_SCOPE' using errcode = 'P0001';
  end if;

  if p_delivery_type = 'full' then
    new_status := 'delivered';
  elsif p_delivery_type = 'partial_return' then
    new_status := 'partial_return';
    insert into public."returns" (order_id, type, reason, status)
    values (p_order_id, 'partial', p_reason, 'pending')
    returning id into new_return_id;

    for item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
    loop
      insert into public.return_items (
        return_id, order_item_id, product_variant_id, quantity, original_warehouse_id
      )
      values (
        new_return_id,
        (item->>'order_item_id')::uuid,
        (item->>'product_variant_id')::uuid,
        (item->>'quantity')::integer,
        nullif(item->>'original_warehouse_id', '')::uuid
      );
    end loop;

    update public.invoices
    set has_return = true,
        return_id = new_return_id
    where order_id = p_order_id;
  elsif p_delivery_type = 'full_return' then
    new_status := 'full_return';
    insert into public."returns" (order_id, type, reason, status)
    values (p_order_id, 'full', p_reason, 'pending')
    returning id into new_return_id;
  else
    raise exception 'INVALID_DELIVERY_TYPE' using errcode = 'P0001';
  end if;

  update public.orders
  set status = new_status
  where id = p_order_id;

  update public.order_chats
  set is_open = false
  where order_id = p_order_id;

  insert into public.order_status_history (order_id, status, changed_by, note)
  values (p_order_id, new_status, actor_id, p_reason);

  perform private.notify_order_participants(
    p_order_id,
    'تحديث حالة الطلب',
    'تم تحديث حالة الطلب إلى ' || new_status::text || '.',
    'order_delivered'
  );

  return jsonb_build_object('order_id', p_order_id, 'status', new_status, 'return_id', new_return_id);
end;
$$;

create or replace function public.confirm_cash_handover(p_handover_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  handover public.delivery_handovers%rowtype;
  target_order_id uuid;
  order_commission record;
  warehouse_amount record;
  target_wallet_id uuid;
begin
  select * into handover
  from public.delivery_handovers
  where id = p_handover_id
  for update;

  if not found then
    raise exception 'HANDOVER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if handover.status <> 'pending' then
    raise exception 'HANDOVER_ALREADY_PROCESSED' using errcode = 'P0001';
  end if;

  update public.delivery_handovers
  set status = 'confirmed',
      confirmed_by = actor_id,
      confirmed_at = now()
  where id = p_handover_id;

  insert into public.treasury_transactions (treasury_type, flow, amount, source_type, source_id, note, created_by)
  values ('cash', 'in', handover.total_amount, 'delivery_handover', p_handover_id, 'تأكيد عهدة مندوب', actor_id);

  insert into public.treasury (type, balance)
  values ('cash', handover.total_amount)
  on conflict (type)
  do update set balance = public.treasury.balance + excluded.balance;

  for target_order_id in
    select value::uuid from jsonb_array_elements_text(handover.order_ids)
  loop
    update public.orders set payment_status = 'confirmed' where id = target_order_id;

    for order_commission in
      select o.marketer_id, coalesce(sum(oi.total_commission), 0) as amount
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.id = target_order_id
        and o.marketer_id is not null
      group by o.marketer_id
    loop
      if order_commission.amount > 0 then
        insert into public.wallets (user_id, balance)
        values (order_commission.marketer_id, order_commission.amount)
        on conflict (user_id)
        do update set balance = public.wallets.balance + excluded.balance
        returning id into target_wallet_id;

        insert into public.wallet_transactions (wallet_id, flow, amount, source_type, source_id, note)
        values (target_wallet_id, 'in', order_commission.amount, 'order_commission', target_order_id, 'عمولة طلب مسلّم');

        insert into public.notifications (user_id, title, body, type, reference_id)
        values (order_commission.marketer_id, 'تمت إضافة عمولتك', 'تمت إضافة عمولة طلب إلى محفظتك.', 'wallet_commission', target_order_id);
      end if;
    end loop;

    for warehouse_amount in
      select warehouse_id, coalesce(sum(total_price), 0) as amount
      from public.order_items
      where order_id = target_order_id
        and warehouse_id is not null
      group by warehouse_id
    loop
      insert into public.warehouse_treasury_logs (warehouse_id, flow, amount, source_type, source_id, created_by)
      values (warehouse_amount.warehouse_id, 'in', warehouse_amount.amount, 'order', target_order_id, actor_id);
    end loop;
  end loop;

  return jsonb_build_object('handover_id', p_handover_id, 'status', 'confirmed');
end;
$$;

create or replace function public.confirm_bank_transfer_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  target_order public.orders%rowtype;
  commission_amount numeric(14,2);
  target_wallet_id uuid;
begin
  select * into target_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not private.can_admin_access_order(p_order_id) then
    raise exception 'FORBIDDEN_ORDER_SCOPE' using errcode = 'P0001';
  end if;

  if target_order.payment_method <> 'bank_transfer' then
    raise exception 'ORDER_NOT_BANK_TRANSFER' using errcode = 'P0001';
  end if;

  if target_order.payment_status = 'confirmed' then
    return jsonb_build_object('order_id', p_order_id, 'payment_status', 'confirmed');
  end if;

  update public.orders
  set payment_status = 'confirmed'
  where id = p_order_id;

  insert into public.treasury_transactions (treasury_type, flow, amount, source_type, source_id, note, created_by)
  values ('bank_transfer', 'in', target_order.total, 'order', p_order_id, 'تأكيد تحويل مصرفي', actor_id);

  insert into public.treasury (type, balance)
  values ('bank_transfer', target_order.total)
  on conflict (type)
  do update set balance = public.treasury.balance + excluded.balance;

  if target_order.marketer_id is not null then
    select coalesce(sum(total_commission), 0) into commission_amount
    from public.order_items
    where order_id = p_order_id;

    if commission_amount > 0 then
      insert into public.wallets (user_id, balance)
      values (target_order.marketer_id, commission_amount)
      on conflict (user_id)
      do update set balance = public.wallets.balance + excluded.balance
      returning id into target_wallet_id;

      insert into public.wallet_transactions (wallet_id, flow, amount, source_type, source_id, note)
      values (target_wallet_id, 'in', commission_amount, 'order_commission', p_order_id, 'عمولة تحويل مصرفي مؤكد');

      insert into public.notifications (user_id, title, body, type, reference_id)
      values (target_order.marketer_id, 'تمت إضافة عمولتك', 'تمت إضافة عمولة الطلب المحوّل إلى محفظتك.', 'wallet_commission', p_order_id);
    end if;
  end if;

  if target_order.delivery_id is not null then
    insert into public.notifications (user_id, title, body, type, reference_id)
    values (target_order.delivery_id, 'الطلب مدفوع بتحويل', 'لا تطلب مبلغ الطلب من الزبون؛ التحويل مؤكد.', 'bank_transfer_confirmed', p_order_id);
  end if;

  return jsonb_build_object('order_id', p_order_id, 'payment_status', 'confirmed');
end;
$$;

create or replace function public.notify_order_created(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.can_access_order(p_order_id) then
    raise exception 'FORBIDDEN_ORDER_SCOPE' using errcode = 'P0001';
  end if;

  perform private.notify_admins_for_order(
    p_order_id,
    'طلب جديد بانتظار الاعتماد',
    'يوجد طلب جديد يحتاج مراجعة واعتماد.',
    'order_pending_approval'
  );
end;
$$;

grant execute on function public.allocate_stock(uuid, jsonb) to authenticated, service_role;
grant execute on function public.reserve_order_stock(uuid) to authenticated, service_role;
grant execute on function public.release_order_stock(uuid) to authenticated, service_role;
grant execute on function public.return_stock(jsonb, uuid, text) to authenticated, service_role;
grant execute on function public.transfer_stock(uuid, uuid, uuid, integer, text) to authenticated, service_role;
grant execute on function public.scan_package(text) to authenticated, service_role;
grant execute on function public.deliver_order(uuid, text, text, jsonb) to authenticated, service_role;
grant execute on function public.confirm_cash_handover(uuid) to authenticated, service_role;
grant execute on function public.confirm_bank_transfer_order(uuid) to authenticated, service_role;
grant execute on function public.notify_order_created(uuid) to authenticated, service_role;
