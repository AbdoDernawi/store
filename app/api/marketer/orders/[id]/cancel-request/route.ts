import { getApiContext, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type CancelBody = {
  reason?: string;
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getApiContext(["marketer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<CancelBody>(request);
  const { data, error } = await auth.context.supabase.rpc("request_order_cancellation", {
    p_order_id: params.id,
    p_reason: body.reason || null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ order: data });
}
