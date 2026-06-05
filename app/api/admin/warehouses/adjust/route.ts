import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type AdjustBody = {
  warehouse_id?: string;
  product_variant_id?: string;
  delta?: number;
  note?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<AdjustBody>(request);
  const delta = Number(body.delta || 0);

  if (!body.warehouse_id || !body.product_variant_id) {
    return jsonError("اختر المخزن والمنتج أولاً.", 400);
  }

  if (delta === 0) {
    return jsonError("اكتب كمية التعديل المطلوبة.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("admin_adjust_inventory", {
    p_warehouse_id: body.warehouse_id,
    p_product_variant_id: body.product_variant_id,
    p_delta: delta,
    p_note: body.note || null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ result: data });
}
