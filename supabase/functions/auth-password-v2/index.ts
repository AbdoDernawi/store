import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizePhone(phone: unknown) {
  return String(phone || "").trim().replace(/\s+/g, "");
}

function phoneAliasEmail(phone: string) {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  return digits ? `${digits}@phone-login.local` : "";
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toAuthUser(profile: any) {
  return {
    id: profile.id,
    phone: profile.phone,
    fullName: profile.full_name,
    role: profile.role,
  };
}

function toTokens(session: any) {
  if (!session?.access_token) {
    return null;
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
  };
}

async function signInWithPhoneOrAlias(publicAuth: any, phone: string, password: string) {
  const phoneResult = await publicAuth.auth.signInWithPassword({ phone, password });

  if (!phoneResult.error && phoneResult.data?.user) {
    return phoneResult;
  }

  const email = phoneAliasEmail(phone);

  if (!email) {
    return phoneResult;
  }

  const emailResult = await publicAuth.auth.signInWithPassword({ email, password });
  return !emailResult.error && emailResult.data?.user ? emailResult : phoneResult;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "طريقة الطلب غير مدعومة." }, 405);
  }

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "إعدادات المصادقة غير مكتملة." }, 500);
  }

  const body = await request.json().catch(() => ({}));
  const phone = normalizePhone(body.phone);
  const password = String(body.password || "");

  if (!phone || password.length < 8) {
    return json({ error: "تأكد من رقم الهاتف وكلمة المرور." }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const publicAuth = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (body.action === "login") {
    const { data: authData, error: signInError } =
      await signInWithPhoneOrAlias(publicAuth, phone, password);

    if (signInError || !authData.user) {
      return json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة." }, 401);
    }

    const { data: profile, error } = await supabase
      .from("users")
      .select("id, phone, password_hash, full_name, role, is_active")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (error) {
      return json({ error: "تعذر تسجيل الدخول الآن." }, 500);
    }

    if (!profile || !profile.is_active) {
      return json({ error: "هذا الحساب غير نشط." }, 403);
    }

    return json({ user: toAuthUser(profile), tokens: toTokens(authData.session) });
  }

  if (body.action === "register") {
    const fullName = String(body.fullName || "").trim();

    if (fullName.length < 2) {
      return json({ error: "تأكد من الاسم الكامل." }, 400);
    }

    const { data: existingProfile, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingError) {
      return json({ error: "تعذر إنشاء الحساب الآن." }, 500);
    }

    if (existingProfile) {
      return json({ error: "رقم الهاتف مسجل بالفعل." }, 409);
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: phoneAliasEmail(phone),
      phone,
      password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { full_name: fullName, role: "customer" },
    });

    if (authError || !authData.user) {
      return json({ error: "تعذر إنشاء الحساب الآن." }, 500);
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        phone,
        password_hash: null,
        full_name: fullName,
        role: "customer",
        is_active: true,
      })
      .select("id, phone, password_hash, full_name, role, is_active")
      .single();

    if (profileError || !profile) {
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
      return json({ error: "تعذر إنشاء الحساب الآن." }, 500);
    }

    const { data: signInData, error: signInError } =
      await signInWithPhoneOrAlias(publicAuth, phone, password);

    if (signInError || !signInData.session) {
      return json({ error: "تم إنشاء الحساب، لكن تعذر بدء الجلسة تلقائيًا." }, 500);
    }

    return json({ user: toAuthUser(profile), tokens: toTokens(signInData.session) }, 201);
  }

  if (body.action === "admin_create_user") {
    const authHeader = request.headers.get("Authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    const { data: callerData, error: callerError } = await publicAuth.auth.getUser(accessToken);

    if (callerError || !callerData.user) {
      return json({ error: "يرجى تسجيل الدخول بصلاحية إدارة." }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await supabase
      .from("users")
      .select("id, role, is_active")
      .eq("id", callerData.user.id)
      .maybeSingle();

    if (callerProfileError || !callerProfile?.is_active) {
      return json({ error: "تعذر التحقق من صلاحية المدير." }, 403);
    }

    const role = String(body.role || "customer");
    const allowedRoles = ["admin", "marketer", "delivery", "customer"];

    if (!allowedRoles.includes(role)) {
      return json({ error: "الدور المطلوب غير مدعوم." }, 400);
    }

    if (callerProfile.role !== "super_admin" && role === "admin") {
      return json({ error: "إنشاء المدراء متاح للمشرف العام فقط." }, 403);
    }

    if (!["super_admin", "admin"].includes(callerProfile.role)) {
      return json({ error: "لا تملك صلاحية إنشاء الحسابات." }, 403);
    }

    const fullName = String(body.fullName || "").trim();

    if (fullName.length < 2) {
      return json({ error: "تأكد من الاسم الكامل." }, 400);
    }

    const { data: existingProfile, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingError) {
      return json({ error: "تعذر إنشاء الحساب الآن." }, 500);
    }

    if (existingProfile) {
      return json({ error: "رقم الهاتف مسجل بالفعل." }, 409);
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: phoneAliasEmail(phone),
      phone,
      password,
      email_confirm: true,
      phone_confirm: true,
      app_metadata: { role },
      user_metadata: { full_name: fullName },
    });

    if (authError || !authData.user) {
      return json({ error: "تعذر إنشاء الحساب الآن." }, 500);
    }

    const { data: profile, error: profileError } = await supabase
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
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
      return json({ error: "تعذر حفظ بيانات الحساب." }, 500);
    }

    if (role === "marketer") {
      await supabase.from("wallets").insert({ user_id: profile.id, balance: 0 }).catch(() => {});
    }

    return json({ user: toAuthUser(profile) }, 201);
  }

  return json({ error: "عملية المصادقة غير معروفة." }, 400);
});
