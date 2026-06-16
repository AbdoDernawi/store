import { NextResponse } from "next/server";
import { runAgentTestCycle } from "@/lib/agent-tests/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  const result = await runAgentTestCycle({
    baseUrl,
    label: `AGENT_TEST scheduled ${new Date().toISOString()}`,
    mode: "scheduled",
  });

  return NextResponse.json({ ok: result.status !== "failed", ...result }, { status: result.status === "failed" ? 500 : 200 });
}
