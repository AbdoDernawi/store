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
import { protectedRoleGroups, roleHomePath, type AppRole } from "@/types/auth";

function normalizePhone(phone: unknown) {
  return String(phone || "").trim();
}

function safeRedirectFor(nextPath: unknown, role: AppRole, fallback: string) {
  const value = typeof nextPath === "string" ? nextPath : "";

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  const protectedPath = protectedRoleGroups.find(
    (group) => value === group.prefix || value.startsWith(`${group.prefix}/`),
  );

  if (!protectedPath) {
    return fallback;
  }

  return protectedPath.roles.includes(role) ? value : fallback;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    password?: string;
    next?: string;
  };
  const phone = normalizePhone(body.phone);
  const password = String(body.password || "");

  if (!phone || password.length < 8) {
    return NextResponse.json(
      { error: "تأكد من رقم الهاتف وكلمة المرور." },
      { status: 400 },
    );
  }

  const edgeResult = await callPasswordAuthFunction("login", { phone, password });
  const result = "error" in edgeResult
    ? await loginWithEmailAlias(phone, password, {
        error: edgeResult.error || "رقم الهاتف أو كلمة المرور غير صحيحة.",
        status: edgeResult.status || 401,
      })
    : edgeResult;

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const user = { ...result.user, role: result.user.role as AppRole };
  const token = await signSession(user);
  const fallback = roleHomePath[user.role];
  const redirectTo = safeRedirectFor(body.next, user.role, fallback);
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

async function loginWithEmailAlias(
  phone: string,
  password: string,
  fallback: { error: string; status: number },
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const email = phoneAliasEmail(phone);

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !email) {
    return fallback;
  }

  const publicAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: signInError } =
    await publicAuth.auth.signInWithPassword({ email, password });

  if (signInError || !authData.user) {
    return fallback;
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileError } = await serviceClient
    .from("users")
    .select("id, phone, full_name, role, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile?.is_active) {
    return { error: "هذا الحساب غير نشط.", status: 403 };
  }

  return {
    user: {
      id: profile.id,
      phone: profile.phone,
      fullName: profile.full_name,
      role: profile.role,
    },
    tokens: authData.session
      ? {
          accessToken: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          expiresIn: authData.session.expires_in,
        }
      : undefined,
    status: 200,
  };
}
