import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type SupplierBody = {
  name?: string;
  phone?: string;
  notes?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<SupplierBody>(request);
  const name = String(body.name || "").trim();

  if (name.length < 2) {
    return jsonError("اكتب اسم المورد.", 400);
  }

  const { data, error } = await auth.context.supabase
    .from("suppliers")
    .insert({ name, phone: body.phone || null, notes: body.notes || null })
    .select("id")
    .single();

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ supplier_id: data.id }, 201);
}
