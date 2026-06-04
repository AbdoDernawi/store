-- Reduce multiple permissive RLS policies on reference/content tables.
-- The new policies preserve the same effective access while avoiding
-- overlapping SELECT/INSERT/UPDATE/DELETE policies per role/action.

drop policy if exists active_cities_read on public.cities;
drop policy if exists admin_cities_manage on public.cities;
drop policy if exists super_admin_all on public.cities;

create policy cities_read on public.cities
for select to public
using (private.is_admin() or (is_active = true and (select auth.uid()) is not null));

create policy cities_admin_insert on public.cities
for insert to public
with check (private.is_admin());

create policy cities_admin_update on public.cities
for update to public
using (private.is_admin())
with check (private.is_admin());

create policy cities_admin_delete on public.cities
for delete to public
using (private.is_admin());

drop policy if exists active_zones_read on public.zones;
drop policy if exists admin_zones_manage on public.zones;
drop policy if exists super_admin_all on public.zones;

create policy zones_read on public.zones
for select to public
using (
  private.has_city_scope(city_id)
  or (is_active = true and (select auth.uid()) is not null)
);

create policy zones_admin_insert on public.zones
for insert to public
with check (private.has_city_scope(city_id));

create policy zones_admin_update on public.zones
for update to public
using (private.has_city_scope(city_id))
with check (private.has_city_scope(city_id));

create policy zones_admin_delete on public.zones
for delete to public
using (private.has_city_scope(city_id));

drop policy if exists active_warehouses_read on public.warehouses;
drop policy if exists admin_warehouses_manage on public.warehouses;
drop policy if exists super_admin_all on public.warehouses;

create policy warehouses_read on public.warehouses
for select to public
using (
  private.has_city_scope(city_id)
  or private.has_warehouse_scope(id)
  or (is_active = true and (select auth.uid()) is not null)
);

create policy warehouses_admin_insert on public.warehouses
for insert to public
with check (private.has_city_scope(city_id));

create policy warehouses_admin_update on public.warehouses
for update to public
using (private.has_city_scope(city_id) or private.has_warehouse_scope(id))
with check (private.has_city_scope(city_id));

create policy warehouses_admin_delete on public.warehouses
for delete to public
using (private.has_city_scope(city_id) or private.has_warehouse_scope(id));

drop policy if exists categories_active_read on public.categories;
drop policy if exists categories_admin_all on public.categories;
drop policy if exists super_admin_all on public.categories;

create policy categories_read on public.categories
for select to public
using (private.is_admin() or (is_active = true and (select auth.uid()) is not null));

create policy categories_admin_insert on public.categories
for insert to public
with check (private.is_admin());

create policy categories_admin_update on public.categories
for update to public
using (private.is_admin())
with check (private.is_admin());

create policy categories_admin_delete on public.categories
for delete to public
using (private.is_admin());

drop policy if exists banners_active_read on public.banners;
drop policy if exists banners_admin_all on public.banners;
drop policy if exists super_admin_all on public.banners;

create policy banners_read on public.banners
for select to public
using (private.is_admin() or (is_active = true and (select auth.uid()) is not null));

create policy banners_admin_insert on public.banners
for insert to public
with check (private.is_admin());

create policy banners_admin_update on public.banners
for update to public
using (private.is_admin())
with check (private.is_admin());

create policy banners_admin_delete on public.banners
for delete to public
using (private.is_admin());
