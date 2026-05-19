import { randomUUID } from "crypto";
import sharp from "sharp";
import { getApiContext, jsonError, jsonOk } from "@/lib/api/context";

export const runtime = "nodejs";

const BUCKET = "product-images";
const MAX_BYTES = 8 * 1024 * 1024;
const sizes = [
  ["thumb", 200],
  ["medium", 600],
  ["large", 1200],
] as const;

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");

  if (!(file instanceof File)) {
    return jsonError("اختر صورة للمنتج أولاً.", 400);
  }

  if (!file.type.startsWith("image/")) {
    return jsonError("الملف المختار ليس صورة.", 400);
  }

  if (file.size > MAX_BYTES) {
    return jsonError("حجم الصورة كبير. الحد الأعلى 8MB.", 413);
  }

  const input = Buffer.from(await file.arrayBuffer());
  const basePath = `products/${new Date().toISOString().slice(0, 10)}/${randomUUID()}`;
  const result: Record<(typeof sizes)[number][0], string> = {
    thumb: "",
    medium: "",
    large: "",
  };

  for (const [label, width] of sizes) {
    const output = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: label === "thumb" ? 78 : 84 })
      .toBuffer();
    const path = `${basePath}-${label}.webp`;
    const { error } = await auth.context.supabase.storage.from(BUCKET).upload(path, output, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: false,
    });

    if (error) {
      return jsonError("تعذر حفظ الصورة في التخزين.", 500, error.message);
    }

    result[label] = auth.context.supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  return jsonOk(result, 201);
}
