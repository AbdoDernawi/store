import { getApiContext, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ReadBody = {
  ids?: string[];
};

export async function POST(request: Request) {
  const auth = await getApiContext(["delivery"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ReadBody>(request);
  let query = auth.context.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", auth.context.user.id);

  if (Array.isArray(body.ids) && body.ids.length) {
    query = query.in("id", body.ids);
  }

  const { error } = await query;

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk();
}
