create or replace function public.approve_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
  allocations jsonb;
begin
  if not private.can_admin_access_order(p_order_id) then
    raise exception 'FORBIDDEN_ORDER_SCOPE' using errcode = 'P0001';
  end if;

  allocations := public.reserve_order_stock(p_order_id);

  update public.orders
  set status = 'approved'
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, changed_by, note)
  values (p_order_id, 'approved', actor_id, 'تم اعتماد الطلب وحجز المخزون');

  perform private.notify_order_participants(
    p_order_id,
    'تم اعتماد الطلب',
    'تم اعتماد الطلب وبدأت مرحلة التجهيز.',
    'order_approved'
  );

  return jsonb_build_object('order_id', p_order_id, 'status', 'approved', 'allocations', allocations);
end;
$$;

create or replace function public.reject_order(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_admin();
begin
  if not private.can_admin_access_order(p_order_id) then
    raise exception 'FORBIDDEN_ORDER_SCOPE' using errcode = 'P0001';
  end if;

  update public.orders
  set status = 'rejected',
      rejection_reason = p_reason
  where id = p_order_id;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.order_status_history (order_id, status, changed_by, note)
  values (p_order_id, 'rejected', actor_id, p_reason);

  perform private.notify_order_participants(
    p_order_id,
    'تعذر اعتماد الطلب',
    coalesce(p_reason, 'تم رفض الطلب بعد المراجعة.'),
    'order_rejected'
  );

  return jsonb_build_object('order_id', p_order_id, 'status', 'rejected');
end;
$$;

create or replace function public.cancel_order(p_order_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := private.require_authenticated();
  target_order public.orders%rowtype;
  released jsonb := '[]'::jsonb;
  new_status public.order_status;
begin
  select * into target_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    private.can_admin_access_order(p_order_id)
    or target_order.marketer_id = actor_id
    or target_order.customer_id = actor_id
  ) then
    raise exception 'FORBIDDEN_ORDER_SCOPE' using errcode = 'P0001';
  end if;

  if target_order.status = 'pending_approval' then
    new_status := 'cancelled';
  elsif target_order.status in ('approved', 'preparing') and target_order.delivery_id is null then
    if not private.is_admin() then
      raise exception 'CANCEL_REQUIRES_ADMIN_AFTER_APPROVAL' using errcode = 'P0001';
    end if;
    released := public.release_order_stock(p_order_id);
    new_status := 'cancelled';
  elsif target_order.status = 'out_for_delivery' then
    new_status := 'full_return';
  else
    raise exception 'ORDER_CANNOT_BE_CANCELLED' using errcode = 'P0001';
  end if;

  update public.orders
  set status = new_status,
      cancellation_reason = p_reason,
      cancellation_requested_by = actor_id
  where id = p_order_id;

  update public.order_chats
  set is_open = false
  where order_id = p_order_id
    and new_status in ('cancelled', 'full_return');

  insert into public.order_status_history (order_id, status, changed_by, note)
  values (p_order_id, new_status, actor_id, p_reason);

  perform private.notify_order_participants(
    p_order_id,
    'تم تحديث الطلب',
    'تم تحديث حالة الطلب إلى ' || new_status::text || '.',
    'order_cancelled'
  );

  return jsonb_build_object('order_id', p_order_id, 'status', new_status, 'released', released);
end;
$$;

grant execute on function public.approve_order(uuid) to authenticated, service_role;
grant execute on function public.reject_order(uuid, text) to authenticated, service_role;
grant execute on function public.cancel_order(uuid, text) to authenticated, service_role;
