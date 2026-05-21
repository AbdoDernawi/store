import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type CategoryBody = {
  name_ar?: string;
  name_en?: string;
  image_url?: string | null;
  sort_order?: number;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<CategoryBody>(request);
  const nameAr = String(body.name_ar || "").trim();
  const nameEn = String(body.name_en || nameAr).trim();

  if (nameAr.length < 2) {
    return jsonError("اكتب اسم القسم بالعربية.", 400);
  }

  const { data, error } = await auth.context.supabase
    .from("categories")
    .insert({
      name_ar: nameAr,
      name_en: nameEn || nameAr,
      image_url: String(body.image_url || "").trim() || null,
      sort_order: Number(body.sort_order || 0),
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    return mapDatabaseError(error);
  }

  return jsonOk({ categoryId: data.id }, 201);
}
