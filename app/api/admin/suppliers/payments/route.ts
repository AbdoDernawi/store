import { getApiContext, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type SupplierPaymentBody = {
  supplier_id?: string;
  amount?: number;
  note?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<SupplierPaymentBody>(request);
  const { data, error } = await auth.context.supabase.rpc("admin_pay_supplier", {
    p_supplier_id: body.supplier_id,
    p_amount: Number(body.amount || 0),
    p_note: body.note || null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ result: data });
}
