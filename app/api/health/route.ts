import { NextResponse } from "next/server";
import { getSystemHealth } from "@/lib/system-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const health = await getSystemHealth();
  const httpStatus = health.status === "error" ? 503 : 200;

  return NextResponse.json(
    health,
    {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
