"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Send, Truck } from "lucide-react";
import type { DeliveryOrderDetails } from "@/lib/delivery/data";

type DeliveryMode = "full" | "partial_return" | "full_return";

type ActionState = {
  tone: "idle" | "success" | "error";
  message: string;
};

const textareaClass =
  "min-h-24 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-50";

export function DeliveryOrderActions({
  items,
  order,
}: {
  items: DeliveryOrderDetails["items"];
  order: DeliveryOrderDetails["order"];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<DeliveryMode>("full");
  const [reason, setReason] = useState("");
  const [excuseReason, setExcuseReason] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [state, setState] = useState<ActionState>({
    tone: "idle",
    message: "اختر نتيجة الزيارة عندما تكون أمام الزبون.",
  });
  const canDeliver = order.status === "out_for_delivery";
  const returnedItems = useMemo(
    () =>
      items
        .map((item) => ({
          order_item_id: item.id,
          original_warehouse_id: item.warehouse_id,
          product_variant_id: item.variant_id,
          quantity: Number(returnQuantities[item.id] || 0),
        }))
        .filter((item) => item.quantity > 0),
    [items, returnQuantities],
  );

  async function submitDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canDeliver) {
      setState({ tone: "error", message: "هذا الطلب لم يعد في مرحلة التوصيل." });
      return;
    }

    if (mode === "partial_return" && !returnedItems.length) {
      setState({ tone: "error", message: "حدد الكميات الراجعة أولاً." });
      return;
    }

    if ((mode === "partial_return" || mode === "full_return") && !reason.trim()) {
      setState({ tone: "error", message: "اكتب سبب الراجع باختصار." });
      return;
    }

    setState({ tone: "idle", message: "جاري حفظ نتيجة التسليم..." });
    const response = await fetch("/api/orders/deliver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: mode === "partial_return" ? returnedItems : [],
        orderId: order.id,
        reason,
        type: mode,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر حفظ نتيجة التسليم." });
      return;
    }

    setState({ tone: "success", message: "تم حفظ نتيجة التسليم بنجاح." });
    startTransition(() => router.refresh());
  }

  async function submitExcuse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!excuseReason.trim()) {
      setState({ tone: "error", message: "اكتب سبب الاعتذار باختصار." });
      return;
    }

    setState({ tone: "idle", message: "جاري إرسال طلب الاعتذار للإدارة..." });
    const response = await fetch("/api/delivery/excuse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, reason: excuseReason }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر إرسال الاعتذار." });
      return;
    }

    setState({ tone: "success", message: "تم إرسال الاعتذار، وينتظر موافقة الإدارة." });
    setExcuseReason("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4" id="delivery-actions">
      <form className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5" onSubmit={submitDelivery}>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <Truck size={18} />
          </span>
          <h3 className="text-base font-black text-slate-950">نتيجة التسليم</h3>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <ModeButton active={mode === "full"} icon={CheckCircle2} label="تسليم كامل" onClick={() => setMode("full")} />
          <ModeButton active={mode === "partial_return"} icon={RotateCcw} label="راجع جزئي" onClick={() => setMode("partial_return")} />
          <ModeButton active={mode === "full_return"} icon={AlertCircle} label="راجع كامل" onClick={() => setMode("full_return")} />
        </div>

        {mode === "partial_return" ? (
          <div className="mt-4 space-y-3 rounded-[1.1rem] bg-slate-50 p-3 ring-1 ring-slate-100">
            {items.map((item) => (
              <label className="grid gap-3 rounded-[1rem] bg-white p-3 ring-1 ring-slate-100 sm:grid-cols-[1fr_auto]" key={item.id}>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900">{item.product_name}</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">
                    {item.variant_label} · الكمية {item.quantity.toLocaleString("ar-LY")}
                  </span>
                </span>
                <input
                  className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-center text-sm font-black text-slate-800 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-50 sm:w-24"
                  max={item.quantity}
                  min={0}
                  onChange={(event) =>
                    setReturnQuantities((current) => ({
                      ...current,
                      [item.id]: Number(event.target.value || 0),
                    }))
                  }
                  type="number"
                  value={returnQuantities[item.id] || 0}
                />
              </label>
            ))}
          </div>
        ) : null}

        {mode !== "full" ? (
          <textarea
            className={`${textareaClass} mt-4`}
            onChange={(event) => setReason(event.target.value)}
            placeholder="سبب الراجع"
            value={reason}
          />
        ) : null}

        <button
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-600 px-5 text-sm font-black text-white transition hover:bg-teal-700 disabled:bg-slate-100 disabled:text-slate-400"
          disabled={isPending || !canDeliver}
          type="submit"
        >
          {isPending ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
          حفظ النتيجة
        </button>
      </form>

      <form className="rounded-[1.35rem] border border-amber-100 bg-white p-4 shadow-sm shadow-amber-950/5" onSubmit={submitExcuse}>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertCircle size={18} />
          </span>
          <h3 className="text-base font-black text-slate-950">اعتذار عن الطلب</h3>
        </div>
        <textarea
          className={textareaClass}
          disabled={!canDeliver}
          onChange={(event) => setExcuseReason(event.target.value)}
          placeholder="سبب الاعتذار"
          value={excuseReason}
        />
        <button
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-5 text-sm font-black text-white transition hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400"
          disabled={isPending || !canDeliver || !excuseReason.trim()}
          type="submit"
        >
          {isPending ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
          إرسال للإدارة
        </button>
      </form>

      <div
        className={`rounded-[1.2rem] px-4 py-3 text-sm font-black ${
          state.tone === "success"
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
            : state.tone === "error"
              ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
              : "bg-slate-50 text-slate-500 ring-1 ring-slate-100"
        }`}
      >
        {state.message}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof CheckCircle2;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-xs font-black ring-1 transition ${
        active
          ? "bg-teal-600 text-white ring-teal-600"
          : "bg-slate-50 text-slate-600 ring-slate-100 hover:bg-teal-50 hover:text-teal-700"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
