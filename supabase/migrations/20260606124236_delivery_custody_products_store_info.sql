create table if not exists public.delivery_handover_items (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid not null references public.delivery_handovers(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (handover_id, order_item_id)
);

alter table public.delivery_handover_items enable row level security;

grant select, insert on public.delivery_handover_items to authenticated, service_role;

drop policy if exists delivery_handover_items_read on public.delivery_handover_items;
create policy delivery_handover_items_read on public.delivery_handover_items
for select to public
using (
  exists (
    select 1
    from public.delivery_handovers dh
    where dh.id = handover_id
      and (dh.delivery_id = (select auth.uid()) or private.is_admin())
  )
);

drop policy if exists delivery_handover_items_delivery_insert on public.delivery_handover_items;
create policy delivery_handover_items_delivery_insert on public.delivery_handover_items
for insert to public
with check (
  exists (
    select 1
    from public.delivery_handovers dh
    where dh.id = handover_id
      and dh.delivery_id = (select auth.uid())
      and dh.status = 'pending'
      and dh.type = 'return_goods'
  )
);

create or replace function public.get_delivery_custody()
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
    'orders',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', o.id,
            'order_number', o.order_number,
            'customer_name', o.customer_name,
            'customer_phone', o.customer_phone,
            'customer_address', o.customer_address,
            'city_id', o.city_id,
            'zone_id', o.zone_id,
            'city_name', c.name_ar,
            'zone_name', z.name_ar,
            'delivery_fee', o.delivery_fee,
            'total', o.total,
            'payment_method', o.payment_method,
            'payment_status', o.payment_status,
            'status', o.status,
            'created_at', o.created_at,
            'store_name', coalesce(vs.store_name, 'متجر الشركة'),
            'store_phone', vs.contact_phone
          )
          order by o.created_at desc
        )
        from public.orders o
        join public.cities c on c.id = o.city_id
        join public.zones z on z.id = o.zone_id
        left join public.virtual_stores vs on vs.id = o.virtual_store_id
        where o.delivery_id = actor_id
          and o.status in ('out_for_delivery', 'partial_return', 'full_return', 'cancelled')
      ),
      '[]'::jsonb
    ),
    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'order_id', o.id,
            'order_number', o.order_number,
            'order_status', o.status,
            'customer_name', o.customer_name,
            'city_name', c.name_ar,
            'zone_name', z.name_ar,
            'store_name', coalesce(vs.store_name, 'متجر الشركة'),
            'product_id', oi.product_id,
            'product_name', p.name_ar,
            'variant_id', oi.product_variant_id,
            'variant_label', coalesce(nullif(concat_ws(' / ', pv.color, pv.size, pv.type), ''), 'الخيار الأساسي'),
            'image_url', coalesce(pv.image_url, p.images->>0),
            'warehouse_id', oi.warehouse_id,
            'quantity', oi.quantity,
            'custody_quantity',
              case
                when o.status = 'partial_return' then coalesce(ri.return_quantity, 0)
                else oi.quantity
              end,
            'returnable_quantity',
              greatest(
                case
                  when o.status = 'partial_return' then coalesce(ri.return_quantity, 0)
                  when o.status in ('full_return', 'cancelled') then oi.quantity
                  else 0
                end - coalesce(dhi.handover_quantity, 0),
                0
              ),
            'returnable',
              o.status in ('partial_return', 'full_return', 'cancelled')
              and greatest(
                case
                  when o.status = 'partial_return' then coalesce(ri.return_quantity, 0)
                  when o.status in ('full_return', 'cancelled') then oi.quantity
                  else 0
                end - coalesce(dhi.handover_quantity, 0),
                0
              ) > 0
          )
          order by o.created_at desc, p.name_ar
        )
        from public.orders o
        join public.cities c on c.id = o.city_id
        join public.zones z on z.id = o.zone_id
        join public.order_items oi on oi.order_id = o.id
        join public.products p on p.id = oi.product_id
        join public.product_variants pv on pv.id = oi.product_variant_id
        left join public.virtual_stores vs on vs.id = o.virtual_store_id
        left join lateral (
          select coalesce(sum(ri.quantity), 0)::integer as return_quantity
          from public."returns" r
          join public.return_items ri on ri.return_id = r.id
          where r.order_id = o.id
            and ri.order_item_id = oi.id
            and r.status = 'pending'
        ) ri on true
        left join lateral (
          select coalesce(sum(dhi.quantity), 0)::integer as handover_quantity
          from public.delivery_handover_items dhi
          join public.delivery_handovers dh on dh.id = dhi.handover_id
          where dhi.order_item_id = oi.id
            and dh.type = 'return_goods'
            and dh.status in ('pending', 'confirmed')
        ) dhi on true
        where o.delivery_id = actor_id
          and o.status in ('out_for_delivery', 'partial_return', 'full_return', 'cancelled')
          and (
            o.status = 'out_for_delivery'
            or greatest(
              case
                when o.status = 'partial_return' then coalesce(ri.return_quantity, 0)
                else oi.quantity
              end - coalesce(dhi.handover_quantity, 0),
              0
            ) > 0
          )
          and (
            o.status <> 'partial_return'
            or coalesce(ri.return_quantity, 0) > 0
          )
      ),
      '[]'::jsonb
    )
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
      'created_at', target_order.created_at,
      'store_name', coalesce((select vs.store_name from public.virtual_stores vs where vs.id = target_order.virtual_store_id), 'متجر الشركة'),
      'store_phone', (select vs.contact_phone from public.virtual_stores vs where vs.id = target_order.virtual_store_id)
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

