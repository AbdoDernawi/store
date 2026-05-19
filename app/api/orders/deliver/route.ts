import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type DeliverBody = {
  orderId?: string;
  order_id?: string;
  type?: "full" | "partial_return" | "full_return";
  reason?: string;
  items?: Array<{
    orderItemId?: string;
    order_item_id?: string;
    productVariantId?: string;
    product_variant_id?: string;
    originalWarehouseId?: string;
    original_warehouse_id?: string;
    quantity?: number;
  }>;
};

function normalizeItems(items: DeliverBody["items"]) {
  return (items || []).map((item) => ({
    order_item_id: item.order_item_id || item.orderItemId,
    product_variant_id: item.product_variant_id || item.productVariantId,
    original_warehouse_id: item.original_warehouse_id || item.originalWarehouseId || null,
    quantity: Number(item.quantity || 0),
  }));
}

export async function POST(request: Request) {
  const auth = await getApiContext(["delivery", "super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<DeliverBody>(request);

  if (!body.type) {
    return jsonError("اختر نتيجة التسليم أولًا.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("deliver_order", {
    p_order_id: body.order_id || body.orderId,
    p_delivery_type: body.type,
    p_reason: body.reason || null,
    p_items: normalizeItems(body.items),
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ delivery: data });
}
