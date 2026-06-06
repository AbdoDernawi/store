import { createClient } from "@supabase/supabase-js";
import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";
import { getMarketerWalletData } from "@/lib/marketer/data";
import { verifyWalletCode } from "@/lib/wallet-codes";

type UnlockBody = {
  code?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["marketer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<UnlockBody>(request);
  const code = String(body.code || "").trim();

  if (code.length < 4) {
    return jsonError("أدخل رمز المحفظة.", 400);
  }

  const serviceClient = createWalletServiceClient();

  if (!serviceClient) {
    return jsonError("تعذر فتح المحفظة الآن. إعدادات الخدمة غير مكتملة.", 503);
  }

  const { data, error } = await serviceClient
    .from("wallet_access_codes")
    .select("code_hash")
    .eq("marketer_id", auth.context.user.id)
    .maybeSingle();

  if (error) {
    if (String(error.message || "").includes("wallet_access_codes")) {
      return jsonError("لم يتم تفعيل رموز المحافظ في قاعدة البيانات بعد.", 503);
    }

    return mapDatabaseError(error);
  }

  if (!data?.code_hash) {
    return jsonError("لم يعيّن الأدمن رمزًا لهذه المحفظة بعد.", 403);
  }

  if (!verifyWalletCode(code, data.code_hash)) {
    return jsonError("رمز المحفظة غير صحيح.", 401);
  }

  const wallet = await getMarketerWalletData(auth.context.user);

  return jsonOk({ wallet });
}

function createWalletServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
