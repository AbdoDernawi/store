import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type StatusBody = {
  name?: string;
  color?: string;
  sort_order?: number;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<StatusBody>(request);
  const name = String(body.name || "").trim();

  if (name.length < 2) {
    return jsonError("اكتب اسم الحالة.", 400);
  }

  const { error } = await auth.context.supabase.from("order_custom_statuses").insert({
    name,
    color: body.color || "#10b981",
    sort_order: Number(body.sort_order || 0),
    created_by: auth.context.user.id,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({}, 201);
}
