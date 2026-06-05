import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

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
  const paymentType = body.payment_type || "immediate";
  const paidAmount = Number(body.paid_amount || 0);
  const items = Array.isArray(body.items) ? body.items : [];

  if (!body.supplier_id || !body.warehouse_id) {
    return jsonError("اختر المورد والمخزن أولاً.", 400);
  }

  if (!["immediate", "debt", "partial"].includes(paymentType)) {
    return jsonError("اختر نوع دفع صحيح.", 400);
  }

  if (!items.length || items.some((item) => !item.product_variant_id || Number(item.quantity || 0) <= 0 || Number(item.unit_cost || 0) <= 0)) {
    return jsonError("أضف منتجًا واحدًا على الأقل بكمية وتكلفة صحيحة.", 400);
  }

  if (paymentType !== "debt" && paidAmount <= 0) {
    return jsonError("اكتب مبلغ الدفع.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("admin_create_purchase_order", {
    p_supplier_id: body.supplier_id,
    p_warehouse_id: body.warehouse_id,
    p_payment_type: paymentType,
    p_paid_amount: paidAmount,
    p_due_date: body.due_date || null,
    p_items: items,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ result: data }, 201);
}
