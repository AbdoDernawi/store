import { getApiContext, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type CancelBody = {
  orderId?: string;
  order_id?: string;
  reason?: string;
  cancellationReason?: string;
  cancellation_reason?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<CancelBody>(request);
  const { data, error } = await auth.context.supabase.rpc("cancel_order", {
    p_order_id: body.order_id || body.orderId,
    p_reason: body.cancellation_reason || body.cancellationReason || body.reason || null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ order: data });
}
