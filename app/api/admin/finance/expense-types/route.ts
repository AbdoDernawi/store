import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ExpenseTypeBody = {
  name?: string;
  sort_order?: number;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ExpenseTypeBody>(request);
  const name = String(body.name || "").trim();

  if (name.length < 2) {
    return jsonError("اكتب اسم نوع المصروف.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("admin_create_expense_type", {
    p_name: name,
    p_sort_order: Number(body.sort_order || 0),
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ expenseType: data }, 201);
}
