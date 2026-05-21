create or replace function public.admin_transfer_stock_batch(
  p_source_warehouse_id uuid,
  p_target_warehouse_id uuid,
  p_items jsonb,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  operation_id uuid := gen_random_uuid();
  item jsonb;
  target_variant_id uuid;
  target_quantity integer;
  source_available integer;
  updated_available integer;
  updated_threshold integer;
  affected jsonb := '[]'::jsonb;
begin
  if p_source_warehouse_id is null or p_target_warehouse_id is null or p_source_warehouse_id = p_target_warehouse_id then
    raise exception 'INVALID_TRANSFER' using errcode = 'P0001';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'NO_TRANSFER_ITEMS' using errcode = 'P0001';
  end if;

  if not private.has_warehouse_scope(p_source_warehouse_id) or not private.has_warehouse_scope(p_target_warehouse_id) then
    raise exception 'FORBIDDEN_WAREHOUSE_SCOPE' using errcode = 'P0001';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    target_variant_id := nullif(item->>'product_variant_id', '')::uuid;
    target_quantity := coalesce((item->>'quantity')::integer, 0);

    if target_variant_id is null or target_quantity <= 0 then
      raise exception 'INVALID_TRANSFER_ITEM' using errcode = 'P0001';
    end if;

    select quantity_available into source_available
    from public.warehouse_inventory
    where warehouse_id = p_source_warehouse_id
      and product_variant_id = target_variant_id
    for update;

    if source_available is null or source_available < target_quantity then
      raise exception 'INSUFFICIENT_SOURCE_STOCK' using errcode = 'P0001';
    end if;

    update public.warehouse_inventory
    set quantity_available = quantity_available - target_quantity,
        updated_at = now()
    where warehouse_id = p_source_warehouse_id
      and product_variant_id = target_variant_id
    returning quantity_available, low_stock_threshold
    into updated_available, updated_threshold;

    insert into public.warehouse_inventory (
      warehouse_id, product_variant_id, quantity_available, quantity_reserved, low_stock_threshold
    )
    values (p_target_warehouse_id, target_variant_id, target_quantity, 0, 0)
    on conflict (warehouse_id, product_variant_id)
    do update set quantity_available = public.warehouse_inventory.quantity_available + excluded.quantity_available,
                  updated_at = now();

    insert into public.warehouse_movements (
      warehouse_id, product_variant_id, type, quantity, reference_type, reference_id, note, created_by
    )
    values
      (p_source_warehouse_id, target_variant_id, 'transfer_out', target_quantity, 'transfer_batch', operation_id, coalesce(p_note, 'تحويل سلة مخزون'), actor_id),
      (p_target_warehouse_id, target_variant_id, 'transfer_in', target_quantity, 'transfer_batch', operation_id, coalesce(p_note, 'تحويل سلة مخزون'), actor_id);

    perform private.notify_stock_state(p_source_warehouse_id, target_variant_id, updated_available, updated_threshold, actor_id);

    affected := affected || jsonb_build_array(jsonb_build_object(
      'product_variant_id', target_variant_id,
      'source_warehouse_id', p_source_warehouse_id,
      'target_warehouse_id', p_target_warehouse_id,
      'quantity', target_quantity
    ));
  end loop;

  return jsonb_build_object(
    'operation_id', operation_id,
    'source_warehouse_id', p_source_warehouse_id,
    'target_warehouse_id', p_target_warehouse_id,
    'items', affected
  );
end;
$$;

create or replace function public.admin_adjust_inventory_batch(
  p_warehouse_id uuid,
  p_items jsonb,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  operation_id uuid := gen_random_uuid();
  item jsonb;
  target_variant_id uuid;
  target_delta integer;
  current_available integer;
  movement_type public.inventory_movement_type;
  affected jsonb := '[]'::jsonb;
begin
  if p_warehouse_id is null then
    raise exception 'INVALID_WAREHOUSE' using errcode = 'P0001';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'NO_ADJUST_ITEMS' using errcode = 'P0001';
  end if;

  if not private.has_warehouse_scope(p_warehouse_id) then
    raise exception 'FORBIDDEN_WAREHOUSE_SCOPE' using errcode = 'P0001';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    target_variant_id := nullif(item->>'product_variant_id', '')::uuid;
    target_delta := coalesce((item->>'delta')::integer, 0);

    if target_variant_id is null or target_delta = 0 then
      raise exception 'INVALID_ADJUST_ITEM' using errcode = 'P0001';
    end if;

    insert into public.warehouse_inventory (
      warehouse_id, product_variant_id, quantity_available, quantity_reserved, low_stock_threshold
    )
    values (p_warehouse_id, target_variant_id, 0, 0, 0)
    on conflict (warehouse_id, product_variant_id) do nothing;

    select quantity_available into current_available
    from public.warehouse_inventory
    where warehouse_id = p_warehouse_id
      and product_variant_id = target_variant_id
    for update;

    if current_available + target_delta < 0 then
      raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
    end if;

    update public.warehouse_inventory
    set quantity_available = quantity_available + target_delta,
        updated_at = now()
    where warehouse_id = p_warehouse_id
      and product_variant_id = target_variant_id;

    movement_type := case when target_delta > 0 then 'in' else 'out' end;

    insert into public.warehouse_movements (
      warehouse_id, product_variant_id, type, quantity, reference_type, reference_id, note, created_by
    )
    values (
      p_warehouse_id, target_variant_id, movement_type, abs(target_delta),
      'manual_adjustment_batch', operation_id, p_note, actor_id
    );

    affected := affected || jsonb_build_array(jsonb_build_object(
      'product_variant_id', target_variant_id,
      'warehouse_id', p_warehouse_id,
      'delta', target_delta,
      'available', current_available + target_delta
    ));
  end loop;

  return jsonb_build_object('operation_id', operation_id, 'warehouse_id', p_warehouse_id, 'items', affected);
end;
$$;

grant execute on function public.admin_transfer_stock_batch(uuid, uuid, jsonb, text) to authenticated, service_role;
grant execute on function public.admin_adjust_inventory_batch(uuid, jsonb, text) to authenticated, service_role;