create or replace function public.create_delivery_handover(
  p_type text,
  p_order_ids uuid[] default null,
  p_items jsonb default null
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
  item jsonb;
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
  elsif handover_type = 'return_goods'
    and p_items is not null
    and jsonb_typeof(p_items) = 'array'
    and jsonb_array_length(p_items) > 0 then
    select array_agg(distinct oi.order_id)
    into selected_ids
    from jsonb_array_elements(p_items) selected_item
    join public.order_items oi on oi.id = (selected_item->>'order_item_id')::uuid;
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
        and status not in ('partial_return', 'full_return', 'cancelled')
    ) then
      raise exception 'INVALID_RETURN_HANDOVER' using errcode = 'P0001';
    end if;

    if p_items is not null
      and jsonb_typeof(p_items) = 'array'
      and jsonb_array_length(p_items) > 0
      and exists (
        select 1
        from jsonb_array_elements(p_items) selected_item
        left join public.order_items oi on oi.id = (selected_item->>'order_item_id')::uuid
        left join public.orders o on o.id = oi.order_id
        left join lateral (
          select coalesce(sum(ri.quantity), 0)::integer as return_quantity
          from public."returns" r
          join public.return_items ri on ri.return_id = r.id
          where r.order_id = o.id
            and ri.order_item_id = oi.id
            and r.status = 'pending'
        ) ri on true
        left join lateral (
          select coalesce(sum(dhi.quantity), 0)::integer as handover_quantity
          from public.delivery_handover_items dhi
          join public.delivery_handovers dh on dh.id = dhi.handover_id
          where dhi.order_item_id = oi.id
            and dh.type = 'return_goods'
            and dh.status in ('pending', 'confirmed')
        ) dhi on true
        where oi.id is null
          or o.delivery_id <> actor_id
          or o.status not in ('partial_return', 'full_return', 'cancelled')
          or coalesce((selected_item->>'quantity')::integer, 0) <= 0
          or coalesce((selected_item->>'quantity')::integer, 0) > greatest(
            case
              when o.status = 'partial_return' then coalesce(ri.return_quantity, 0)
              else oi.quantity
            end - coalesce(dhi.handover_quantity, 0),
            0
          )
      ) then
      raise exception 'INVALID_RETURN_HANDOVER_ITEMS' using errcode = 'P0001';
    end if;
  end if;

  insert into public.delivery_handovers (delivery_id, type, order_ids, total_amount, status)
  values (actor_id, handover_type, to_jsonb(selected_ids), selected_total, 'pending')
  returning * into handover_row;

  if handover_type = 'return_goods'
    and p_items is not null
    and jsonb_typeof(p_items) = 'array'
    and jsonb_array_length(p_items) > 0 then
    for item in select value from jsonb_array_elements(p_items)
    loop
      insert into public.delivery_handover_items (handover_id, order_item_id, quantity)
      values (
        handover_row.id,
        (item->>'order_item_id')::uuid,
        (item->>'quantity')::integer
      )
      on conflict (handover_id, order_item_id)
      do update set quantity = excluded.quantity;
    end loop;
  end if;

  insert into public.notifications (user_id, title, body, type, reference_id)
  select u.id,
         'عهدة جديدة من مندوب',
         case when handover_type = 'return_goods'
           then 'يوجد طلب عهدة مرتجعات يحتاج تأكيداً من الإدارة.'
           else 'يوجد طلب عهدة كاش يحتاج تأكيداً من الإدارة.'
         end,
         'delivery_handover_requested',
         handover_row.id
  from public.users u
  where u.role in ('super_admin', 'admin') and u.is_active = true;

  return to_jsonb(handover_row);
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
  return_item record;
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

  if handover.type = 'return_goods' then
    for target_order_id in
      select value::uuid from jsonb_array_elements_text(handover.order_ids)
    loop
      for return_item in
        select
          oi.product_variant_id,
          oi.warehouse_id,
          case
            when dhi.id is not null then least(
              dhi.quantity,
              case
                when o.status = 'partial_return' then coalesce(ri.quantity, 0)
                else oi.quantity
              end
            )
            when o.status = 'partial_return' then coalesce(ri.quantity, 0)
            else oi.quantity
          end as quantity,
          r.id as return_id
        from public.orders o
        join public.order_items oi on oi.order_id = o.id
        left join public."returns" r on r.order_id = o.id and r.status = 'pending'
        left join public.return_items ri on ri.return_id = r.id and ri.order_item_id = oi.id
        left join public.delivery_handover_items dhi on dhi.handover_id = handover.id and dhi.order_item_id = oi.id
        where o.id = target_order_id
          and o.status in ('partial_return', 'full_return', 'cancelled')
          and oi.warehouse_id is not null
          and (
            not exists (
              select 1
              from public.delivery_handover_items check_item
              where check_item.handover_id = handover.id
            )
            or dhi.id is not null
          )
          and (
            o.status <> 'partial_return'
            or coalesce(ri.quantity, 0) > 0
          )
      loop
        if return_item.quantity > 0 then
          insert into public.warehouse_inventory (
            warehouse_id, product_variant_id, quantity_available, quantity_reserved, low_stock_threshold
          )
          values (return_item.warehouse_id, return_item.product_variant_id, return_item.quantity, 0, 0)
          on conflict (warehouse_id, product_variant_id)
          do update set quantity_available = public.warehouse_inventory.quantity_available + excluded.quantity_available;

          insert into public.warehouse_movements (
            warehouse_id, product_variant_id, type, quantity, reference_type, reference_id, note, created_by
          )
          values (
            return_item.warehouse_id,
            return_item.product_variant_id,
            'return',
            return_item.quantity,
            'return',
            coalesce(return_item.return_id, p_handover_id),
            'تأكيد عهدة مرتجعات من مندوب',
            actor_id
          );
        end if;
      end loop;

      update public."returns"
      set status = 'confirmed',
          confirmed_by = actor_id,
          return_warehouse_id = coalesce(return_warehouse_id, (
            select oi.warehouse_id
            from public.order_items oi
            where oi.order_id = target_order_id and oi.warehouse_id is not null
            limit 1
          ))
      where order_id = target_order_id
        and status = 'pending'
        and not exists (
          select 1
          from public.orders check_order
          join public.order_items check_item on check_item.order_id = check_order.id
          left join public.return_items check_return_item on check_return_item.order_item_id = check_item.id
          where check_order.id = target_order_id
            and check_item.warehouse_id is not null
            and (
              case
                when check_order.status = 'partial_return' then coalesce(check_return_item.quantity, 0)
                else check_item.quantity
              end
            ) > coalesce(
              (
                select sum(confirmed_item.quantity)
                from public.delivery_handover_items confirmed_item
                join public.delivery_handovers confirmed_handover on confirmed_handover.id = confirmed_item.handover_id
                where confirmed_item.order_item_id = check_item.id
                  and confirmed_handover.type = 'return_goods'
                  and confirmed_handover.status = 'confirmed'
              ),
              0
            )
        );
    end loop;

    return jsonb_build_object('handover_id', p_handover_id, 'status', 'confirmed', 'type', handover.type);
  end if;

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

  return jsonb_build_object('handover_id', p_handover_id, 'status', 'confirmed', 'type', handover.type);
end;
$$;

grant execute on function public.get_delivery_custody() to authenticated, service_role;
grant execute on function public.get_delivery_order_details(uuid) to authenticated, service_role;
grant execute on function public.create_delivery_handover(text, uuid[], jsonb) to authenticated, service_role;
grant execute on function public.confirm_cash_handover(uuid) to authenticated, service_role;
