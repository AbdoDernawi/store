import { NextResponse } from "next/server";
import { runAgentTestCycle } from "@/lib/agent-tests/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const secret = process.env.AGENT_TEST_SECRET || process.env.CRON_SECRET || "";
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const body = (await request.json().catch(() => ({}))) as {
    baseUrl?: string;
    label?: string;
    mode?: "dry_run" | "manual" | "scheduled";
  };
  const requestUrl = new URL(request.url);
  const baseUrl = body.baseUrl || `${requestUrl.protocol}//${requestUrl.host}`;
  const result = await runAgentTestCycle({
    baseUrl,
    label: body.label,
    mode: body.mode || "manual",
  });

  return NextResponse.json({ ok: result.status !== "failed", ...result }, { status: result.status === "failed" ? 500 : 200 });
}
