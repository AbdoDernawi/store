"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Filter,
  Loader2,
  PackageCheck,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { orderStatusLabels, statusTone } from "@/lib/admin/format";
import type { DeliveryCustodyProductItem } from "@/lib/delivery/data";

type FilterMode = "all" | "not_delivered" | "returnable";

type ActionState = {
  tone: "idle" | "success" | "error";
  message: string;
};

const filterLabels: Record<FilterMode, string> = {
  all: "كل المنتجات",
  not_delivered: "لم تسلم بعد",
  returnable: "ترجع للمخزن",
};

export function DeliveryCustodyProductsPanel({ items }: { items: DeliveryCustodyProductItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [city, setCity] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [state, setState] = useState<ActionState>({
    tone: "idle",
    message: "يمكن ترجيع المنتجات الراجعة أو الملغية فقط. طلبات قيد التوصيل تبقى بعهدتك حتى تتغير حالتها.",
  });

  const cities = useMemo(
    () => Array.from(new Set(items.map((item) => item.city_name).filter(Boolean))),
    [items],
  );

  const visibleItems = useMemo(() => {
    const term = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "not_delivered" && item.order_status === "out_for_delivery") ||
        (filter === "returnable" && item.returnable);
      const matchesCity = city === "all" || item.city_name === city;
      const matchesQuery =
        !term ||
        item.product_name.toLowerCase().includes(term) ||
        item.variant_label.toLowerCase().includes(term) ||
        String(item.order_number || "").includes(term) ||
        item.customer_name.toLowerCase().includes(term);

      return matchesFilter && matchesCity && matchesQuery;
    });
  }, [city, filter, items, query]);

  const selectableIds = useMemo(
    () => visibleItems.filter((item) => item.returnable).map((item) => item.id),
    [visibleItems],
  );
  const selectedReturnableItems = useMemo(
    () => items.filter((item) => selected.includes(item.id) && item.returnable),
    [items, selected],
  );
  const selectedOrderIds = useMemo(
    () => Array.from(new Set(selectedReturnableItems.map((item) => item.order_id))),
    [selectedReturnableItems],
  );
  const selectedQuantity = selectedReturnableItems.reduce(
    (sum, item) => sum + item.returnable_quantity,
    0,
  );

  function toggleItem(item: DeliveryCustodyProductItem) {
    if (!item.returnable) {
      setState({
        tone: "error",
        message: "هذا المنتج لا يمكن ترجيعه الآن لأنه ما زال ضمن طلب قيد التوصيل.",
      });
      return;
    }

    setSelected((current) =>
      current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id],
    );
  }

  function toggleVisibleReturnables() {
    if (!selectableIds.length) {
      setState({ tone: "error", message: "لا توجد منتجات قابلة للترجيع ضمن الفلتر الحالي." });
      return;
    }

    const allSelected = selectableIds.every((id) => selected.includes(id));
    setSelected((current) =>
      allSelected
        ? current.filter((id) => !selectableIds.includes(id))
        : Array.from(new Set([...current, ...selectableIds])),
    );
  }

  async function submitReturnHandover() {
    if (!selectedOrderIds.length) {
      setState({ tone: "error", message: "اختر منتجاً راجعاً واحداً على الأقل." });
      return;
    }

    setState({ tone: "idle", message: "جاري إنشاء عهدة المرتجعات..." });
    const response = await fetch("/api/delivery/handovers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: selectedReturnableItems.map((item) => ({
          orderItemId: item.id,
          quantity: item.returnable_quantity,
        })),
        orderIds: selectedOrderIds,
        type: "return_goods",
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر إنشاء عهدة المرتجعات." });
      return;
    }

    setSelected([]);
    setState({
      tone: "success",
      message: "تم إنشاء عهدة المرتجعات. عند تأكيد الإدارة ستعود المنتجات للمخزن.",
    });
    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-[1.45rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <PackageCheck size={18} />
            </span>
            <div>
              <p className="text-xs font-black text-teal-700">منتجات العهدة</p>
              <h3 className="text-lg font-black text-slate-950">كل قطعة معك واضحة ومفلترة</h3>
            </div>
          </div>
        </div>

        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-50 px-4 text-xs font-black text-slate-700 ring-1 ring-slate-100 transition hover:bg-teal-50 hover:text-teal-700"
          onClick={toggleVisibleReturnables}
          type="button"
        >
          <Check size={15} />
          تحديد القابل للترجيع
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
        <label className="flex h-11 min-w-0 items-center gap-2 rounded-full bg-slate-50 px-4 ring-1 ring-slate-100 focus-within:bg-white focus-within:ring-teal-200">
          <Search className="shrink-0 text-slate-400" size={16} />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بمنتج، زبون، أو رقم طلب"
            value={query}
          />
        </label>

        <select
          className="h-11 rounded-full border-0 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none ring-1 ring-slate-100 focus:bg-white focus:ring-teal-200"
          onChange={(event) => setCity(event.target.value)}
          value={city}
        >
          <option value="all">كل المدن</option>
          {cities.map((cityName) => (
            <option key={cityName} value={cityName}>
              {cityName}
            </option>
          ))}
        </select>

        <div className="flex gap-1 rounded-full bg-slate-50 p-1 ring-1 ring-slate-100">
          {(Object.keys(filterLabels) as FilterMode[]).map((mode) => (
            <button
              className={`h-9 rounded-full px-3 text-[11px] font-black transition ${
                filter === mode ? "bg-teal-600 text-white shadow-sm" : "text-slate-500 hover:bg-white"
              }`}
              key={mode}
              onClick={() => setFilter(mode)}
              type="button"
            >
              {filterLabels[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-2">
          {visibleItems.length ? (
            visibleItems.map((item) => (
              <button
                className={`grid w-full gap-3 rounded-[1.15rem] p-3 text-right ring-1 transition sm:grid-cols-[4rem_1fr_auto] ${
                  selected.includes(item.id)
                    ? "bg-teal-50 ring-teal-200"
                    : item.returnable
                      ? "bg-slate-50 ring-slate-100 hover:bg-teal-50"
                      : "bg-slate-50/70 ring-slate-100"
                }`}
                key={item.id}
                onClick={() => toggleItem(item)}
                type="button"
              >
                <div className="h-16 w-16 overflow-hidden rounded-[1rem] bg-white ring-1 ring-slate-100">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-full w-full object-cover" src={item.image_url} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-teal-50 text-teal-700">
                      <PackageCheck size={20} />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-slate-950">{item.product_name}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${statusTone(item.order_status)}`}>
                      {orderStatusLabels[item.order_status] || item.order_status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.variant_label}</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                    #{item.order_number || "-"} · {item.customer_name} · {item.city_name} · {item.store_name}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 sm:block sm:text-left">
                  <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-100">
                    × {item.custody_quantity.toLocaleString("ar-LY")}
                  </span>
                  <span
                    className={`mt-0 inline-flex rounded-full px-3 py-1 text-[11px] font-black ring-1 sm:mt-2 ${
                      item.returnable
                        ? "bg-amber-50 text-amber-700 ring-amber-100"
                        : "bg-sky-50 text-sky-700 ring-sky-100"
                    }`}
                  >
                    {item.returnable ? "قابل للترجيع" : "قيد التوصيل"}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[1.15rem] bg-slate-50 p-6 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-100">
              لا توجد منتجات مطابقة لهذا الفلتر.
            </div>
          )}
        </div>

        <aside className="h-fit rounded-[1.2rem] bg-[#f8fbf7] p-4 ring-1 ring-emerald-100">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="text-xs font-black text-emerald-700">إرسال المرتجعات</p>
              <p className="text-sm font-black text-slate-950">اختيار مضبوط وآمن</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <SummaryLine icon={Filter} label="طلبات محددة" value={selectedOrderIds.length.toLocaleString("ar-LY")} />
            <SummaryLine icon={RotateCcw} label="قطع راجعة" value={selectedQuantity.toLocaleString("ar-LY")} />
          </div>

          <button
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-5 text-sm font-black text-white transition hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={isPending || !selectedOrderIds.length}
            onClick={() => void submitReturnHandover()}
            type="button"
          >
            {isPending ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
            إنشاء عهدة مرتجعات
          </button>

          <div
            className={`mt-3 rounded-[1rem] px-3 py-3 text-xs font-black leading-6 ${
              state.tone === "success"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                : state.tone === "error"
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                  : "bg-white text-slate-500 ring-1 ring-slate-100"
            }`}
          >
            {state.message}
          </div>
        </aside>
      </div>
    </section>
  );
}

function SummaryLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Filter;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1rem] bg-white p-3 ring-1 ring-slate-100">
      <span className="inline-flex items-center gap-2 text-xs font-black text-slate-500">
        <Icon size={15} />
        {label}
      </span>
      <span className="text-sm font-black text-slate-950">{value}</span>
    </div>
  );
}
