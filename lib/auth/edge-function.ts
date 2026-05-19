import type { AuthUser } from "@/types/auth";
import type { SupabaseAuthTokens } from "@/lib/auth/supabase-token";

type AuthAction = "login" | "register";

type AuthFunctionResponse =
  | {
      user: AuthUser;
      tokens?: SupabaseAuthTokens;
    }
  | {
      error: string;
    };

export async function callPasswordAuthFunction(
  action: AuthAction,
  body: Record<string, string>,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const functionName = process.env.AUTH_FUNCTION_NAME || "auth-password-v2";

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      error: "إعدادات Supabase غير مكتملة.",
      status: 500,
    };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ action, ...body }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({
    error: "تعذر قراءة استجابة المصادقة.",
  }))) as AuthFunctionResponse;

  if (!response.ok || "error" in data) {
    return {
      error: "error" in data ? data.error : "فشلت عملية المصادقة.",
      status: response.status,
    };
  }

  return {
    user: data.user,
    tokens: data.tokens,
    status: response.status,
  };
}

export async function callAdminAuthFunction(
  body: Record<string, string>,
  accessToken: string,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const functionName = process.env.AUTH_FUNCTION_NAME || "auth-password-v2";

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      error: "إعدادات Supabase غير مكتملة.",
      status: 500,
    };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ action: "admin_create_user", ...body }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({
    error: "تعذر قراءة استجابة المصادقة.",
  }))) as AuthFunctionResponse;

  if (!response.ok || "error" in data) {
    return {
      error: "error" in data ? data.error : "فشلت عملية إنشاء الحساب.",
      status: response.status,
    };
  }

  return {
    user: data.user,
    status: response.status,
  };
}
