import { NextResponse } from "next/server";

export const SUPABASE_ACCESS_TOKEN_COOKIE = "store_sb_access";
export const SUPABASE_REFRESH_TOKEN_COOKIE = "store_sb_refresh";
export const SUPABASE_REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SupabaseAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

function secureCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function setSupabaseAuthCookies(
  response: NextResponse,
  tokens?: SupabaseAuthTokens | null,
) {
  if (!tokens?.accessToken) {
    return;
  }

  response.cookies.set({
    name: SUPABASE_ACCESS_TOKEN_COOKIE,
    value: tokens.accessToken,
    ...secureCookieOptions(tokens.expiresIn || 60 * 60),
  });

  if (tokens.refreshToken) {
    response.cookies.set({
      name: SUPABASE_REFRESH_TOKEN_COOKIE,
      value: tokens.refreshToken,
      ...secureCookieOptions(SUPABASE_REFRESH_MAX_AGE_SECONDS),
    });
  }
}

export function clearSupabaseAuthCookies(response: NextResponse) {
  for (const name of [SUPABASE_ACCESS_TOKEN_COOKIE, SUPABASE_REFRESH_TOKEN_COOKIE]) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
}
