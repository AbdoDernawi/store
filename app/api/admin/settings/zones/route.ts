import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ZoneBody = {
  city_id?: string;
  name_ar?: string;
  name_en?: string;
  delivery_fee?: number;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ZoneBody>(request);
  const nameAr = String(body.name_ar || "").trim();

  if (!body.city_id || nameAr.length < 2) {
    return jsonError("اختر المدينة واكتب اسم المنطقة.", 400);
  }

  const { error } = await auth.context.supabase.from("zones").insert({
    city_id: body.city_id,
    name_ar: nameAr,
    name_en: String(body.name_en || nameAr).trim(),
    delivery_fee: Number(body.delivery_fee || 0),
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({}, 201);
}
