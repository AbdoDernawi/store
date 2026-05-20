import { getApiContext, jsonError, jsonOk, mapDatabaseError, readJsonBody } from "@/lib/api/context";

type MessageBody = {
  message?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getApiContext(["delivery"]);

  if (!auth.ok) {
    return auth.response;
  }

  const { data: order, error: orderError } = await auth.context.supabase
    .from("orders")
    .select("id")
    .eq("id", params.id)
    .eq("delivery_id", auth.context.user.id)
    .maybeSingle();

  if (orderError) {
    return mapDatabaseError(orderError);
  }

  if (!order) {
    return jsonError("المحادثة غير متاحة لهذا الطلب.", 404);
  }

  const { data: chat, error } = await auth.context.supabase
    .from("order_chats")
    .select("id, is_open")
    .eq("order_id", params.id)
    .maybeSingle();

  if (error) {
    return mapDatabaseError(error);
  }

  if (!chat?.id) {
    return jsonError("المحادثة غير متاحة لهذا الطلب.", 404);
  }

  const { data: messages, error: messagesError } = await auth.context.supabase
    .from("chat_messages")
    .select("id, sender_id, message, is_read, created_at")
    .eq("chat_id", chat.id)
    .order("created_at", { ascending: true })
    .limit(120);

  if (messagesError) {
    return mapDatabaseError(messagesError);
  }

  await auth.context.supabase
    .from("chat_messages")
    .update({ is_read: true })
    .eq("chat_id", chat.id)
    .neq("sender_id", auth.context.user.id);

  return jsonOk({
    chat,
    messages: messages || [],
    user_id: auth.context.user.id,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await getApiContext(["delivery"]);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJsonBody<MessageBody>(request);
  const message = String(body.message || "").trim();

  if (message.length < 1) {
    return jsonError("اكتب رسالة قصيرة أولاً.", 400);
  }

  const { data: order, error: orderError } = await auth.context.supabase
    .from("orders")
    .select("id")
    .eq("id", params.id)
    .eq("delivery_id", auth.context.user.id)
    .maybeSingle();

  if (orderError) {
    return mapDatabaseError(orderError);
  }

  if (!order) {
    return jsonError("المحادثة غير متاحة لهذا الطلب.", 404);
  }

  const { data: chat, error } = await auth.context.supabase
    .from("order_chats")
    .select("id, is_open")
    .eq("order_id", params.id)
    .maybeSingle();

  if (error) {
    return mapDatabaseError(error);
  }

  if (!chat?.id || !chat.is_open) {
    return jsonError("المحادثة مغلقة.", 409);
  }

  const { data, error: insertError } = await auth.context.supabase
    .from("chat_messages")
    .insert({
      chat_id: chat.id,
      message,
      sender_id: auth.context.user.id,
    })
    .select("id, sender_id, message, is_read, created_at")
    .single();

  if (insertError) {
    return mapDatabaseError(insertError);
  }

  return jsonOk({ chat, message: data }, 201);
}
