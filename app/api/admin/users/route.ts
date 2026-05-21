import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { callAdminAuthFunction } from "@/lib/auth/edge-function";
import { phoneAliasEmail } from "@/lib/auth/phone-alias";
import { SUPABASE_ACCESS_TOKEN_COOKIE } from "@/lib/auth/supabase-token";
import { getApiContext, jsonError, jsonOk, readJsonBody } from "@/lib/api/context";
import type { AppRole } from "@/types/auth";

type CreateUserBody = {
  fullName?: string;
  phone?: string;
  password?: string;
  role?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const token = cookies().get(SUPABASE_ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return jsonError("انتهت جلسة Supabase. سجّل الدخول مرة أخرى.", 401);
  }

  const body = await readJsonBody<CreateUserBody>(request);
  const serviceResult = await createUserWithServiceRole(body, auth.context.user.role);

  if (serviceResult) {
    return serviceResult;
  }

  const result = await callAdminAuthFunction(
    {
      fullName: String(body.fullName || ""),
      phone: String(body.phone || ""),
      password: String(body.password || ""),
      role: String(body.role || "customer"),
    },
    token,
  );

  if ("error" in result) {
    return jsonError(result.error || "فشلت عملية إنشاء الحساب.", result.status || 500);
  }

  return jsonOk({ user: result.user }, 201);
}

async function createUserWithServiceRole(body: CreateUserBody, actorRole: AppRole) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const role = String(body.role || "customer") as AppRole;
  const allowedRoles: AppRole[] = ["admin", "marketer", "delivery", "customer"];

  if (!allowedRoles.includes(role)) {
    return jsonError("الدور المطلوب غير مدعوم.", 400);
  }

  if (actorRole !== "super_admin" && role === "admin") {
    return jsonError("إنشاء المدراء متاح للمشرف العام فقط.", 403);
  }

  const phone = String(body.phone || "").trim();
  const password = String(body.password || "");
  const fullName = String(body.fullName || "").trim();
  const email = phoneAliasEmail(phone);

  if (!phone || !email || password.length < 8 || fullName.length < 2) {
    return jsonError("تأكد من الاسم ورقم الهاتف وكلمة المرور.", 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    phone,
    password,
    email_confirm: true,
    phone_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) {
    return jsonError("تعذر إنشاء الحساب الآن.", 500, authError?.message);
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("users")
    .insert({
      id: authData.user.id,
      phone,
      password_hash: null,
      full_name: fullName,
      role,
      is_active: true,
    })
    .select("id, phone, full_name, role, is_active")
    .single();

  if (profileError || !profile) {
    await serviceClient.auth.admin.deleteUser(authData.user.id).catch(() => {});
    return jsonError("تعذر حفظ بيانات الحساب.", 500, profileError?.message);
  }

  if (role === "marketer") {
    await serviceClient.from("wallets").insert({ user_id: profile.id, balance: 0 });
  }

  return jsonOk({ user: profile }, 201);
}
