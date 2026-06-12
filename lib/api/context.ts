import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createUserRouteClient } from "@/lib/supabase/route";
import type { AppRole, AuthSession } from "@/types/auth";

type ApiContext = {
  user: AuthSession;
  supabase: NonNullable<ReturnType<typeof createUserRouteClient>>;
};

const roleLabels: Record<AppRole, string> = {
  super_admin: "المشرف العام",
  admin: "المدير",
  marketer: "المسوق",
  delivery: "مندوب التوصيل",
  customer: "الزبون",
};

export function jsonOk(body: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ ok: true, ...body }, { status });
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      details,
    },
    { status },
  );
}

export async function getApiContext(roles?: AppRole[]): Promise<
  | { ok: true; context: ApiContext }
  | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: jsonError("يرجى تسجيل الدخول للمتابعة.", 401),
    };
  }

  if (roles?.length && !roles.includes(user.role)) {
    return {
      ok: false,
      response: jsonError(
        `هذه العملية غير متاحة لدور ${roleLabels[user.role]}.`,
        403,
      ),
    };
  }

  const supabase = createUserRouteClient();

  if (!supabase) {
    return {
      ok: false,
      response: jsonError("انتهت جلسة البيانات. سجّل الدخول مرة أخرى بلطف.", 401),
    };
  }

  return {
    ok: true,
    context: {
      user,
      supabase,
    },
  };
}

export function mapDatabaseError(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message)
      : String(error || "");

  if (message.includes("INSUFFICIENT_STOCK")) {
    return jsonError("الكمية المتاحة لا تكفي لهذا الطلب.", 409, message);
  }

  if (message.includes("INSUFFICIENT_SOURCE_STOCK")) {
    return jsonError("الكمية المتاحة في المخزن المصدر لا تكفي لإتمام العملية.", 409, message);
  }

  if (
    message.includes("INVALID_TRANSFER") ||
    message.includes("INVALID_TRANSFER_ITEM") ||
    message.includes("NO_TRANSFER_ITEMS") ||
    message.includes("INVALID_ADJUST_ITEM") ||
    message.includes("NO_ADJUST_ITEMS")
  ) {
    return jsonError("راجع سلة المنتجات والمخازن ثم حاول من جديد.", 400, message);
  }

  if (message.includes("VARIANT_HAS_STOCK")) {
    return jsonError("لا يمكن حذف لون أو مقاس عليه مخزون أو كمية محجوزة.", 409, message);
  }

  if (message.includes("VARIANT_USED_IN_ORDERS")) {
    return jsonError("لا يمكن حذف خيار مستخدم في طلبات سابقة. يمكن تعطيله من البيع بدلاً من حذفه.", 409, message);
  }

  if (message.includes("PRODUCT_OUT_OF_STOCK") || message.includes("PRODUCT_NOT_AVAILABLE")) {
    return jsonError("هذا المنتج غير متوفر حالياً.", 409, message);
  }

  if (message.includes("INVALID_ORDER_ITEMS") || message.includes("INVALID_ORDER_ITEM")) {
    return jsonError("راجع سلة المنتجات والكميات ثم حاول من جديد.", 400, message);
  }

  if (
    message.includes("ZERO_DELTA") ||
    message.includes("EMPTY_ITEMS") ||
    message.includes("INVALID_ITEM") ||
    message.includes("INVALID_TOTAL") ||
    message.includes("INVALID_AMOUNT")
  ) {
    return jsonError("راجع البيانات المدخلة ثم حاول من جديد.", 400, message);
  }

  if (message.includes("PACKAGE_ALREADY_ASSIGNED")) {
    return jsonError("هذا الطلب أُسند لمندوب آخر.", 409);
  }

  if (message.includes("PACKAGE_NOT_FOUND")) {
    return jsonError("لم يتم العثور على هذا الكود. جرّب المسح من جديد.", 404);
  }

  if (message.includes("NO_CASH_TO_HANDOVER")) {
    return jsonError("لا توجد مبالغ كاش جاهزة للتسليم حالياً.", 409, message);
  }

  if (message.includes("NO_HANDOVER_ORDERS")) {
    return jsonError("اختر طلباً واحداً على الأقل لإنشاء العهدة.", 400, message);
  }

  if (message.includes("INVALID_RETURN_HANDOVER_ITEMS")) {
    return jsonError("عهدة المرتجعات تقبل المنتجات الراجعة أو الملغية فقط وبكميات صحيحة.", 400, message);
  }

  if (message.includes("INVALID_RETURN_HANDOVER")) {
    return jsonError("عهدة المرتجعات تقبل الطلبات الراجعة أو الملغية فقط.", 400, message);
  }

  if (message.includes("INVALID_EXCUSE_REASON")) {
    return jsonError("اكتب سبب الاعتذار باختصار.", 400, message);
  }

  if (message.includes("INVALID_HANDOVER_TYPE") || message.includes("INVALID_DELIVERY_TYPE")) {
    return jsonError("نوع العملية غير واضح. راجع الاختيار ثم حاول مرة أخرى.", 400, message);
  }

  if (message.includes("FORBIDDEN")) {
    return jsonError("لا تملك صلاحية تنفيذ هذه العملية.", 403);
  }

  if (message.includes("NOT_FOUND")) {
    return jsonError("العنصر المطلوب غير موجود.", 404);
  }

  if (message.includes("ALREADY")) {
    return jsonError("تم تنفيذ هذه العملية سابقًا.", 409);
  }

  if (
    message.includes("INVALID_CUSTOMER_DETAILS") ||
    message.includes("INVALID_DELIVERY_ZONE")
  ) {
    return jsonError("راجع بيانات الزبون والمنطقة ثم حاول من جديد.", 400, message);
  }

  if (
    message.includes("ORDER_NOT_EDITABLE") ||
    message.includes("ORDER_CANNOT_BE_CANCELLED") ||
    message.includes("CHAT_NOT_AVAILABLE")
  ) {
    return jsonError("هذه العملية غير متاحة لحالة الطلب الحالية.", 409, message);
  }

  return jsonError("حدث تعثر بسيط أثناء تنفيذ العملية.", 500, message);
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  return (await request.json().catch(() => ({}))) as T;
}
