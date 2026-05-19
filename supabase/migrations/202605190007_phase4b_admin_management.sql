insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  8388608,
  array['image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert
on storage.objects for insert
with check (bucket_id = 'product-images' and private.is_admin());

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update
on storage.objects for update
using (bucket_id = 'product-images' and private.is_admin())
with check (bucket_id = 'product-images' and private.is_admin());

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete
on storage.objects for delete
using (bucket_id = 'product-images' and private.is_admin());

create or replace function public.admin_adjust_inventory(
  p_warehouse_id uuid,
  p_product_variant_id uuid,
  p_delta integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  current_available integer;
  movement_type public.inventory_movement_type;
begin
  if p_delta = 0 then
    raise exception 'ZERO_DELTA';
  end if;

  if not private.has_warehouse_scope(p_warehouse_id) then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.warehouse_inventory (
    warehouse_id,
    product_variant_id,
    quantity_available,
    quantity_reserved,
    low_stock_threshold
  )
  values (p_warehouse_id, p_product_variant_id, 0, 0, 0)
  on conflict (warehouse_id, product_variant_id) do nothing;

  select quantity_available
  into current_available
  from public.warehouse_inventory
  where warehouse_id = p_warehouse_id
    and product_variant_id = p_product_variant_id
  for update;

  if current_available + p_delta < 0 then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  update public.warehouse_inventory
  set
    quantity_available = quantity_available + p_delta,
    updated_at = now()
  where warehouse_id = p_warehouse_id
    and product_variant_id = p_product_variant_id;

  movement_type := case when p_delta > 0 then 'in' else 'out' end;

  insert into public.warehouse_movements (
    warehouse_id,
    product_variant_id,
    type,
    quantity,
    reference_type,
    note,
    created_by
  )
  values (
    p_warehouse_id,
    p_product_variant_id,
    movement_type,
    abs(p_delta),
    'manual_adjustment',
    p_note,
    actor_id
  );

  return jsonb_build_object('available', current_available + p_delta);
end;
$$;

create or replace function public.admin_create_purchase_order(
  p_supplier_id uuid,
  p_warehouse_id uuid,
  p_payment_type public.purchase_payment_type,
  p_paid_amount numeric,
  p_due_date date,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  total_amount numeric(14,2) := 0;
  debt_amount numeric(14,2) := 0;
  purchase_id uuid;
  item jsonb;
  variant_id uuid;
  item_quantity integer;
  item_cost numeric(12,2);
begin
  if not private.has_warehouse_scope(p_warehouse_id) then
    raise exception 'FORBIDDEN';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ITEMS';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    total_amount := total_amount
      + (coalesce((item->>'quantity')::integer, 0) * coalesce((item->>'unit_cost')::numeric, 0));
  end loop;

  if total_amount <= 0 then
    raise exception 'INVALID_TOTAL';
  end if;

  p_paid_amount := greatest(coalesce(p_paid_amount, 0), 0);
  p_paid_amount := least(p_paid_amount, total_amount);
  debt_amount := total_amount - p_paid_amount;

  insert into public.purchase_orders (
    supplier_id,
    warehouse_id,
    total_amount,
    paid_amount,
    debt_amount,
    due_date,
    payment_type,
    status,
    created_by
  )
  values (
    p_supplier_id,
    p_warehouse_id,
    total_amount,
    p_paid_amount,
    debt_amount,
    p_due_date,
    p_payment_type,
    'confirmed',
    actor_id
  )
  returning id into purchase_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    variant_id := (item->>'product_variant_id')::uuid;
    item_quantity := (item->>'quantity')::integer;
    item_cost := (item->>'unit_cost')::numeric;

    if item_quantity <= 0 or item_cost < 0 then
      raise exception 'INVALID_ITEM';
    end if;

    insert into public.purchase_order_items (
      purchase_order_id,
      product_variant_id,
      quantity,
      unit_cost,
      total_cost
    )
    values (
      purchase_id,
      variant_id,
      item_quantity,
      item_cost,
      item_quantity * item_cost
    );

    insert into public.warehouse_inventory (
      warehouse_id,
      product_variant_id,
      quantity_available,
      quantity_reserved,
      low_stock_threshold
    )
    values (p_warehouse_id, variant_id, item_quantity, 0, 0)
    on conflict (warehouse_id, product_variant_id)
    do update set
      quantity_available = public.warehouse_inventory.quantity_available + excluded.quantity_available,
      updated_at = now();

    insert into public.warehouse_movements (
      warehouse_id,
      product_variant_id,
      type,
      quantity,
      reference_type,
      reference_id,
      note,
      created_by
    )
    values (
      p_warehouse_id,
      variant_id,
      'in',
      item_quantity,
      'purchase_order',
      purchase_id,
      'شراء من مورد',
      actor_id
    );
  end loop;

  update public.suppliers
  set total_debt = total_debt + debt_amount
  where id = p_supplier_id;

  if p_paid_amount > 0 then
    insert into public.supplier_payments (supplier_id, purchase_order_id, amount, note, created_by)
    values (p_supplier_id, purchase_id, p_paid_amount, 'دفعة شراء', actor_id);

    insert into public.treasury_transactions (
      treasury_type,
      flow,
      amount,
      source_type,
      source_id,
      note,
      created_by
    )
    values ('cash', 'out', p_paid_amount, 'purchase_order', purchase_id, 'دفعة شراء من مورد', actor_id);

    update public.treasury
    set balance = greatest(balance - p_paid_amount, 0), updated_at = now()
    where type = 'cash';
  end if;

  return jsonb_build_object(
    'purchase_order_id', purchase_id,
    'total_amount', total_amount,
    'debt_amount', debt_amount
  );
end;
$$;

create or replace function public.admin_pay_supplier(
  p_supplier_id uuid,
  p_amount numeric,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  remaining_debt numeric(14,2);
begin
  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  insert into public.supplier_payments (supplier_id, amount, note, created_by)
  values (p_supplier_id, p_amount, p_note, actor_id);

  update public.suppliers
  set total_debt = greatest(total_debt - p_amount, 0)
  where id = p_supplier_id
  returning total_debt into remaining_debt;

  insert into public.treasury_transactions (
    treasury_type,
    flow,
    amount,
    source_type,
    source_id,
    note,
    created_by
  )
  values ('cash', 'out', p_amount, 'supplier_payment', p_supplier_id, p_note, actor_id);

  update public.treasury
  set balance = greatest(balance - p_amount, 0), updated_at = now()
  where type = 'cash';

  return jsonb_build_object('remaining_debt', remaining_debt);
end;
$$;

create or replace function public.admin_record_expense(
  p_type text,
  p_amount numeric,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  expense_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  insert into public.expenses (type, amount, note, created_by)
  values (coalesce(nullif(trim(p_type), ''), 'مصروف'), p_amount, p_note, actor_id)
  returning id into expense_id;

  insert into public.treasury_transactions (
    treasury_type,
    flow,
    amount,
    source_type,
    source_id,
    note,
    created_by
  )
  values ('cash', 'out', p_amount, 'expense', expense_id, p_note, actor_id);

  update public.treasury
  set balance = greatest(balance - p_amount, 0), updated_at = now()
  where type = 'cash';

  return jsonb_build_object('expense_id', expense_id);
end;
$$;

grant execute on function public.admin_adjust_inventory(uuid, uuid, integer, text) to authenticated, service_role;
grant execute on function public.admin_create_purchase_order(uuid, uuid, public.purchase_payment_type, numeric, date, jsonb) to authenticated, service_role;
grant execute on function public.admin_pay_supplier(uuid, numeric, text) to authenticated, service_role;
grant execute on function public.admin_record_expense(text, numeric, text) to authenticated, service_role;
