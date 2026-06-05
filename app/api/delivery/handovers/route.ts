import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type HandoverBody = {
  orderIds?: string[];
  order_ids?: string[];
  type?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["delivery"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<HandoverBody>(request);
  const orderIds = Array.isArray(body.order_ids) ? body.order_ids : body.orderIds;

  if (!body.type) {
    return jsonError("اختر نوع العهدة أولاً.", 400);
  }

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return jsonError("اختر طلبًا واحدًا على الأقل لإنشاء العهدة.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("create_delivery_handover", {
    p_type: body.type,
    p_order_ids: Array.isArray(orderIds) ? orderIds : null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ handover: data }, 201);
}
