import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type SettingsBody = {
  address?: string;
  contact_phone?: string;
  invoice_note?: string;
  invoice_template?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  store_name?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["marketer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<SettingsBody>(request);
  const storeName = String(body.store_name || "").trim();

  if (storeName.length < 2) {
    return jsonError("اكتب اسم المتجر الافتراضي.", 400);
  }

  const payload = {
    address: clean(body.address),
    contact_phone: clean(body.contact_phone),
    invoice_note: clean(body.invoice_note),
    invoice_template: normalizeInvoiceTemplate(body.invoice_template),
    logo_url: clean(body.logo_url),
    marketer_id: auth.context.user.id,
    primary_color: clean(body.primary_color) || "#10b981",
    secondary_color: clean(body.secondary_color) || "#f59e0b",
    store_name: storeName,
  };
  const { data, error } = await auth.context.supabase
    .from("virtual_stores")
    .upsert(payload, { onConflict: "marketer_id" })
    .select("id")
    .single();

  if (error) {
    if (String(error.message || "").includes("invoice_template")) {
      const legacyPayload: Omit<typeof payload, "invoice_template"> = {
        address: payload.address,
        contact_phone: payload.contact_phone,
        invoice_note: payload.invoice_note,
        logo_url: payload.logo_url,
        marketer_id: payload.marketer_id,
        primary_color: payload.primary_color,
        secondary_color: payload.secondary_color,
        store_name: payload.store_name,
      };
      const legacyResult = await auth.context.supabase
        .from("virtual_stores")
        .upsert(legacyPayload, { onConflict: "marketer_id" })
        .select("id")
        .single();

      if (!legacyResult.error) {
        return jsonOk({ store: legacyResult.data, warning: "invoice_template_migration_pending" });
      }
    }

    return mapDatabaseError(error);
  }

  return jsonOk({ store: data });
}

function clean(value?: string) {
  const trimmed = String(value || "").trim();

  return trimmed || null;
}

function normalizeInvoiceTemplate(value?: string) {
  return value === "classic" || value === "soft" ? value : "modern";
}
