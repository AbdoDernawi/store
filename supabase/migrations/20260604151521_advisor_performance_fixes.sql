-- Advisor performance fixes:
-- 1) Add covering indexes for foreign keys reported by Supabase Advisor.
-- 2) Wrap auth.uid() calls in RLS policies with select auth.uid() so Postgres
--    can evaluate the JWT helper once per statement instead of per row.

create index if not exists idx_customer_addresses_city_id
on public.customer_addresses(city_id);

create index if not exists idx_customer_addresses_zone_id
on public.customer_addresses(zone_id);

create index if not exists idx_delivery_excuses_delivery_id
on public.delivery_excuses(delivery_id);

create index if not exists idx_delivery_excuses_reviewed_by
on public.delivery_excuses(reviewed_by);

create index if not exists idx_marketer_customers_city_id
on public.marketer_customers(city_id);

create index if not exists idx_marketer_customers_zone_id
on public.marketer_customers(zone_id);

create index if not exists idx_payment_treasury_transactions_created_by
on public.payment_treasury_transactions(created_by);

drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users
for select to public
using (id = (select auth.uid()));

drop policy if exists users_customer_insert on public.users;
create policy users_customer_insert on public.users
for insert to public
with check (id = (select auth.uid()) and role = 'customer');

drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
for update to public
using (id = (select auth.uid()))
with check (id = (select auth.uid()) and role = private.current_user_role() and is_active = true);

drop policy if exists admin_scopes_self_select on public.admin_scopes;
create policy admin_scopes_self_select on public.admin_scopes
for select to public
using (user_id = (select auth.uid()));

drop policy if exists virtual_stores_marketer_all on public.virtual_stores;
create policy virtual_stores_marketer_all on public.virtual_stores
for all to public
using (marketer_id = (select auth.uid()))
with check (marketer_id = (select auth.uid()));

drop policy if exists marketer_customers_marketer_all on public.marketer_customers;
create policy marketer_customers_marketer_all on public.marketer_customers
for all to public
using (marketer_id = (select auth.uid()))
with check (marketer_id = (select auth.uid()));

drop policy if exists active_cities_read on public.cities;
create policy active_cities_read on public.cities
for select to public
using (is_active = true and (select auth.uid()) is not null);

drop policy if exists active_zones_read on public.zones;
create policy active_zones_read on public.zones
for select to public
using (is_active = true and (select auth.uid()) is not null);

drop policy if exists active_warehouses_read on public.warehouses;
create policy active_warehouses_read on public.warehouses
for select to public
using (is_active = true and (select auth.uid()) is not null);

drop policy if exists categories_active_read on public.categories;
create policy categories_active_read on public.categories
for select to public
using (is_active = true and (select auth.uid()) is not null);

drop policy if exists banners_active_read on public.banners;
create policy banners_active_read on public.banners
for select to public
using (is_active = true and (select auth.uid()) is not null);

drop policy if exists orders_role_select on public.orders;
create policy orders_role_select on public.orders
for select to public
using (
  private.can_admin_access_order(id)
  or marketer_id = (select auth.uid())
  or delivery_id = (select auth.uid())
  or customer_id = (select auth.uid())
);

drop policy if exists orders_marketer_customer_insert on public.orders;
create policy orders_marketer_customer_insert on public.orders
for insert to public
with check (
  (type = 'marketer' and marketer_id = (select auth.uid()))
  or (type = 'customer' and customer_id = (select auth.uid()))
  or private.has_city_scope(city_id)
);

drop policy if exists orders_role_update on public.orders;
create policy orders_role_update on public.orders
for update to public
using (
  private.can_admin_access_order(id)
  or marketer_id = (select auth.uid())
  or delivery_id = (select auth.uid())
  or customer_id = (select auth.uid())
)
with check (
  private.can_admin_access_order(id)
  or marketer_id = (select auth.uid())
  or delivery_id = (select auth.uid())
  or customer_id = (select auth.uid())
);

drop policy if exists packages_delivery_read on public.order_packages;
create policy packages_delivery_read on public.order_packages
for select to public
using (assigned_to is null or assigned_to = (select auth.uid()));

drop policy if exists packages_delivery_claim on public.order_packages;
create policy packages_delivery_claim on public.order_packages
for update to public
using (assigned_to is null or assigned_to = (select auth.uid()))
with check (assigned_to = (select auth.uid()));

