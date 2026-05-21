import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type CancelBody = {
  reason?: string;
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getApiContext(["customer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<CancelBody>(request);
  const reason = String(body.reason || "").trim();

  if (!reason) {
    return jsonError("اكتب سبب الإلغاء باختصار.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("request_customer_order_cancellation", {
    p_order_id: params.id,
    p_reason: reason,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ order: data });
}
