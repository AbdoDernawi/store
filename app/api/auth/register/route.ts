import { NextResponse } from "next/server";
import { callPasswordAuthFunction } from "@/lib/auth/edge-function";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSession,
} from "@/lib/auth/session";
import { setSupabaseAuthCookies } from "@/lib/auth/supabase-token";
import { roleHomePath } from "@/types/auth";

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

  const result = await callPasswordAuthFunction("register", {
    fullName,
    phone,
    password,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const token = await signSession(result.user);
  const redirectTo = roleHomePath[result.user.role];
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
