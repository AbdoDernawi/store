import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckState = "ok" | "warning" | "error";

type EnvCheck = {
  name: string;
  configured: boolean;
  required: boolean;
};

const envChecks: EnvCheck[] = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), required: true },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), required: true },
  { name: "SUPABASE_SERVICE_ROLE_KEY", configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), required: true },
  { name: "AUTH_JWT_SECRET", configured: Boolean(process.env.AUTH_JWT_SECRET), required: true },
  { name: "AUTH_FUNCTION_NAME", configured: Boolean(process.env.AUTH_FUNCTION_NAME), required: true },
  { name: "QR_SECRET_KEY", configured: Boolean(process.env.QR_SECRET_KEY), required: true },
];

function projectRefFromUrl(url: string) {
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function statusFromChecks(env: EnvCheck[], databaseStatus: CheckState): CheckState {
  if (databaseStatus === "error" || env.some((item) => item.required && !item.configured)) {
    return "error";
  }

  if (databaseStatus === "warning") {
    return "warning";
  }

  return "ok";
}

async function checkSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      status: "error" as CheckState,
      responseMs: null,
      message: "Supabase server configuration is missing.",
    };
  }

  const startedAt = Date.now();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 5000);

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: abortController.signal,
          }),
      },
    });

    const { error } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true });

    if (error) {
      return {
        status: "error" as CheckState,
        responseMs: Date.now() - startedAt,
        message: "Supabase database check failed.",
      };
    }

    return {
      status: "ok" as CheckState,
      responseMs: Date.now() - startedAt,
      message: "Supabase database is reachable.",
    };
  } catch {
    return {
      status: "error" as CheckState,
      responseMs: Date.now() - startedAt,
      message: "Supabase check failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const database = await checkSupabase();
  const status = statusFromChecks(envChecks, database.status);
  const httpStatus = status === "error" ? 503 : 200;

  return NextResponse.json(
    {
      ok: status !== "error",
      status,
      checkedAt: new Date().toISOString(),
      app: {
        name: packageJson.name,
        version: packageJson.version,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
      },
      configuration: envChecks,
      supabase: {
        projectRef: projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || ""),
        database,
      },
    },
    {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
