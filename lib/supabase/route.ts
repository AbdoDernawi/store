import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ACCESS_TOKEN_COOKIE } from "@/lib/auth/supabase-token";

export function createUserRouteClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const accessToken = cookies().get(SUPABASE_ACCESS_TOKEN_COOKIE)?.value;

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
