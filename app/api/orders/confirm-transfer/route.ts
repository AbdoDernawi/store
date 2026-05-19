import { getApiContext, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ConfirmTransferBody = {
  orderId?: string;
  order_id?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ConfirmTransferBody>(request);
  const { data, error } = await auth.context.supabase.rpc("confirm_bank_transfer_order", {
    p_order_id: body.order_id || body.orderId,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ order: data });
}
