import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type PasswordBody = {
  password?: string;
};

export async function PATCH(request: Request) {
  const auth = await getApiContext(["customer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<PasswordBody>(request);
  const password = String(body.password || "");

  if (password.length < 8) {
    return jsonError("كلمة المرور يجب ألا تقل عن 8 أحرف.", 400);
  }

  const { error } = await auth.context.supabase.auth.updateUser({ password });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk();
}
