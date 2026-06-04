-- Final launch hardening:
-- 1) Do not allow unauthenticated RPC execution through the Data API.
-- 2) Keep the existing authenticated/service_role RPC surface used by the app.
-- 3) Remove broad object listing policies from public buckets; public object URLs still work.

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

grant execute on function public.admin_adjust_inventory(uuid, uuid, integer, text) to authenticated, service_role;
grant execute on function public.admin_adjust_inventory_batch(uuid, jsonb, text) to authenticated, service_role;
grant execute on function public.admin_create_expense_type(text, integer) to authenticated, service_role;
grant execute on function public.admin_create_payment_method(text, text, text, integer) to authenticated, service_role;
grant execute on function public.admin_create_purchase_order(uuid, uuid, public.purchase_payment_type, numeric, date, jsonb) to authenticated, service_role;
grant execute on function public.admin_pay_supplier(uuid, numeric, text) to authenticated, service_role;
grant execute on function public.admin_record_expense(text, numeric, text) to authenticated, service_role;
grant execute on function public.admin_record_expense_v2(uuid, uuid, numeric, text) to authenticated, service_role;
grant execute on function public.admin_transfer_stock_batch(uuid, uuid, jsonb, text) to authenticated, service_role;
grant execute on function public.allocate_stock(uuid, jsonb) to authenticated, service_role;
grant execute on function public.approve_order(uuid) to authenticated, service_role;
grant execute on function public.cancel_order(uuid, text) to authenticated, service_role;
grant execute on function public.confirm_bank_transfer_order(uuid) to authenticated, service_role;
grant execute on function public.confirm_cash_handover(uuid) to authenticated, service_role;
grant execute on function public.create_delivery_handover(text, uuid[]) to authenticated, service_role;
grant execute on function public.create_store_order(text, text, text, uuid, uuid, public.payment_method, text, jsonb, uuid, numeric) to authenticated, service_role;
grant execute on function public.deliver_order(uuid, text, text, jsonb) to authenticated, service_role;
grant execute on function public.get_customer_catalog() to authenticated, service_role;
grant execute on function public.get_customer_order_details(uuid) to authenticated, service_role;
grant execute on function public.get_customer_orders() to authenticated, service_role;
grant execute on function public.get_delivery_available_packages() to authenticated, service_role;
grant execute on function public.get_delivery_dashboard() to authenticated, service_role;
grant execute on function public.get_delivery_order_details(uuid) to authenticated, service_role;
grant execute on function public.get_marketer_catalog() to authenticated, service_role;
grant execute on function public.get_marketer_order_details(uuid) to authenticated, service_role;
grant execute on function public.get_or_create_marketer_chat(uuid) to authenticated, service_role;
grant execute on function public.notify_order_created(uuid) to authenticated, service_role;
grant execute on function public.reject_order(uuid, text) to authenticated, service_role;
grant execute on function public.release_order_stock(uuid) to authenticated, service_role;
grant execute on function public.request_customer_order_cancellation(uuid, text) to authenticated, service_role;
grant execute on function public.request_delivery_excuse(uuid, text) to authenticated, service_role;
grant execute on function public.request_order_cancellation(uuid, text) to authenticated, service_role;
grant execute on function public.reserve_order_stock(uuid) to authenticated, service_role;
grant execute on function public.return_stock(jsonb, uuid, text) to authenticated, service_role;
grant execute on function public.scan_package(text) to authenticated, service_role;
grant execute on function public.transfer_stock(uuid, uuid, uuid, integer, text) to authenticated, service_role;
grant execute on function public.update_pending_customer_order(uuid, text, text, text, uuid, uuid) to authenticated, service_role;
grant execute on function public.update_pending_marketer_order(uuid, text, text, text, uuid, uuid) to authenticated, service_role;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;

drop policy if exists product_images_public_read on storage.objects;
drop policy if exists store_logos_public_read on storage.objects;
