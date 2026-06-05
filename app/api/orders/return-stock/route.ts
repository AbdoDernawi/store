import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ReturnStockBody = {
  items?: Array<{
    productVariantId?: string;
    product_variant_id?: string;
    targetWarehouseId?: string;
    target_warehouse_id?: string;
    quantity?: number;
  }>;
  referenceId?: string;
  reference_id?: string;
  note?: string;
};

function normalizeItems(items: ReturnStockBody["items"]) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    product_variant_id: item.product_variant_id || item.productVariantId,
    target_warehouse_id: item.target_warehouse_id || item.targetWarehouseId,
    quantity: Number(item.quantity || 0),
  }));
}

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ReturnStockBody>(request);
  const items = normalizeItems(body.items);

  if (!items.length || items.some((item) => !item.product_variant_id || !item.target_warehouse_id || item.quantity <= 0)) {
    return jsonError("أضف منتجًا مرتجعًا واحدًا على الأقل بكمية ومخزن صحيحين.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("return_stock", {
    p_items: items,
    p_reference_id: body.reference_id || body.referenceId || null,
    p_note: body.note || null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ returned: data });
}
