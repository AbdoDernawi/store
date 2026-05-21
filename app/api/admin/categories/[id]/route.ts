import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type CategoryPatchBody = {
  name_ar?: string;
  name_en?: string;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<CategoryPatchBody>(request);
  const patch: CategoryPatchBody = {};

  if (typeof body.name_ar === "string") {
    const nameAr = body.name_ar.trim();

    if (nameAr.length < 2) {
      return jsonError("اكتب اسم القسم بالعربية.", 400);
    }

    patch.name_ar = nameAr;
  }

  if (typeof body.name_en === "string") {
    patch.name_en = body.name_en.trim() || patch.name_ar || "";
  }

  if (typeof body.image_url === "string" || body.image_url === null) {
    patch.image_url = String(body.image_url || "").trim() || null;
  }

  if (typeof body.sort_order === "number") {
    patch.sort_order = body.sort_order;
  }

  if (typeof body.is_active === "boolean") {
    patch.is_active = body.is_active;
  }

  if (!Object.keys(patch).length) {
    return jsonError("لا توجد بيانات لتحديثها.", 400);
  }

  const { error } = await auth.context.supabase
    .from("categories")
    .update(patch)
    .eq("id", params.id);

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk();
}
