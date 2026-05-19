import { getApiContext, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ReleaseBody = {
  orderId?: string;
  order_id?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ReleaseBody>(request);
  const orderId = body.order_id || body.orderId;
  const { data, error } = await auth.context.supabase.rpc("release_order_stock", {
    p_order_id: orderId,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ released: data });
}
