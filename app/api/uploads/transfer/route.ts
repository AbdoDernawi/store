import { randomUUID } from "crypto";
import sharp from "sharp";
import { getApiContext, jsonError, jsonOk } from "@/lib/api/context";

export const runtime = "nodejs";

const BUCKET = "transfer-images";
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await getApiContext(["marketer", "customer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");

  if (!(file instanceof File)) {
    return jsonError("اختر صورة التحويل أولاً.", 400);
  }

  if (!file.type.startsWith("image/")) {
    return jsonError("الملف المختار ليس صورة.", 400);
  }

  if (file.size > MAX_BYTES) {
    return jsonError("حجم الصورة كبير. الحد الأعلى 5MB.", 413);
  }

  const input = Buffer.from(await file.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();
  const path = `${auth.context.user.id}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.webp`;
  const { error } = await auth.context.supabase.storage.from(BUCKET).upload(path, output, {
    cacheControl: "604800",
    contentType: "image/webp",
    upsert: false,
  });

  if (error) {
    return jsonError("تعذر حفظ صورة التحويل.", 500, error.message);
  }

  const signed = await auth.context.supabase.storage.from(BUCKET).createSignedUrl(path, 600);

  return jsonOk(
    {
      path,
      preview_url: signed.data?.signedUrl || null,
      transfer_image_url: `storage://${BUCKET}/${path}`,
    },
    201,
  );
}
