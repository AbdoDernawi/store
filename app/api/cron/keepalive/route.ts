import { NextResponse } from "next/server";
import { sendHealthAlertEmail } from "@/lib/health-alert-email";
import { getSystemHealth } from "@/lib/system-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const health = await getSystemHealth();
  const email =
    health.status === "error"
      ? await sendHealthAlertEmail(health)
      : { configured: Boolean(process.env.RESEND_API_KEY), sent: false };

  return NextResponse.json(
    {
      checkedAt: health.checkedAt,
      email,
      ok: health.ok,
      status: health.status,
      supabase: health.supabase,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
      status: health.ok ? 200 : 503,
    },
  );
}
