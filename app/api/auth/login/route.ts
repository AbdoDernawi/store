import { NextResponse } from "next/server";
import { callPasswordAuthFunction } from "@/lib/auth/edge-function";
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

  const result = await callPasswordAuthFunction("login", { phone, password });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const token = await signSession(result.user);
  const fallback = roleHomePath[result.user.role];
  const redirectTo = safeRedirectFor(body.next, result.user.role, fallback);
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
