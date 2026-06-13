create or replace function private.order_return_item_value(p_order_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(sum(ri.quantity * oi.unit_price), 0)::numeric
  from public."returns" r
  join public.return_items ri on ri.return_id = r.id
  join public.order_items oi on oi.id = ri.order_item_id
  where r.order_id = p_order_id
    and r.status in ('pending', 'confirmed');
$$;

create or replace function private.order_cash_collectable_amount(p_order_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(
    case
      when o.payment_method <> 'cash' then 0
      when o.payment_status <> 'pending' then 0
      when o.status = 'delivered' then o.total
      when o.status = 'partial_return' then greatest(o.total - private.order_return_item_value(o.id), 0)
      else 0
    end,
    0
  )::numeric
  from public.orders o
  where o.id = p_order_id;
$$;

create or replace function private.order_commission_collectable_amount(p_order_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(sum(
    oi.commission_per_unit * greatest(
      case
        when o.status = 'partial_return' then oi.quantity - coalesce(ri.return_quantity, 0)
        when o.status = 'delivered' then oi.quantity
        else 0
      end,
      0
    )
  ), 0)::numeric
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  left join lateral (
    select coalesce(sum(ri.quantity), 0)::integer as return_quantity
    from public."returns" r
    join public.return_items ri on ri.return_id = r.id
    where r.order_id = o.id
      and ri.order_item_id = oi.id
      and r.status in ('pending', 'confirmed')
  ) ri on true
  where o.id = p_order_id
    and o.status in ('delivered', 'partial_return');
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
      and status in ('delivered', 'partial_return')
      and private.order_cash_collectable_amount(id) > 0;
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
    if exists (
      select 1
      from public.orders o
      where o.id = any(selected_ids)
        and (
          o.delivery_id <> actor_id
          or o.payment_method <> 'cash'
          or o.payment_status <> 'pending'
          or o.status not in ('delivered', 'partial_return')
          or private.order_cash_collectable_amount(o.id) <= 0
        )
    ) then
      raise exception 'INVALID_CASH_HANDOVER_ORDERS' using errcode = 'P0001';
    end if;

    select coalesce(sum(private.order_cash_collectable_amount(o.id)), 0)
    into selected_total
    from public.orders o
    where o.id = any(selected_ids)
      and o.delivery_id = actor_id
      and o.payment_method = 'cash'
      and o.payment_status = 'pending'
      and o.status in ('delivered', 'partial_return');

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
  commission_amount numeric(14,2);
  warehouse_amount record;
  target_wallet_id uuid;
  return_item record;
  confirmed_total numeric(14,2) := 0;
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

  if handover.type = 'return_goods' then
    update public.delivery_handovers
    set status = 'confirmed',
        confirmed_by = actor_id,
        confirmed_at = now()
    where id = p_handover_id;

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
            'Confirmed delivery return handover',
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

  if handover.type not in ('cash_full', 'cash_partial') then
    raise exception 'INVALID_HANDOVER_TYPE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(handover.order_ids) selected_order(order_id)
    left join public.orders o on o.id = selected_order.order_id::uuid
    where o.id is null
      or o.payment_method <> 'cash'
      or o.payment_status <> 'pending'
      or o.status not in ('delivered', 'partial_return')
      or private.order_cash_collectable_amount(o.id) <= 0
  ) then
    raise exception 'INVALID_CASH_HANDOVER_ORDERS' using errcode = 'P0001';
  end if;

  select coalesce(sum(private.order_cash_collectable_amount(selected_order.order_id::uuid)), 0)
  into confirmed_total
  from jsonb_array_elements_text(handover.order_ids) selected_order(order_id);

  if confirmed_total <= 0 then
    raise exception 'NO_CASH_TO_HANDOVER' using errcode = 'P0001';
  end if;

  update public.delivery_handovers
  set status = 'confirmed',
      confirmed_by = actor_id,
      confirmed_at = now(),
      total_amount = confirmed_total
  where id = p_handover_id;

  insert into public.treasury_transactions (treasury_type, flow, amount, source_type, source_id, note, created_by)
  values ('cash', 'in', confirmed_total, 'delivery_handover', p_handover_id, 'Confirmed delivery cash handover', actor_id);

  insert into public.treasury (type, balance)
  values ('cash', confirmed_total)
  on conflict (type)
  do update set balance = public.treasury.balance + excluded.balance;

  for target_order_id in
    select value::uuid from jsonb_array_elements_text(handover.order_ids)
  loop
    update public.orders set payment_status = 'confirmed' where id = target_order_id;

    commission_amount := private.order_commission_collectable_amount(target_order_id);

    if commission_amount > 0 then
      select w.id into target_wallet_id
      from public.wallets w
      join public.orders o on o.marketer_id = w.user_id
      where o.id = target_order_id;

      if target_wallet_id is null then
        insert into public.wallets (user_id, balance)
        select marketer_id, commission_amount
        from public.orders
        where id = target_order_id and marketer_id is not null
        returning id into target_wallet_id;
      else
        update public.wallets
        set balance = balance + commission_amount
        where id = target_wallet_id;
      end if;

      if target_wallet_id is not null then
        insert into public.wallet_transactions (wallet_id, flow, amount, source_type, source_id, note)
        values (target_wallet_id, 'in', commission_amount, 'order_commission', target_order_id, 'Cash order delivered commission');

        insert into public.notifications (user_id, title, body, type, reference_id)
        select marketer_id, 'تمت إضافة عمولتك', 'تمت إضافة عمولة طلب إلى محفظتك.', 'wallet_commission', target_order_id
        from public.orders
        where id = target_order_id and marketer_id is not null;
      end if;
    end if;

    for warehouse_amount in
      select
        oi.warehouse_id,
        coalesce(sum(
          oi.unit_price * greatest(
            case
              when o.status = 'partial_return' then oi.quantity - coalesce(ri.return_quantity, 0)
              else oi.quantity
            end,
            0
          )
        ), 0) as amount
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      left join lateral (
        select coalesce(sum(ri.quantity), 0)::integer as return_quantity
        from public."returns" r
        join public.return_items ri on ri.return_id = r.id
        where r.order_id = o.id
          and ri.order_item_id = oi.id
          and r.status in ('pending', 'confirmed')
      ) ri on true
      where o.id = target_order_id
        and oi.warehouse_id is not null
      group by oi.warehouse_id
      having coalesce(sum(
        oi.unit_price * greatest(
          case
            when o.status = 'partial_return' then oi.quantity - coalesce(ri.return_quantity, 0)
            else oi.quantity
          end,
          0
        )
      ), 0) > 0
    loop
      insert into public.warehouse_treasury_logs (warehouse_id, flow, amount, source_type, source_id, created_by)
      values (warehouse_amount.warehouse_id, 'in', warehouse_amount.amount, 'order', target_order_id, actor_id);
    end loop;
  end loop;

  return jsonb_build_object('handover_id', p_handover_id, 'status', 'confirmed', 'type', handover.type, 'total_amount', confirmed_total);
end;
$$;

grant execute on function public.create_delivery_handover(text, uuid[], jsonb) to authenticated, service_role;
grant execute on function public.confirm_cash_handover(uuid) to authenticated, service_role;
