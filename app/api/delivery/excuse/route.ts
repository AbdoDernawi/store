import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ExcuseBody = {
  orderId?: string;
  order_id?: string;
  reason?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["delivery"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ExcuseBody>(request);
  const orderId = body.order_id || body.orderId;
  const reason = String(body.reason || "").trim();

  if (!orderId) {
    return jsonError("اختر الطلب أولاً.", 400);
  }

  if (!reason) {
    return jsonError("اكتب سبب الاعتذار باختصار.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("request_delivery_excuse", {
    p_order_id: orderId,
    p_reason: reason,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ excuse: data }, 201);
}
