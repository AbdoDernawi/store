import { getApiContext, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

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
  const { data, error } = await auth.context.supabase.rpc("transfer_stock", {
    p_source_warehouse_id: body.source_warehouse_id || body.sourceWarehouseId,
    p_target_warehouse_id: body.target_warehouse_id || body.targetWarehouseId,
    p_product_variant_id: body.product_variant_id || body.productVariantId,
    p_quantity: Number(body.quantity || 0),
    p_note: body.note || null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ transfer: data });
}
