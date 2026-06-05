import { createClient } from "@supabase/supabase-js";
import { getApiContext, jsonError, jsonOk, mapDatabaseError } from "@/lib/api/context";

type WithdrawalBody = {
  account_details?: string;
  amount?: number | string;
  method?: string;
  note?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["marketer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as WithdrawalBody;
  const amount = Number(body.amount || 0);
  const method = String(body.method || "bank_transfer").trim() || "bank_transfer";
  const accountDetails = String(body.account_details || "").trim();
  const note = String(body.note || "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonError("أدخل مبلغ سحب صحيح.", 400);
  }

  const { supabase, user } = auth.context;
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("id, balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (walletError) {
    return mapDatabaseError(walletError);
  }

  if (!wallet) {
    return jsonError("لم يتم العثور على محفظة لهذا الحساب.", 404);
  }

  if (amount > Number(wallet.balance || 0)) {
    return jsonError("مبلغ السحب أكبر من الرصيد المتاح.", 400);
  }

  const { data, error } = await supabase
    .from("wallet_withdrawal_requests")
    .insert({
      account_details: accountDetails || null,
      amount,
      marketer_id: user.id,
      method,
      note: note || null,
      wallet_id: wallet.id,
    })
    .select("id, amount, method, account_details, note, status, created_at, reviewed_at")
    .single();

  if (error) {
    if (isMissingWithdrawalTable(error)) {
      const fallback = await createWithdrawalFallbackNotification({
        accountDetails,
        amount,
        method,
        note,
        userId: user.id,
        userName: user.fullName || user.phone,
      });

      if (!fallback.ok) {
        return jsonError(fallback.error, 503);
      }

      return jsonOk(
        {
          migrationPending: true,
          request: {
            account_details: accountDetails || null,
            amount,
            created_at: new Date().toISOString(),
            id: crypto.randomUUID(),
            method,
            note: note || null,
            reviewed_at: null,
            status: "pending",
          },
        },
        202,
      );
    }

    return mapDatabaseError(error);
  }

  return jsonOk({ request: data }, 201);
}

function isMissingWithdrawalTable(error: { message?: string; code?: string }) {
  const message = String(error.message || "");

  return error.code === "42P01" || message.includes("wallet_withdrawal_requests");
}

async function createWithdrawalFallbackNotification({
  accountDetails,
  amount,
  method,
  note,
  userId,
  userName,
}: {
  accountDetails: string;
  amount: number;
  method: string;
  note: string;
  userId: string;
  userName: string;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "طلبات السحب تحتاج تفعيل قاعدة البيانات أولًا.", ok: false as const };
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: admins, error: adminsError } = await serviceClient
    .from("users")
    .select("id")
    .in("role", ["super_admin", "admin"])
    .eq("is_active", true);

  if (adminsError || !admins?.length) {
    return { error: "تعذر إرسال طلب السحب للأدمن الآن.", ok: false as const };
  }

  const body = [
    `المسوق: ${userName}`,
    `المبلغ: ${amount.toLocaleString("ar-LY")} د.ل`,
    `طريقة السحب: ${method}`,
    accountDetails ? `بيانات الاستلام: ${accountDetails}` : "",
    note ? `ملاحظة: ${note}` : "",
  ].filter(Boolean).join("\n");

  const { error } = await serviceClient.from("notifications").insert(
    admins.map((admin) => ({
      body,
      reference_id: userId,
      title: "طلب سحب جديد",
      type: "wallet_withdrawal_request",
      user_id: admin.id,
    })),
  );

  if (error) {
    return { error: "تعذر إرسال طلب السحب للأدمن الآن.", ok: false as const };
  }

  return { ok: true as const };
}
