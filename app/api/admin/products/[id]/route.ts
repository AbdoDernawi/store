import { getApiContext, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ProductPatchBody = {
  is_active?: boolean;
  low_stock_threshold?: number;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ProductPatchBody>(request);
  const patch: ProductPatchBody = {};

  if (typeof body.is_active === "boolean") {
    patch.is_active = body.is_active;
  }

  if (typeof body.low_stock_threshold === "number") {
    patch.low_stock_threshold = body.low_stock_threshold;
  }

  const { error } = await auth.context.supabase
    .from("products")
    .update(patch)
    .eq("id", params.id);

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk();
}
