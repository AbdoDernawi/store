import { randomUUID } from "crypto";
import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";
import { archiveInvoicesForOrders } from "@/lib/invoices/server";
import { createPackageQrHash } from "@/lib/invoices/qr";

type CreatePackageBody = {
  orderIds?: string[];
  order_ids?: string[];
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<CreatePackageBody>(request);
  const orderIds = body.order_ids || body.orderIds || [];

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return jsonError("اختر طلبًا واحدًا على الأقل لإنشاء الحزمة.", 400);
  }

  try {
    const temporaryHash = `pending-${randomUUID()}`;
    const { data: createdPackage, error: createError } = await auth.context.supabase
      .from("order_packages")
      .insert({
        qr_code_hash: temporaryHash,
        order_ids: orderIds,
        created_by: auth.context.user.id,
      })
      .select("id, package_number, order_ids, qr_code_hash")
      .single();

    if (createError || !createdPackage) {
      return mapDatabaseError(createError);
    }

    const timestamp = new Date().toISOString();
    const qrCodeHash = createPackageQrHash(createdPackage.id, timestamp);

    const { data: packageWithQr, error: qrError } = await auth.context.supabase
      .from("order_packages")
      .update({ qr_code_hash: qrCodeHash })
      .eq("id", createdPackage.id)
      .select("id, package_number, order_ids, qr_code_hash, created_at")
      .single();

    if (qrError || !packageWithQr) {
      return mapDatabaseError(qrError);
    }

    const { error: ordersError } = await auth.context.supabase
      .from("orders")
      .update({ status: "ready" })
      .in("id", orderIds);

    if (ordersError) {
      return mapDatabaseError(ordersError);
    }

    const historyRows = orderIds.map((orderId) => ({
      order_id: orderId,
      status: "ready",
      changed_by: auth.context.user.id,
      note: "تم إنشاء حزمة QR وتجهيز الطلب للتسليم",
    }));

    const { error: historyError } = await auth.context.supabase
      .from("order_status_history")
      .insert(historyRows);

    if (historyError) {
      return mapDatabaseError(historyError);
    }

    await archiveInvoicesForOrders(auth.context.supabase, orderIds);

    return jsonOk({ package: packageWithQr });
  } catch (error) {
    return mapDatabaseError(error);
  }
}
