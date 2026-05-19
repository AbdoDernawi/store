import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type PrioritiesBody = {
  city_id?: string;
  warehouse_ids?: string[];
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<PrioritiesBody>(request);

  if (!body.city_id || !Array.isArray(body.warehouse_ids) || body.warehouse_ids.length === 0) {
    return jsonError("اختر المدينة ورتّب مخزناً واحداً على الأقل.", 400);
  }

  const { error: deleteError } = await auth.context.supabase
    .from("warehouse_priorities")
    .delete()
    .eq("city_id", body.city_id);

  if (deleteError) {
    return mapDatabaseError(deleteError);
  }

  const { error } = await auth.context.supabase.from("warehouse_priorities").insert(
    body.warehouse_ids.map((warehouseId, index) => ({
      city_id: body.city_id,
      warehouse_id: warehouseId,
      priority_order: index + 1,
    })),
  );

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk();
}
