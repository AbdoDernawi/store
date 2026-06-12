revoke execute on function public.get_customer_catalog() from public, anon;
revoke execute on function public.get_marketer_catalog() from public, anon;
revoke execute on function public.get_delivery_custody() from public, anon;
revoke execute on function public.get_delivery_order_details(uuid) from public, anon;
revoke execute on function public.create_delivery_handover(text, uuid[], jsonb) from public, anon;

grant execute on function public.get_customer_catalog() to authenticated, service_role;
grant execute on function public.get_marketer_catalog() to authenticated, service_role;
grant execute on function public.get_delivery_custody() to authenticated, service_role;
grant execute on function public.get_delivery_order_details(uuid) to authenticated, service_role;
grant execute on function public.create_delivery_handover(text, uuid[], jsonb) to authenticated, service_role;

create index if not exists idx_delivery_handover_items_order_item
  on public.delivery_handover_items(order_item_id);

create index if not exists idx_wallet_access_codes_updated_by
  on public.wallet_access_codes(updated_by)
  where updated_by is not null;

create index if not exists idx_wallet_withdrawal_requests_reviewed_by
  on public.wallet_withdrawal_requests(reviewed_by)
  where reviewed_by is not null;

drop policy if exists delivery_handover_items_read on public.delivery_handover_items;
create policy delivery_handover_items_read on public.delivery_handover_items
for select to authenticated
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
for insert to authenticated
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

drop policy if exists wallet_access_codes_admin_all on public.wallet_access_codes;
create policy wallet_access_codes_admin_all
  on public.wallet_access_codes
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists wallet_withdrawal_requests_owner_select on public.wallet_withdrawal_requests;
create policy wallet_withdrawal_requests_owner_select
  on public.wallet_withdrawal_requests
  for select
  to authenticated
  using (marketer_id = (select auth.uid()));

drop policy if exists wallet_withdrawal_requests_owner_insert on public.wallet_withdrawal_requests;
create policy wallet_withdrawal_requests_owner_insert
  on public.wallet_withdrawal_requests
  for insert
  to authenticated
  with check (
    marketer_id = (select auth.uid())
    and exists (
      select 1
      from public.wallets w
      where w.id = wallet_id
        and w.user_id = (select auth.uid())
    )
  );

drop policy if exists wallet_withdrawal_requests_admin_all on public.wallet_withdrawal_requests;
create policy wallet_withdrawal_requests_admin_all
  on public.wallet_withdrawal_requests
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());
