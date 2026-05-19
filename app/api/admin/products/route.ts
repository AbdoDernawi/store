import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type VariantInput = {
  color?: string;
  size?: string;
  type?: string;
  image_url?: string;
  extra_price?: number;
};

type ProductBody = {
  category_id?: string;
  name_ar?: string;
  name_en?: string;
  description_ar?: string;
  description_en?: string;
  images?: Array<Record<string, string>>;
  cost_price?: number;
  customer_price?: number;
  marketer_price?: number;
  marketer_commission?: number;
  low_stock_threshold?: number;
  variants?: VariantInput[];
  discount?: {
    name?: string;
    type?: "percentage" | "fixed";
    value?: number;
    applies_to?: "all" | "customer_only" | "marketer_only";
    auto_apply?: boolean;
  };
};

export async function POST(request: Request) {
  const auth = await getApiContext(["super_admin", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<ProductBody>(request);
  const nameAr = String(body.name_ar || "").trim();
  const nameEn = String(body.name_en || nameAr).trim();

  if (nameAr.length < 2) {
    return jsonError("اكتب اسم المنتج بالعربية.", 400);
  }

  const { data: product, error } = await auth.context.supabase
    .from("products")
    .insert({
      category_id: body.category_id || null,
      name_ar: nameAr,
      name_en: nameEn,
      description_ar: body.description_ar || null,
      description_en: body.description_en || null,
      images: Array.isArray(body.images) ? body.images : [],
      cost_price: Number(body.cost_price || 0),
      customer_price: Number(body.customer_price || 0),
      marketer_price: Number(body.marketer_price || 0),
      marketer_commission: Number(body.marketer_commission || 0),
      low_stock_threshold: Number(body.low_stock_threshold || 0),
      created_by: auth.context.user.id,
    })
    .select("id")
    .single();

  if (error || !product) {
    return mapDatabaseError(error);
  }

  const variants = Array.isArray(body.variants) && body.variants.length ? body.variants : [{}];

  const { error: variantsError } = await auth.context.supabase.from("product_variants").insert(
    variants.map((variant) => ({
      product_id: product.id,
      color: clean(variant.color),
      size: clean(variant.size),
      type: clean(variant.type),
      image_url: clean(variant.image_url),
      extra_price: Number(variant.extra_price || 0),
    })),
  );

  if (variantsError) {
    return mapDatabaseError(variantsError);
  }

  if (body.discount?.name && Number(body.discount.value || 0) > 0) {
    const { error: discountError } = await auth.context.supabase.from("discounts").insert({
      name: body.discount.name.trim(),
      type: body.discount.type || "percentage",
      value: Number(body.discount.value || 0),
      applies_to: body.discount.applies_to || "all",
      auto_apply: Boolean(body.discount.auto_apply),
      product_ids: [product.id],
      created_by: auth.context.user.id,
    });

    if (discountError) {
      return mapDatabaseError(discountError);
    }
  }

  return jsonOk({ product_id: product.id }, 201);
}

function clean(value?: string) {
  const trimmed = String(value || "").trim();

  return trimmed || null;
}
