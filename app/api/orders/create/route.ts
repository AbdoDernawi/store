import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type CreateOrderBody = {
  customerName?: string;
  customer_name?: string;
  customerPhone?: string;
  customer_phone?: string;
  customerAddress?: string;
  customer_address?: string;
  cityId?: string;
  city_id?: string;
  zoneId?: string;
  zone_id?: string;
  paymentMethod?: "cash" | "bank_transfer";
  payment_method?: "cash" | "bank_transfer";
  transferImageUrl?: string;
  transfer_image_url?: string;
  virtualStoreId?: string;
  virtual_store_id?: string;
  discountAmount?: number;
  discount_amount?: number;
  items?: Array<{
    productVariantId?: string;
    product_variant_id?: string;
    quantity?: number;
  }>;
};

function normalizeItems(items: CreateOrderBody["items"]) {
  return (items || []).map((item) => ({
    product_variant_id: item.product_variant_id || item.productVariantId,
    quantity: Number(item.quantity || 0),
  }));
}

export async function POST(request: Request) {
  const auth = await getApiContext(["marketer", "customer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<CreateOrderBody>(request);
  const paymentMethod = body.payment_method || body.paymentMethod || "cash";
  const customerName = body.customer_name || body.customerName;
  const customerPhone = body.customer_phone || body.customerPhone;
  const customerAddress = body.customer_address || body.customerAddress;
  const cityId = body.city_id || body.cityId;
  const zoneId = body.zone_id || body.zoneId;

  if (paymentMethod === "bank_transfer" && !(body.transfer_image_url || body.transferImageUrl)) {
    return jsonError("أرفق صورة التحويل حتى نكمل الطلب بسلاسة.", 400);
  }

  const { data, error } = await auth.context.supabase.rpc("create_store_order", {
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_customer_address: customerAddress,
    p_city_id: cityId,
    p_zone_id: zoneId,
    p_payment_method: paymentMethod,
    p_transfer_image_url: body.transfer_image_url || body.transferImageUrl || null,
    p_items: normalizeItems(body.items),
    p_virtual_store_id: body.virtual_store_id || body.virtualStoreId || null,
    p_discount_amount: Number(body.discount_amount ?? body.discountAmount ?? 0),
  });

  if (error) {
    return mapDatabaseError(error);
  }

  let customerSaved = true;

  if (auth.context.user.role === "marketer") {
    const { error: customerError } = await auth.context.supabase
      .from("marketer_customers")
      .upsert(
        {
          marketer_id: auth.context.user.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          city_id: cityId,
          zone_id: zoneId,
          last_ordered_at: new Date().toISOString(),
        },
        { onConflict: "marketer_id,customer_phone" },
      );

    customerSaved = !customerError;
  }

  return jsonOk({ customer_saved: customerSaved, order: data }, 201);
}
