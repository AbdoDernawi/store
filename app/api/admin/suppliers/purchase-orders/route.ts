import { getApiContext, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type PurchaseOrderBody = {
  supplier_id?: string;
  warehouse_id?: string;
  payment_type?: "immediate" | "debt" | "partial";
  paid_amount?: number;
  due_date?: string;
  items?: Array<{
    product_variant_id?: string;
    quantity?: number;
    unit_cost?: number;
  }>;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<PurchaseOrderBody>(request);
  const { data, error } = await auth.context.supabase.rpc("admin_create_purchase_order", {
    p_supplier_id: body.supplier_id,
    p_warehouse_id: body.warehouse_id,
    p_payment_type: body.payment_type || "immediate",
    p_paid_amount: Number(body.paid_amount || 0),
    p_due_date: body.due_date || null,
    p_items: body.items || [],
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ result: data }, 201);
}
