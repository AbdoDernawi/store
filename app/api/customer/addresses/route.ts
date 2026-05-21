import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type AddressBody = {
  address?: string;
  city_id?: string;
  id?: string;
  is_default?: boolean;
  label?: string;
  phone?: string;
  recipient_name?: string;
  zone_id?: string;
};

function cleanAddress(body: AddressBody, userId: string) {
  return {
    address: String(body.address || "").trim(),
    city_id: body.city_id,
    customer_id: userId,
    is_default: Boolean(body.is_default),
    label: String(body.label || "عنوان").trim() || "عنوان",
    phone: String(body.phone || "").trim(),
    recipient_name: String(body.recipient_name || "").trim(),
    zone_id: body.zone_id,
  };
}

function hasRequiredAddress(value: ReturnType<typeof cleanAddress>) {
  return Boolean(
    value.recipient_name &&
      value.phone &&
      value.address &&
      value.city_id &&
      value.zone_id,
  );
}

export async function POST(request: Request) {
  const auth = await getApiContext(["customer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<AddressBody>(request);
  const address = cleanAddress(body, auth.context.user.id);

  if (!hasRequiredAddress(address)) {
    return jsonError("أكمل بيانات العنوان أولاً.", 400);
  }

  if (address.is_default) {
    await auth.context.supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", auth.context.user.id);
  }

  const { data, error } = await auth.context.supabase
    .from("customer_addresses")
    .insert(address)
    .select("id")
    .single();

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ address: data }, 201);
}

export async function PATCH(request: Request) {
  const auth = await getApiContext(["customer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<AddressBody>(request);

  if (!body.id) {
    return jsonError("اختر العنوان أولاً.", 400);
  }

  const address = cleanAddress(body, auth.context.user.id);

  if (!hasRequiredAddress(address)) {
    return jsonError("أكمل بيانات العنوان أولاً.", 400);
  }

  if (address.is_default) {
    await auth.context.supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", auth.context.user.id);
  }

  const { data, error } = await auth.context.supabase
    .from("customer_addresses")
    .update(address)
    .eq("id", body.id)
    .eq("customer_id", auth.context.user.id)
    .select("id")
    .single();

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk({ address: data });
}

export async function DELETE(request: Request) {
  const auth = await getApiContext(["customer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<{ id?: string }>(request);

  if (!body.id) {
    return jsonError("اختر العنوان أولاً.", 400);
  }

  const { error } = await auth.context.supabase
    .from("customer_addresses")
    .delete()
    .eq("id", body.id)
    .eq("customer_id", auth.context.user.id);

  if (error) {
    return mapDatabaseError(error);
  }

  return jsonOk();
}
