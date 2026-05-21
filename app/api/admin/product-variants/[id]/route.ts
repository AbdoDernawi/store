import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type VariantPatchBody = {
  color?: string | null;
  size?: string | null;
  type?: string | null;
  image_url?: string | null;
  extra_price?: number;
  is_active?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<VariantPatchBody>(request);
  const patch: VariantPatchBody = {};

  if ("color" in body) {
    patch.color = clean(body.color);
  }

  if ("size" in body) {
    patch.size = clean(body.size);
  }

  if ("type" in body) {
    patch.type = clean(body.type);
  }

  if ("image_url" in body) {
    patch.image_url = clean(body.image_url);
  }

  if (typeof body.extra_price === "number") {
    patch.extra_price = Math.max(0, body.extra_price);
  }

  if (typeof body.is_active === "boolean") {
    patch.is_active = body.is_active;
  }

  if (!Object.keys(patch).length) {
    return jsonError("لا توجد بيانات لتحديث هذا الخيار.", 400);
  }

  const { error } = await auth.context.supabase
    .from("product_variants")
    .update(patch)
    .eq("id", params.id);

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk();
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const { data: inventory, error: inventoryError } = await auth.context.supabase
    .from("warehouse_inventory")
    .select("quantity_available, quantity_reserved")
    .eq("product_variant_id", params.id);

  if (inventoryError) {
    return mapDatabaseError(inventoryError);
  }

  const hasStock = (inventory || []).some(
    (row) => Number(row.quantity_available || 0) + Number(row.quantity_reserved || 0) > 0,
  );

  if (hasStock) {
    return jsonError("لا يمكن حذف لون أو مقاس عليه مخزون أو كمية محجوزة.", 409, "VARIANT_HAS_STOCK");
  }

  const { data: orderItem } = await auth.context.supabase
    .from("order_items")
    .select("id")
    .eq("product_variant_id", params.id)
    .limit(1)
    .maybeSingle();

  if (orderItem) {
    return jsonError("لا يمكن حذف خيار مستخدم في طلبات سابقة. يمكن تعطيله من البيع بدلاً من حذفه.", 409, "VARIANT_USED_IN_ORDERS");
  }

  const { error } = await auth.context.supabase
    .from("product_variants")
    .delete()
    .eq("id", params.id);

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk();
}

function clean(value?: string | null) {
  const trimmed = String(value || "").trim();

  return trimmed || null;
}
