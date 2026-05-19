"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Ban,
  Check,
  ClipboardCheck,
  CreditCard,
  MessageCircle,
  PackagePlus,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

type OrderActionsPanelProps = {
  orderId: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  chatId?: string | null;
};

type ActionState = {
  tone: "idle" | "success" | "error";
  message: string;
};

export function OrderActionsPanel({
  orderId,
  status,
  paymentMethod,
  paymentStatus,
  chatId,
}: OrderActionsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [handoverId, setHandoverId] = useState("");
  const [state, setState] = useState<ActionState>({
    tone: "idle",
    message: "اختر الإجراء المناسب للطلب.",
  });

  async function runAction(
    endpoint: string,
    body: Record<string, unknown>,
    successMessage: string,
  ) {
    setState({ tone: "idle", message: "جاري تنفيذ الإجراء..." });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok || data.error) {
      setState({
        tone: "error",
        message: data.error || "تعذر تنفيذ الإجراء الآن.",
      });
      return;
    }

    setState({ tone: "success", message: successMessage });
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardCheck className="text-emerald-600" size={20} />
        <h2 className="text-sm font-black text-slate-950">إجراءات الطلب</h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ActionButton
          disabled={isPending || status !== "pending_approval"}
          icon={Check}
          label="اعتماد الطلب"
          onClick={() =>
            runAction("/api/orders/approve", { order_id: orderId }, "تم اعتماد الطلب وحجز المخزون.")
          }
        />
        <ActionButton
          disabled={isPending || status !== "pending_approval" || reason.trim().length < 2}
          icon={Ban}
          label="رفض مع السبب"
          onClick={() =>
            runAction(
              "/api/orders/reject",
              { order_id: orderId, reason },
              "تم رفض الطلب وإرسال السبب.",
            )
          }
        />
        <ActionButton
          disabled={isPending || !["approved", "preparing", "ready"].includes(status)}
          icon={PackagePlus}
          label="إنشاء حزمة QR"
          onClick={() =>
            runAction(
              "/api/packages/create",
              { order_ids: [orderId] },
              "تم إنشاء حزمة QR وتجهيز الطلب.",
            )
          }
        />
        <ActionButton
          disabled={isPending || paymentMethod !== "bank_transfer" || paymentStatus === "confirmed"}
          icon={CreditCard}
          label="تأكيد التحويل"
          onClick={() =>
            runAction(
              "/api/orders/confirm-transfer",
              { order_id: orderId },
              "تم تأكيد التحويل وتحديث المالية.",
            )
          }
        />
        <ActionButton
          disabled={isPending || reason.trim().length < 2}
          icon={RotateCcw}
          label="إلغاء الطلب"
          onClick={() =>
            runAction(
              "/api/orders/cancel",
              { order_id: orderId, reason },
              "تم تحديث حالة الإلغاء.",
            )
          }
        />
        <ActionButton
          disabled={isPending || handoverId.trim().length < 10}
          icon={ClipboardCheck}
          label="تأكيد عهدة"
          onClick={() =>
            runAction(
              "/api/handovers/confirm",
              { handover_id: handoverId },
              "تم تأكيد العهدة وتحديث الخزنة.",
            )
          }
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-black text-slate-500">سبب الرفض أو الإلغاء</span>
          <textarea
            className="min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            onChange={(event) => setReason(event.target.value)}
            placeholder="اكتب سببًا واضحًا وقصيرًا"
            value={reason}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black text-slate-500">معرّف العهدة</span>
          <input
            className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            onChange={(event) => setHandoverId(event.target.value)}
            placeholder="يستخدم عند تأكيد تحصيل الكاش"
            value={handoverId}
          />
        </label>
      </div>

      <div
        className={`mt-4 rounded-lg px-4 py-3 text-sm font-black ${
          state.tone === "success"
            ? "bg-emerald-50 text-emerald-700"
            : state.tone === "error"
              ? "bg-rose-50 text-rose-700"
              : "bg-slate-50 text-slate-500"
        }`}
      >
        {state.message}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-100"
          disabled
          type="button"
        >
          دمج الطلبات
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-100"
          disabled
          type="button"
        >
          طلبات الاعتذار
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-100"
          disabled={!chatId}
          type="button"
        >
          <MessageCircle size={15} />
          المحادثة
        </button>
      </div>
    </div>
  );
}

function ActionButton({
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm shadow-emerald-950/10 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon size={17} />
      {label}
    </button>
  );
}
