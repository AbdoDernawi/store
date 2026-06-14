import { createClient } from "@supabase/supabase-js";
import packageJson from "@/package.json";

export type CheckState = "ok" | "warning" | "error";

export type EnvCheck = {
  configured: boolean;
  name: string;
  required: boolean;
};

export type SystemHealthReport = {
  app: {
    commit: string | null;
    environment: string;
    name: string;
    version: string;
  };
  checkedAt: string;
  configuration: EnvCheck[];
  ok: boolean;
  status: CheckState;
  supabase: {
    database: {
      message: string;
      responseMs: number | null;
      status: CheckState;
    };
    projectRef: string | null;
  };
};

export const healthEnvChecks: EnvCheck[] = [
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
      message: "Supabase server configuration is missing.",
      responseMs: null,
      status: "error" as CheckState,
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

    const { error } = await supabase.from("users").select("id", { count: "exact", head: true });

    if (error) {
      return {
        message: "Supabase database check failed.",
        responseMs: Date.now() - startedAt,
        status: "error" as CheckState,
      };
    }

    return {
      message: "Supabase database is reachable.",
      responseMs: Date.now() - startedAt,
      status: "ok" as CheckState,
    };
  } catch {
    return {
      message: "Supabase check failed.",
      responseMs: Date.now() - startedAt,
      status: "error" as CheckState,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSystemHealth(): Promise<SystemHealthReport> {
  const database = await checkSupabase();
  const status = statusFromChecks(healthEnvChecks, database.status);

  return {
    app: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      name: packageJson.name,
      version: packageJson.version,
    },
    checkedAt: new Date().toISOString(),
    configuration: healthEnvChecks,
    ok: status !== "error",
    status,
    supabase: {
      database,
      projectRef: projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || ""),
    },
  };
}
