import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ExpenseBody = {
  expense_type_id?: string;
  payment_method_id?: string;
  amount?: number;
  note?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ExpenseBody>(request);
  const amount = Number(body.amount || 0);

  if (!body.expense_type_id) {
    return jsonError("اختر نوع المصروف.", 400);
  }

  if (!body.payment_method_id) {
    return jsonError("اختر الخزينة التي سيصرف منها المصروف.", 400);
  }

  if (amount <= 0) {
    return jsonError("اكتب مبلغ المصروف.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("admin_record_expense_v2", {
    p_expense_type_id: body.expense_type_id,
    p_payment_method_id: body.payment_method_id,
    p_amount: Number(body.amount || 0),
    p_note: body.note || null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ result: data }, 201);
}
