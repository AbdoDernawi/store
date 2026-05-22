import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";
import { createPackageQrHash, createQrPngDataUrl } from "@/lib/invoices/qr";

type GenerateQrBody = {
  packageId?: string;
  package_id?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<GenerateQrBody>(request);
  const packageId = body.package_id || body.packageId;

  if (!packageId) {
    return jsonError("اختر الحزمة أولاً.", 400);
  }

  try {
    const { data: pkg, error } = await auth.context.supabase
      .from("order_packages")
      .select("id, package_number, qr_code_hash")
      .eq("id", packageId)
      .maybeSingle();

    if (error) {
      return mapDatabaseError(error);
    }

    if (!pkg) {
      return jsonError("الحزمة المطلوبة غير موجودة.", 404);
    }

    const needsHash = !pkg.qr_code_hash || pkg.qr_code_hash.startsWith("pending-");
    const qrCodeHash = needsHash
      ? createPackageQrHash(pkg.id, new Date().toISOString())
      : pkg.qr_code_hash;

    if (needsHash) {
      const { error: updateError } = await auth.context.supabase
        .from("order_packages")
        .update({ qr_code_hash: qrCodeHash })
        .eq("id", pkg.id);

      if (updateError) {
        return mapDatabaseError(updateError);
      }
    }

    return jsonOk({
      qr: {
        package_id: pkg.id,
        package_number: pkg.package_number,
        png_base64: await createQrPngDataUrl(qrCodeHash, 360),
        qr_code_hash: qrCodeHash,
      },
    });
  } catch (error) {
    return mapDatabaseError(error);
  }
}
