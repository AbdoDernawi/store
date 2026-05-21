import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { callPasswordAuthFunction } from "@/lib/auth/edge-function";
import { phoneAliasEmail } from "@/lib/auth/phone-alias";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSession,
} from "@/lib/auth/session";
import { setSupabaseAuthCookies } from "@/lib/auth/supabase-token";
import { roleHomePath, type AppRole } from "@/types/auth";

function normalizePhone(phone: unknown) {
  return String(phone || "").trim();
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    fullName?: string;
    phone?: string;
    password?: string;
  };
  const fullName = String(body.fullName || "").trim();
  const phone = normalizePhone(body.phone);
  const password = String(body.password || "");

  if (fullName.length < 2 || !phone || password.length < 8) {
    return NextResponse.json(
      { error: "تأكد من الاسم ورقم الهاتف وكلمة المرور." },
      { status: 400 },
    );
  }

  const result = await registerWithServiceRole(fullName, phone, password)
    || await callPasswordAuthFunction("register", {
      fullName,
      phone,
      password,
    });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const user = { ...result.user, role: result.user.role as AppRole };
  const token = await signSession(user);
  const redirectTo = roleHomePath[user.role];
  const response = NextResponse.json({ redirectTo });

  setSupabaseAuthCookies(response, result.tokens);

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}

async function registerWithServiceRole(fullName: string, phone: string, password: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const email = phoneAliasEmail(phone);

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !email) {
    return null;
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: existingProfile, error: existingError } = await serviceClient
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existingError) {
    return { error: "تعذر إنشاء الحساب الآن.", status: 500 };
  }

  if (existingProfile) {
    return { error: "رقم الهاتف مسجل بالفعل.", status: 409 };
  }

  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    phone,
    password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { full_name: fullName, role: "customer" },
  });

  if (authError || !authData.user) {
    return { error: "تعذر إنشاء الحساب الآن.", status: 500 };
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("users")
    .insert({
      id: authData.user.id,
      phone,
      password_hash: null,
      full_name: fullName,
      role: "customer",
      is_active: true,
    })
    .select("id, phone, full_name, role, is_active")
    .single();

  if (profileError || !profile) {
    await serviceClient.auth.admin.deleteUser(authData.user.id).catch(() => {});
    return { error: "تعذر إنشاء الحساب الآن.", status: 500 };
  }

  const publicAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signInData, error: signInError } =
    await publicAuth.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.session) {
    return { error: "تم إنشاء الحساب، لكن تعذر بدء الجلسة تلقائيًا.", status: 500 };
  }

  return {
    user: {
      id: profile.id,
      phone: profile.phone,
      fullName: profile.full_name,
      role: profile.role,
    },
    tokens: {
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
      expiresIn: signInData.session.expires_in,
    },
    status: 201,
  };
}
