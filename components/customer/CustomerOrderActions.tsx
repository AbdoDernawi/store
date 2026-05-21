"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Save, Send, XCircle } from "lucide-react";
import type { CustomerCity, CustomerOrderDetails, CustomerZone } from "@/lib/customer/data";

type ActionState = {
  tone: "idle" | "success" | "error";
  message: string;
};

const inputClass =
  "h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50";
const textareaClass =
  "min-h-24 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50";

export function CustomerOrderActions({
  cities,
  order,
  zones,
}: {
  cities: CustomerCity[];
  order: CustomerOrderDetails["order"];
  zones: CustomerZone[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ActionState>({
    tone: "idle",
    message: "التعديل متاح قبل الاعتماد فقط.",
  });
  const [cityId, setCityId] = useState(order.city_id);
  const [zoneId, setZoneId] = useState(order.zone_id);
  const cityZones = useMemo(() => zones.filter((zone) => zone.city_id === cityId), [cityId, zones]);
  const canEdit = order.status === "pending_approval";
  const canRequestCancel =
    !["rejected", "cancelled", "delivered", "partial_return", "full_return"].includes(order.status) &&
    !order.cancellation_requested_by;

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ tone: "idle", message: "جاري حفظ التعديل..." });

    const response = await fetch(`/api/customer/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city_id: cityId,
        customer_address: String(form.get("customer_address") || ""),
        customer_name: String(form.get("customer_name") || ""),
        customer_phone: String(form.get("customer_phone") || ""),
        zone_id: zoneId,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر تعديل الطلب." });
      return;
    }

    setState({ tone: "success", message: "تم حفظ التعديل." });
    startTransition(() => router.refresh());
  }

  async function submitCancel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ tone: "idle", message: "جاري إرسال الطلب..." });

    const response = await fetch(`/api/customer/orders/${order.id}/cancel-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: String(form.get("reason") || "") }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر إرسال طلب الإلغاء." });
      return;
    }

    setState({
      tone: "success",
      message: canEdit ? "تم إلغاء الطلب." : "تم إرسال طلب الإلغاء للإدارة.",
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <form className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5" onSubmit={submitEdit}>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Save size={18} />
            </span>
            <h3 className="text-base font-black text-slate-950">تعديل بيانات الطلب</h3>
          </div>

          <div className="space-y-3">
            <input className={inputClass} defaultValue={order.customer_name} name="customer_name" placeholder="الاسم" />
            <input className={inputClass} defaultValue={order.customer_phone} name="customer_phone" placeholder="الهاتف" />
            <textarea className={textareaClass} defaultValue={order.customer_address} name="customer_address" placeholder="العنوان" />
            <select
              className={inputClass}
              onChange={(event) => {
                setCityId(event.target.value);
                setZoneId("");
              }}
              value={cityId}
            >
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name_ar}
                </option>
              ))}
            </select>
            <select className={inputClass} onChange={(event) => setZoneId(event.target.value)} value={zoneId}>
              <option value="">المنطقة</option>
              {cityZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name_ar}
                </option>
              ))}
            </select>
          </div>

          <button
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={isPending}
            type="submit"
          >
            {isPending ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
            حفظ
          </button>
        </form>
      ) : null}

      {canRequestCancel ? (
        <form className="rounded-[1.25rem] border border-rose-100 bg-white p-4 shadow-sm shadow-rose-950/5" onSubmit={submitCancel}>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-700">
              {canEdit ? <XCircle size={18} /> : <AlertCircle size={18} />}
            </span>
            <h3 className="text-base font-black text-slate-950">{canEdit ? "إلغاء الطلب" : "طلب إلغاء"}</h3>
          </div>
          <textarea className={textareaClass} name="reason" placeholder="سبب الإلغاء" />
          <button
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-black text-white transition hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={isPending}
            type="submit"
          >
            {isPending ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
            {canEdit ? "إلغاء الآن" : "إرسال للإدارة"}
          </button>
        </form>
      ) : order.cancellation_requested_by ? (
        <div className="rounded-[1rem] bg-amber-50 p-4 text-sm font-black text-amber-700 ring-1 ring-amber-100">
          طلب الإلغاء مرسل وينتظر مراجعة الإدارة.
        </div>
      ) : null}

      <div
        className={`rounded-[1rem] px-4 py-3 text-sm font-black ${
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
