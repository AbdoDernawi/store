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
      await publicAuth.auth.signInWithPassword({ phone, password });

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

    return json({ user: toAuthUser(profile) });
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
      phone,
      password,
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

    return json({ user: toAuthUser(profile) }, 201);
  }

  return json({ error: "عملية المصادقة غير معروفة." }, 400);
});
