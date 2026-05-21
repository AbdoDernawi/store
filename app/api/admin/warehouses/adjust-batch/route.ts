import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type AdjustBatchItem = {
  product_variant_id?: string;
  delta?: number;
};

type AdjustBatchBody = {
  warehouse_id?: string;
  items?: AdjustBatchItem[];
  note?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<AdjustBatchBody>(request);
  const items = Array.isArray(body.items)
    ? body.items
        .map((item) => ({
          product_variant_id: String(item.product_variant_id || ""),
          delta: Number(item.delta || 0),
        }))
        .filter((item) => item.product_variant_id && item.delta !== 0)
    : [];

  if (!body.warehouse_id) {
    return jsonError("اختر المخزن المطلوب.", 400);
  }

  if (!items.length) {
    return jsonError("أضف منتجاً واحداً على الأقل إلى سلة التعديل.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("admin_adjust_inventory_batch", {
    p_warehouse_id: body.warehouse_id,
    p_items: items,
    p_note: body.note || null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ result: data });
}
