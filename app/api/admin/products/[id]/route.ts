import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ProductPatchBody = {
  category_id?: string | null;
  name_ar?: string;
  name_en?: string;
  cost_price?: number;
  customer_price?: number;
  marketer_price?: number;
  marketer_commission?: number;
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

  if (typeof body.name_ar === "string") {
    const nameAr = body.name_ar.trim();

    if (nameAr.length < 2) {
      return jsonError("اكتب اسم المنتج بالعربية.", 400);
    }

    patch.name_ar = nameAr;
  }

  if (typeof body.name_en === "string") {
    patch.name_en = body.name_en.trim() || patch.name_ar || "";
  }

  if ("category_id" in body) {
    patch.category_id = body.category_id || null;
  }

  for (const key of ["cost_price", "customer_price", "marketer_price", "marketer_commission"] as const) {
    if (typeof body[key] === "number") {
      patch[key] = Math.max(0, Number(body[key] || 0));
    }
  }

  if (typeof body.is_active === "boolean") {
    patch.is_active = body.is_active;
  }

  if (typeof body.low_stock_threshold === "number") {
    patch.low_stock_threshold = Math.max(0, body.low_stock_threshold);
  }

  if (!Object.keys(patch).length) {
    return jsonError("لا توجد بيانات لتحديث المنتج.", 400);
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
