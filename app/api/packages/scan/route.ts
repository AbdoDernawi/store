import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type ScanBody = {
  qrCodeHash?: string;
  qr_code_hash?: string;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["delivery"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ScanBody>(request);
  const hash = body.qr_code_hash || body.qrCodeHash;

  if (!hash) {
    return jsonError("رمز QR غير واضح، جرّب المسح مرة أخرى.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("scan_package", {
    p_qr_code_hash: hash,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ package: data });
}
