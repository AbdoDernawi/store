import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type OrderActionBody = {
  orderId?: string;
  order_id?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<OrderActionBody>(request);
  const orderId = body.order_id || body.orderId;

  if (!orderId) {
    return jsonError("اختر الطلب أولاً.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("approve_order", {
    p_order_id: orderId,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ order: data });
}