drop policy if exists returns_admin_delivery_insert on public."returns";
create policy returns_admin_delivery_insert on public."returns"
for insert to public
with check (
  private.can_admin_access_order(order_id)
  or exists (
    select 1
    from public.orders o
    where o.id = order_id and o.delivery_id = (select auth.uid())
  )
);

drop policy if exists return_items_admin_delivery_insert on public.return_items;
create policy return_items_admin_delivery_insert on public.return_items
for insert to public
with check (
  exists (
    select 1
    from public."returns" r
    join public.orders o on o.id = r.order_id
    where r.id = return_id
      and (private.can_admin_access_order(r.order_id) or o.delivery_id = (select auth.uid()))
  )
);

drop policy if exists chats_access_by_order on public.order_chats;
create policy chats_access_by_order on public.order_chats
for select to public
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (
        private.can_admin_access_order(o.id)
        or o.marketer_id = (select auth.uid())
        or o.delivery_id = (select auth.uid())
      )
  )
);

drop policy if exists chats_admin_delivery_insert on public.order_chats;
create policy chats_admin_delivery_insert on public.order_chats
for insert to public
with check (
  private.can_admin_access_order(order_id)
  or exists (
    select 1
    from public.orders o
    where o.id = order_id and o.delivery_id = (select auth.uid())
  )
);

drop policy if exists chats_admin_delivery_update on public.order_chats;
create policy chats_admin_delivery_update on public.order_chats
for update to public
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (
        private.can_admin_access_order(o.id)
        or o.marketer_id = (select auth.uid())
        or o.delivery_id = (select auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (
        private.can_admin_access_order(o.id)
        or o.marketer_id = (select auth.uid())
        or o.delivery_id = (select auth.uid())
      )
  )
);

drop policy if exists messages_participant_insert on public.chat_messages;
create policy messages_participant_insert on public.chat_messages
for insert to public
with check (sender_id = (select auth.uid()) and private.can_access_chat(chat_id));

drop policy if exists wallets_owner_select on public.wallets;
create policy wallets_owner_select on public.wallets
for select to public
using (user_id = (select auth.uid()));

drop policy if exists wallet_transactions_owner_select on public.wallet_transactions;
create policy wallet_transactions_owner_select on public.wallet_transactions
for select to public
using (
  exists (
    select 1
    from public.wallets w
    where w.id = wallet_id and w.user_id = (select auth.uid())
  )
);

drop policy if exists customer_addresses_owner_select on public.customer_addresses;
create policy customer_addresses_owner_select on public.customer_addresses
for select to public
using (customer_id = (select auth.uid()) or private.is_admin());

drop policy if exists customer_addresses_owner_insert on public.customer_addresses;
create policy customer_addresses_owner_insert on public.customer_addresses
for insert to public
with check (customer_id = (select auth.uid()));

drop policy if exists customer_addresses_owner_update on public.customer_addresses;
create policy customer_addresses_owner_update on public.customer_addresses
for update to public
using (customer_id = (select auth.uid()))
with check (customer_id = (select auth.uid()));

drop policy if exists customer_addresses_owner_delete on public.customer_addresses;
create policy customer_addresses_owner_delete on public.customer_addresses
for delete to public
using (customer_id = (select auth.uid()));

drop policy if exists delivery_excuses_delivery_select on public.delivery_excuses;
create policy delivery_excuses_delivery_select on public.delivery_excuses
for select to public
using (delivery_id = (select auth.uid()) or private.is_admin());

drop policy if exists delivery_excuses_delivery_insert on public.delivery_excuses;
create policy delivery_excuses_delivery_insert on public.delivery_excuses
for insert to public
with check (delivery_id = (select auth.uid()));

drop policy if exists handovers_delivery_select on public.delivery_handovers;
create policy handovers_delivery_select on public.delivery_handovers
for select to public
using (delivery_id = (select auth.uid()) or private.is_admin());

drop policy if exists handovers_delivery_insert on public.delivery_handovers;
create policy handovers_delivery_insert on public.delivery_handovers
for insert to public
with check (delivery_id = (select auth.uid()));

drop policy if exists invoices_access_by_order on public.invoices;
create policy invoices_access_by_order on public.invoices
for select to public
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (
        private.can_admin_access_order(o.id)
        or o.marketer_id = (select auth.uid())
        or o.customer_id = (select auth.uid())
      )
  )
);

drop policy if exists notifications_owner_select on public.notifications;
create policy notifications_owner_select on public.notifications
for select to public
using (user_id = (select auth.uid()));

drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications
for update to public
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
