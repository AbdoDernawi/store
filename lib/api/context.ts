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

  if (message.includes("PACKAGE_ALREADY_ASSIGNED")) {
    return jsonError("هذا الطلب أُسند لمندوب آخر.", 409);
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
