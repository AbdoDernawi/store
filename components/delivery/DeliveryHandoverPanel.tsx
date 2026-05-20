"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2, Loader2, PackageCheck, RotateCcw, Send } from "lucide-react";
import { formatDate, formatMoney, orderStatusLabels, statusTone } from "@/lib/admin/format";
import type { DeliveryHandover, DeliveryOrderListItem } from "@/lib/delivery/data";

type HandoverState = {
  tone: "idle" | "success" | "error";
  message: string;
};

const handoverTypeLabels: Record<string, string> = {
  cash_full: "تسليم كل الكاش",
  cash_partial: "تسليم كاش محدد",
  return_goods: "تسليم مرتجعات",
};

export function DeliveryHandoverPanel({
  cashOrders,
  handovers,
  returnOrders,
}: {
  cashOrders: DeliveryOrderListItem[];
  handovers: DeliveryHandover[];
  returnOrders: DeliveryOrderListItem[];
}) {
  const router = useRouter();
  const [selectedCash, setSelectedCash] = useState<string[]>([]);
  const [selectedReturns, setSelectedReturns] = useState<string[]>([]);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [state, setState] = useState<HandoverState>({
    tone: "idle",
    message: "اختر نوع العهدة، وسيتم إرسالها للإدارة للتأكيد.",
  });
  const selectedCashTotal = useMemo(
    () => cashOrders.filter((order) => selectedCash.includes(order.id)).reduce((sum, order) => sum + order.total, 0),
    [cashOrders, selectedCash],
  );
  const allCashTotal = useMemo(
    () => cashOrders.reduce((sum, order) => sum + order.total, 0),
    [cashOrders],
  );

  function toggleCash(orderId: string) {
    setSelectedCash((current) =>
      current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId],
    );
  }

  function toggleReturn(orderId: string) {
    setSelectedReturns((current) =>
      current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId],
    );
  }

  async function createHandover(type: "cash_full" | "cash_partial" | "return_goods") {
    const orderIds =
      type === "cash_partial" ? selectedCash : type === "return_goods" ? selectedReturns : [];

    if (type !== "cash_full" && !orderIds.length) {
      setState({ tone: "error", message: "اختر طلباً واحداً على الأقل." });
      return;
    }

    setLoadingType(type);
    setState({ tone: "idle", message: "جاري إنشاء العهدة..." });

    const response = await fetch("/api/delivery/handovers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds, type }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setLoadingType(null);

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر إنشاء العهدة." });
      return;
    }

    setSelectedCash([]);
    setSelectedReturns([]);
    setState({ tone: "success", message: "تم إنشاء العهدة، وهي بانتظار تأكيد الإدارة." });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-[#eef8f5] p-5 ring-1 ring-teal-100">
        <p className="text-xs font-black text-teal-700">العهدة</p>
        <h2 className="mt-2 text-2xl font-black leading-9 text-slate-950">سلّم الكاش والمرتجعات بخطوة واضحة</h2>
      </section>

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Banknote size={18} />
            </span>
            <h3 className="text-base font-black text-slate-950">الكاش</h3>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
            {formatMoney(allCashTotal)}
          </span>
        </div>

        <button
          className="mb-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
          disabled={loadingType !== null || !cashOrders.length}
          onClick={() => void createHandover("cash_full")}
          type="button"
        >
          {loadingType === "cash_full" ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
          تسليم كل الكاش
        </button>

        <div className="space-y-2">
          {cashOrders.length ? (
            cashOrders.map((order) => (
              <SelectableOrderCard
                checked={selectedCash.includes(order.id)}
                key={order.id}
                onToggle={() => toggleCash(order.id)}
                order={order}
              />
            ))
          ) : (
            <EmptyLine text="لا توجد مبالغ كاش بانتظار العهدة." />
          )}
        </div>

        <button
          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-600 px-5 text-sm font-black text-white transition hover:bg-teal-700 disabled:bg-slate-100 disabled:text-slate-400"
          disabled={loadingType !== null || !selectedCash.length}
          onClick={() => void createHandover("cash_partial")}
          type="button"
        >
          {loadingType === "cash_partial" ? <Loader2 className="animate-spin" size={17} /> : <PackageCheck size={17} />}
          تسليم المحدد · {formatMoney(selectedCashTotal)}
        </button>
      </section>

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <RotateCcw size={18} />
          </span>
          <div>
            <h3 className="text-base font-black text-slate-950">المرتجعات</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">الإدارة تؤكد الاستلام ثم يحفظها المخزن.</p>
          </div>
        </div>

        <div className="space-y-2">
          {returnOrders.length ? (
            returnOrders.map((order) => (
              <SelectableOrderCard
                checked={selectedReturns.includes(order.id)}
                key={order.id}
                onToggle={() => toggleReturn(order.id)}
                order={order}
              />
            ))
          ) : (
            <EmptyLine text="لا توجد مرتجعات جاهزة للتسليم." />
          )}
        </div>

        <button
          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-5 text-sm font-black text-white transition hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400"
          disabled={loadingType !== null || !selectedReturns.length}
          onClick={() => void createHandover("return_goods")}
          type="button"
        >
          {loadingType === "return_goods" ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
          تسليم المرتجعات المحددة
        </button>
      </section>

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

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-700">
            <CheckCircle2 size={18} />
          </span>
          <h3 className="text-base font-black text-slate-950">آخر العهد</h3>
        </div>
        <div className="space-y-2">
          {handovers.length ? (
            handovers.map((handover) => (
              <div className="rounded-[1rem] bg-slate-50 p-3 ring-1 ring-slate-100" key={handover.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {handoverTypeLabels[handover.type] || handover.type}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(handover.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusTone(handover.status)}`}>
                    {handover.status === "pending" ? "بانتظار التأكيد" : handover.status === "confirmed" ? "مؤكدة" : "مرفوضة"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-black text-emerald-700">{formatMoney(handover.total_amount)}</p>
              </div>
            ))
          ) : (
            <EmptyLine text="لا توجد عهد سابقة بعد." />
          )}
        </div>
      </section>
    </div>
  );
}

function SelectableOrderCard({
  checked,
  onToggle,
  order,
}: {
  checked: boolean;
  onToggle: () => void;
  order: DeliveryOrderListItem;
}) {
  return (
    <button
      className={`w-full rounded-[1.05rem] p-3 text-right ring-1 transition ${
        checked ? "bg-teal-50 ring-teal-200" : "bg-slate-50 ring-slate-100 hover:bg-teal-50"
      }`}
      onClick={onToggle}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">
            #{order.order_number || "-"} · {order.customer_name}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {order.city_name} · {order.zone_name}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusTone(order.status)}`}>
          {orderStatusLabels[order.status] || order.status}
        </span>
      </div>
      <p className="mt-2 text-sm font-black text-emerald-700">{formatMoney(order.total)}</p>
    </button>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-[1rem] bg-slate-50 p-4 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-100">
      {text}
    </div>
  );
}
