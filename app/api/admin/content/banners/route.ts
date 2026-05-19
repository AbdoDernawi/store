import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type BannerBody = {
  image_url?: string;
  link?: string;
  sort_order?: number;
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<BannerBody>(request);

  if (!body.image_url) {
    return jsonError("ارفع صورة البنر أولاً.", 400);
  }

  const { error } = await auth.context.supabase.from("banners").insert({
    image_url: body.image_url,
    link: body.link || null,
    sort_order: Number(body.sort_order || 0),
    created_by: auth.context.user.id,
  });

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({}, 201);
}
