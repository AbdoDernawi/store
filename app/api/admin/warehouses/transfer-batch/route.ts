import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type TransferBatchItem = {
  product_variant_id?: string;
  quantity?: number;
};

type TransferBatchBody = {
  source_warehouse_id?: string;
  target_warehouse_id?: string;
  items?: TransferBatchItem[];
  note?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<TransferBatchBody>(request);
  const items = Array.isArray(body.items)
    ? body.items
        .map((item) => ({
          product_variant_id: String(item.product_variant_id || ""),
          quantity: Number(item.quantity || 0),
        }))
        .filter((item) => item.product_variant_id && item.quantity > 0)
    : [];

  if (!body.source_warehouse_id || !body.target_warehouse_id) {
    return jsonError("اختر المخزن المصدر والمخزن الوجهة.", 400);
  }

  if (body.source_warehouse_id === body.target_warehouse_id) {
    return jsonError("اختر مخزنين مختلفين للتحويل.", 400);
  }

  if (!items.length) {
    return jsonError("أضف منتجاً واحداً على الأقل إلى سلة التحويل.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("admin_transfer_stock_batch", {
    p_source_warehouse_id: body.source_warehouse_id,
    p_target_warehouse_id: body.target_warehouse_id,
    p_items: items,
    p_note: body.note || null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ transfer: data });
}
