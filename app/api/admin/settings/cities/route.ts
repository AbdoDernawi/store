import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type CityBody = {
  name_ar?: string;
  name_en?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<CityBody>(request);
  const nameAr = String(body.name_ar || "").trim();

  if (nameAr.length < 2) {
    return jsonError("اكتب اسم المدينة.", 400);
  }

  const { error } = await auth.context.supabase.from("cities").insert({
    name_ar: nameAr,
    name_en: String(body.name_en || nameAr).trim(),
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({}, 201);
}
