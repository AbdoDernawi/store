import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type TransferBody = {
  sourceWarehouseId?: string;
  source_warehouse_id?: string;
  targetWarehouseId?: string;
  target_warehouse_id?: string;
  productVariantId?: string;
  product_variant_id?: string;
  quantity?: number;
  note?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<TransferBody>(request);
  const sourceWarehouseId = body.source_warehouse_id || body.sourceWarehouseId;
  const targetWarehouseId = body.target_warehouse_id || body.targetWarehouseId;
  const productVariantId = body.product_variant_id || body.productVariantId;
  const quantity = Number(body.quantity || 0);

  if (!sourceWarehouseId || !targetWarehouseId || !productVariantId) {
    return jsonError("اختر المخزن المصدر والوجهة والمنتج أولاً.", 400);
  }

  if (sourceWarehouseId === targetWarehouseId) {
    return jsonError("اختر مخزنين مختلفين للتحويل.", 400);
  }

  if (quantity <= 0) {
    return jsonError("اكتب كمية التحويل.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("transfer_stock", {
    p_source_warehouse_id: sourceWarehouseId,
    p_target_warehouse_id: targetWarehouseId,
    p_product_variant_id: productVariantId,
    p_quantity: quantity,
    p_note: body.note || null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ transfer: data });
}
