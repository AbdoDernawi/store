import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";
import { createClient } from "@supabase/supabase-js";
import { hashWalletCode } from "@/lib/wallet-codes";

type WalletCodeBody = {
  code?: string;
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<WalletCodeBody>(request);
  const code = String(body.code || "").trim();

  if (code.length < 4 || code.length > 20) {
    return jsonError("رمز المحفظة يجب أن يكون بين 4 و20 خانة.", 400);
  }

  const serviceClient = createWalletCodeServiceClient();

  if (!serviceClient) {
    return jsonError("تعذر تعيين رمز المحفظة الآن. إعدادات الخدمة غير مكتملة.", 503);
  }

  const { data: marketer, error: marketerError } = await serviceClient
    .from("users")
    .select("id, role, is_active")
    .eq("id", params.id)
    .maybeSingle();

  if (marketerError) {
    return mapDatabaseError(marketerError);
  }

  if (!marketer || marketer.role !== "marketer") {
    return jsonError("يمكن تعيين رمز المحفظة للمسوقين فقط.", 400);
  }

  const { error } = await serviceClient
    .from("wallet_access_codes")
    .upsert(
      {
        code_hash: hashWalletCode(code),
        marketer_id: params.id,
        updated_by: auth.context.user.id,
      },
      { onConflict: "marketer_id" },
    );

  if (error) {
    if (String(error.message || "").includes("wallet_access_codes")) {
      return jsonError("يحتاج جدول رموز المحافظ إلى تفعيل في Supabase أولًا.", 503);
    }

    return mapDatabaseError(error);
  }

  return jsonOk();
}

function createWalletCodeServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
