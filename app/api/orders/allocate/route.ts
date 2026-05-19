import { getApiContext, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type AllocateBody = {
  cityId?: string;
  city_id?: string;
  items?: Array<{
    productVariantId?: string;
    product_variant_id?: string;
    quantity?: number;
  }>;
};

function normalizeItems(items: AllocateBody["items"]) {
  return (items || []).map((item) => ({
    product_variant_id: item.product_variant_id || item.productVariantId,
    quantity: Number(item.quantity || 0),
  }));
}

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<AllocateBody>(request);
  const cityId = body.city_id || body.cityId;
  const items = normalizeItems(body.items);

  const { data, error } = await auth.context.supabase.rpc("allocate_stock", {
    p_city_id: cityId,
    p_items: items,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ allocations: data });
}
