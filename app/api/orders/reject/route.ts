import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type RejectBody = {
  orderId?: string;
  order_id?: string;
  reason?: string;
  rejectionReason?: string;
  rejection_reason?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<RejectBody>(request);
  const reason = body.rejection_reason || body.rejectionReason || body.reason || "";

  if (reason.trim().length < 2) {
    return jsonError("اكتب سببًا قصيرًا وواضحًا للرفض.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("reject_order", {
    p_order_id: body.order_id || body.orderId,
    p_reason: reason,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ order: data });
}
