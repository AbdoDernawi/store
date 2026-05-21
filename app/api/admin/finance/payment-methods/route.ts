import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type PaymentMethodBody = {
  code?: string;
  name_ar?: string;
  name_en?: string;
  sort_order?: number;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<PaymentMethodBody>(request);
  const nameAr = String(body.name_ar || "").trim();
  const code = String(body.code || "")
    .trim()
    .toLowerCase();

  if (nameAr.length < 2) {
    return jsonError("اكتب اسم وسيلة الدفع.", 400);
  }

  if (!code) {
    return jsonError("اكتب كوداً مختصراً لوسيلة الدفع مثل wallet.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("admin_create_payment_method", {
    p_code: code,
    p_name_ar: nameAr,
    p_name_en: String(body.name_en || "").trim() || null,
    p_sort_order: Number(body.sort_order || 0),
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ paymentMethod: data }, 201);
}
