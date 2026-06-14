import type { SystemHealthReport } from "@/lib/system-health";

const ALERT_TO = "dernawiia@gmail.com";

type AlertEmailResult = {
  configured: boolean;
  error?: string;
  id?: string;
  sent: boolean;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderHealthAlertEmail(report: SystemHealthReport) {
  const failedEnv = report.configuration
    .filter((item) => item.required && !item.configured)
    .map((item) => item.name);
  const lines = [
    ["Status", report.status],
    ["Checked at", report.checkedAt],
    ["Environment", report.app.environment],
    ["Commit", report.app.commit || "-"],
    ["Supabase project", report.supabase.projectRef || "-"],
    ["Database status", report.supabase.database.status],
    ["Database response", `${report.supabase.database.responseMs ?? "-"} ms`],
    ["Database message", report.supabase.database.message],
    ["Missing env", failedEnv.length ? failedEnv.join(", ") : "-"],
  ];

  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
      <div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:24px">
        <h1 style="font-size:22px;margin:0 0 12px;color:#be123c">تنبيه صحة النظام</h1>
        <p style="font-size:14px;line-height:1.8;margin:0 0 18px">
          فشلت نبضة المتجر المجدولة أو رجعت حالة غير سليمة. الرجاء مراجعة Vercel و Supabase.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          ${lines
            .map(
              ([label, value]) => `
                <tr>
                  <td style="border-top:1px solid #e2e8f0;padding:10px;color:#64748b">${escapeHtml(label)}</td>
                  <td style="border-top:1px solid #e2e8f0;padding:10px;font-weight:700">${escapeHtml(value)}</td>
                </tr>
              `,
            )
            .join("")}
        </table>
      </div>
    </div>
  `;
}

export async function sendHealthAlertEmail(report: SystemHealthReport): Promise<AlertEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.HEALTH_ALERT_EMAIL_FROM || "Store Monitor <onboarding@resend.dev>";

  if (!apiKey) {
    return { configured: false, sent: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: renderHealthAlertEmail(report),
      subject: `Store health alert: ${report.status}`,
      to: ALERT_TO,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };

  if (!response.ok) {
    return {
      configured: true,
      error: data.message || "Resend email request failed.",
      sent: false,
    };
  }

  return {
    configured: true,
    id: data.id,
    sent: true,
  };
}
