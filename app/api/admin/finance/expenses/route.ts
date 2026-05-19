import { getApiContext, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ExpenseBody = {
  type?: string;
  amount?: number;
  note?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ExpenseBody>(request);
  const { data, error } = await auth.context.supabase.rpc("admin_record_expense", {
    p_type: body.type || "مصروف",
    p_amount: Number(body.amount || 0),
    p_note: body.note || null,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ result: data }, 201);
}
