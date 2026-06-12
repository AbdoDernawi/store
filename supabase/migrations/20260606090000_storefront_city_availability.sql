drop function if exists public.get_customer_catalog();
drop function if exists public.get_marketer_catalog();

create function public.get_customer_catalog()
returns table (
  id uuid,
  category_id uuid,
  category_name text,
  name_ar text,
  description_ar text,
  images jsonb,
  customer_price numeric,
  ordered_quantity integer,
  available_quantity integer,
  city_quantities jsonb,
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
    coalesce(product_orders.ordered_quantity, 0)::int as ordered_quantity,
    coalesce(product_stock.available_quantity, 0)::int as available_quantity,
    coalesce(product_city_stock.city_quantities, '{}'::jsonb) as city_quantities,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pv.id,
          'color', pv.color,
          'size', pv.size,
          'type', pv.type,
          'image_url', pv.image_url,
          'extra_price', pv.extra_price,
          'available_quantity', coalesce(variant_stock.available_quantity, 0),
          'city_quantities', coalesce(variant_city_stock.city_quantities, '{}'::jsonb)
        )
        order by pv.color nulls last, pv.size nulls last, pv.type nulls last
      ) filter (where pv.id is not null),
      '[]'::jsonb
    ) as variants
  from public.products p
  left join public.categories c on c.id = p.category_id and c.is_active = true
  left join lateral (
    select coalesce(sum(oi.quantity), 0)::int as ordered_quantity
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = p.id
      and o.status <> 'cancelled'
  ) product_orders on true
  left join lateral (
    select coalesce(sum(wi.quantity_available), 0)::int as available_quantity
    from public.product_variants pv2
    left join public.warehouse_inventory wi on wi.product_variant_id = pv2.id
    where pv2.product_id = p.id
      and pv2.is_active = true
  ) product_stock on true
  left join lateral (
    select coalesce(jsonb_object_agg(city_id, available_quantity), '{}'::jsonb) as city_quantities
    from (
      select wp.city_id, coalesce(sum(wi.quantity_available), 0)::int as available_quantity
      from public.product_variants pv3
      join public.warehouse_inventory wi on wi.product_variant_id = pv3.id
      join public.warehouse_priorities wp on wp.warehouse_id = wi.warehouse_id
      where pv3.product_id = p.id
        and pv3.is_active = true
      group by wp.city_id
    ) product_city_quantities
  ) product_city_stock on true
  left join public.product_variants pv on pv.product_id = p.id and pv.is_active = true
  left join lateral (
    select coalesce(sum(wi.quantity_available), 0)::int as available_quantity
    from public.warehouse_inventory wi
    where wi.product_variant_id = pv.id
  ) variant_stock on true
  left join lateral (
    select coalesce(jsonb_object_agg(city_id, available_quantity), '{}'::jsonb) as city_quantities
    from (
      select wp.city_id, coalesce(sum(wi.quantity_available), 0)::int as available_quantity
      from public.warehouse_inventory wi
      join public.warehouse_priorities wp on wp.warehouse_id = wi.warehouse_id
      where wi.product_variant_id = pv.id
      group by wp.city_id
    ) variant_city_quantities
  ) variant_city_stock on true
  where p.is_active = true
    and private.current_user_role() = 'customer'
  group by
    p.id,
    c.name_ar,
    product_orders.ordered_quantity,
    product_stock.available_quantity,
    product_city_stock.city_quantities
  order by p.created_at desc;
$$;

create function public.get_marketer_catalog()
returns table (
  id uuid,
  category_id uuid,
  category_name text,
  name_ar text,
  description_ar text,
  images jsonb,
  marketer_price numeric,
  ordered_quantity integer,
  available_quantity integer,
  city_quantities jsonb,
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
    p.marketer_price,
    coalesce(product_orders.ordered_quantity, 0)::int as ordered_quantity,
    coalesce(product_stock.available_quantity, 0)::int as available_quantity,
    coalesce(product_city_stock.city_quantities, '{}'::jsonb) as city_quantities,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pv.id,
          'color', pv.color,
          'size', pv.size,
          'type', pv.type,
          'image_url', pv.image_url,
          'extra_price', pv.extra_price,
          'available_quantity', coalesce(variant_stock.available_quantity, 0),
          'city_quantities', coalesce(variant_city_stock.city_quantities, '{}'::jsonb)
        )
        order by pv.color nulls last, pv.size nulls last, pv.type nulls last
      ) filter (where pv.id is not null),
      '[]'::jsonb
    ) as variants
  from public.products p
  left join public.categories c on c.id = p.category_id and c.is_active = true
  left join lateral (
    select coalesce(sum(oi.quantity), 0)::int as ordered_quantity
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = p.id
      and o.status <> 'cancelled'
  ) product_orders on true
  left join lateral (
    select coalesce(sum(wi.quantity_available), 0)::int as available_quantity
    from public.product_variants pv2
    left join public.warehouse_inventory wi on wi.product_variant_id = pv2.id
    where pv2.product_id = p.id
      and pv2.is_active = true
  ) product_stock on true
  left join lateral (
    select coalesce(jsonb_object_agg(city_id, available_quantity), '{}'::jsonb) as city_quantities
    from (
      select wp.city_id, coalesce(sum(wi.quantity_available), 0)::int as available_quantity
      from public.product_variants pv3
      join public.warehouse_inventory wi on wi.product_variant_id = pv3.id
      join public.warehouse_priorities wp on wp.warehouse_id = wi.warehouse_id
      where pv3.product_id = p.id
        and pv3.is_active = true
      group by wp.city_id
    ) product_city_quantities
  ) product_city_stock on true
  left join public.product_variants pv on pv.product_id = p.id and pv.is_active = true
  left join lateral (
    select coalesce(sum(wi.quantity_available), 0)::int as available_quantity
    from public.warehouse_inventory wi
    where wi.product_variant_id = pv.id
  ) variant_stock on true
  left join lateral (
    select coalesce(jsonb_object_agg(city_id, available_quantity), '{}'::jsonb) as city_quantities
    from (
      select wp.city_id, coalesce(sum(wi.quantity_available), 0)::int as available_quantity
      from public.warehouse_inventory wi
      join public.warehouse_priorities wp on wp.warehouse_id = wi.warehouse_id
      where wi.product_variant_id = pv.id
      group by wp.city_id
    ) variant_city_quantities
  ) variant_city_stock on true
  where p.is_active = true
    and private.current_user_role() = 'marketer'
  group by
    p.id,
    c.name_ar,
    product_orders.ordered_quantity,
    product_stock.available_quantity,
    product_city_stock.city_quantities
  order by p.created_at desc;
$$;

grant execute on function public.get_customer_catalog() to authenticated, service_role;
grant execute on function public.get_marketer_catalog() to authenticated, service_role;
