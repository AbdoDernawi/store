import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ConfirmHandoverBody = {
  handoverId?: string;
  handover_id?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ConfirmHandoverBody>(request);
  const handoverId = body.handover_id || body.handoverId;

  if (!handoverId) {
    return jsonError("اختر العهدة أولاً.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("confirm_cash_handover", {
    p_handover_id: handoverId,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ handover: data });
}
