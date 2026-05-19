import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SESSION_COOKIE_NAME,
  verifySession,
} from "@/lib/auth/session";
import { roleHomePath, type AppRole } from "@/types/auth";

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;

  return verifySession(token);
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function isAdminScope(scopeType: "warehouse" | "city", scopeId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  if (user.role === "super_admin") {
    return true;
  }

  if (user.role !== "admin") {
    return false;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("admin_scopes")
    .select("id")
    .eq("user_id", user.id)
    .eq("scope_type", scopeType)
    .eq("scope_id", scopeId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function signOut() {
  "use server";

  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

export function redirectPathForRole(role: AppRole) {
  return roleHomePath[role];
}
