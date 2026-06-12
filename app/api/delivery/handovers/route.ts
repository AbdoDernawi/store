import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type HandoverBody = {
  items?: Array<{
    orderItemId?: string;
    order_item_id?: string;
    quantity?: number;
  }>;
  orderIds?: string[];
  order_ids?: string[];
  type?: string;
};

function normalizeItems(items: HandoverBody["items"]) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    order_item_id: item.order_item_id || item.orderItemId,
    quantity: Number(item.quantity || 0),
  }));
}

export async function POST(request: Request) {
  const auth = await getApiContext(["delivery"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<HandoverBody>(request);
  const items = normalizeItems(body.items);
  const orderIds = Array.isArray(body.order_ids) ? body.order_ids : body.orderIds;

  if (!body.type) {
    return jsonError("اختر نوع العهدة أولاً.", 400);
  }

  if (
    body.type !== "cash_full" &&
    (!Array.isArray(orderIds) || orderIds.length === 0) &&
    !items.length
  ) {
    return jsonError("اختر طلبًا واحدًا على الأقل لإنشاء العهدة.", 400);
  }

  if (body.type === "return_goods" && items.some((item) => !item.order_item_id || item.quantity <= 0)) {
    return jsonError("اختر منتجات راجعة بكمية صحيحة.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("create_delivery_handover", {
    p_items: items.length ? items : null,
    p_type: body.type,
    p_order_ids: Array.isArray(orderIds) ? orderIds : null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ handover: data }, 201);
}
