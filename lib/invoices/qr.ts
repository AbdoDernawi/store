import { createHash } from "crypto";
import QRCode from "qrcode";

export function createPackageQrHash(packageId: string, timestamp: string) {
  const secret = process.env.QR_SECRET_KEY;

  if (!secret) {
    throw new Error("QR_SECRET_KEY is not configured.");
  }

  return createHash("sha256")
    .update(`${packageId}:${secret}:${timestamp}`)
    .digest("hex");
}

export async function createQrPngDataUrl(value: string, width = 280) {
  return QRCode.toDataURL(value, {
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
    margin: 1,
    width,
  });
}
