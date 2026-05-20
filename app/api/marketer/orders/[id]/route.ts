import { getApiContext, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type OrderPatchBody = {
  city_id?: string;
  customer_address?: string;
  customer_name?: string;
  customer_phone?: string;
  zone_id?: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getApiContext(["marketer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<OrderPatchBody>(request);
  const { data, error } = await auth.context.supabase.rpc("update_pending_marketer_order", {
    p_city_id: body.city_id,
    p_customer_address: body.customer_address,
    p_customer_name: body.customer_name,
    p_customer_phone: body.customer_phone,
    p_order_id: params.id,
    p_zone_id: body.zone_id,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ order: data });
}
