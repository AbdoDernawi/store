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
    return mapDatabaseError(error);
  }

  return jsonOk({ request: data }, 201);
}
