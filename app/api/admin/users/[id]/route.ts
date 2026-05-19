import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type UserPatchBody = {
  is_active?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getApiContext(["super_admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  if (params.id === auth.context.user.id) {
    return jsonError("لا يمكن تعطيل حسابك الحالي.", 400);
  }

  const body = await readJsonBody<UserPatchBody>(request);
  const { error } = await auth.context.supabase
    .from("users")
    .update({ is_active: Boolean(body.is_active) })
    .eq("id", params.id);

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk();
}
