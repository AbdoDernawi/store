-- Drop redundant super_admin_all policies where an existing admin/scope policy
-- already includes super_admin access through private.is_admin(),
-- private.has_*_scope(), or private.can_admin_access_order().

drop policy if exists super_admin_all on public.discounts;
drop policy if exists super_admin_all on public.expenses;
drop policy if exists super_admin_all on public.invoices;
drop policy if exists super_admin_all on public.order_custom_statuses;
drop policy if exists super_admin_all on public.order_items;
drop policy if exists super_admin_all on public.order_packages;
drop policy if exists super_admin_all on public.product_variants;
drop policy if exists super_admin_all on public.products;
drop policy if exists super_admin_all on public.purchase_order_items;
drop policy if exists super_admin_all on public.purchase_orders;
drop policy if exists super_admin_all on public.supplier_payments;
drop policy if exists super_admin_all on public.suppliers;
drop policy if exists super_admin_all on public.treasury;
drop policy if exists super_admin_all on public.treasury_transactions;
drop policy if exists super_admin_all on public.wallet_transactions;
drop policy if exists super_admin_all on public.wallets;
drop policy if exists super_admin_all on public.warehouse_inventory;
drop policy if exists super_admin_all on public.warehouse_movements;
drop policy if exists super_admin_all on public.warehouse_priorities;
drop policy if exists super_admin_all on public.warehouse_treasury_logs;
