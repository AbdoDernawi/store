import { randomUUID } from "crypto";
import sharp from "sharp";
import { getApiContext, jsonError, jsonOk } from "@/lib/api/context";

export const runtime = "nodejs";

const BUCKET = "store-logos";
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await getApiContext(["marketer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");

  if (!(file instanceof File)) {
    return jsonError("اختر شعار المتجر أولاً.", 400);
  }

  if (!file.type.startsWith("image/")) {
    return jsonError("الملف المختار ليس صورة.", 400);
  }

  if (file.size > MAX_BYTES) {
    return jsonError("حجم الشعار كبير. الحد الأعلى 2MB.", 413);
  }

  const input = Buffer.from(await file.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize({ width: 600, height: 600, fit: "cover" })
    .webp({ quality: 86 })
    .toBuffer();
  const path = `${auth.context.user.id}/${randomUUID()}-logo.webp`;
  const { error } = await auth.context.supabase.storage.from(BUCKET).upload(path, output, {
    cacheControl: "31536000",
    contentType: "image/webp",
    upsert: false,
  });

  if (error) {
    return jsonError("تعذر حفظ شعار المتجر.", 500, error.message);
  }

  return jsonOk(
    {
      logo_url: auth.context.supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
      path,
    },
    201,
  );
}
