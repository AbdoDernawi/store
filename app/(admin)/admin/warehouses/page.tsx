import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Boxes,
  GitBranch,
  PackageCheck,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import { WarehouseOperationShop, WarehousePriorityPlanner } from "@/components/admin/WarehouseOperationShop";
import { getAdminWarehouses, cityNameMap, warehouseNameMap } from "@/lib/admin/management";
import { formatDate, formatNumber } from "@/lib/admin/format";

const movementLabels: Record<string, string> = {
  in: "وارد",
  out: "صادر",
  reserved: "حجز",
  unreserved: "فك حجز",
  return: "راجع",
  transfer_in: "تحويل وارد",
  transfer_out: "تحويل صادر",
};

export default async function AdminWarehousesPage() {
  const data = await getAdminWarehouses();
  const cities = cityNameMap(data.cities);
  const warehouses = warehouseNameMap(data.warehouses);
  const totals = data.inventory.reduce(
    (sum, row) => ({
      available: sum.available + Number(row.quantity_available || 0),
      reserved: sum.reserved + Number(row.quantity_reserved || 0),
      low: sum.low + (Number(row.quantity_available || 0) <= Number(row.low_stock_threshold || 0) ? 1 : 0),
    }),
    { available: 0, reserved: 0, low: 0 },
  );
  const todayKey = new Date().toDateString();
  const todayMovements = data.movements.filter((movement) => new Date(movement.created_at).toDateString() === todayKey);
  const warehouseBalances = data.warehouses.map((warehouse) => {
    const rows = data.inventory.filter((row) => row.warehouse_id === warehouse.id);

    return {
      ...warehouse,
      available: rows.reduce((sum, row) => sum + Number(row.quantity_available || 0), 0),
      reserved: rows.reduce((sum, row) => sum + Number(row.quantity_reserved || 0), 0),
    };
  });

  return (
    <div className="space-y-4">
      <section className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <PanelHeading index="1" title="المخازن - نظرة عامة" />

        <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          <MetricCard icon={Boxes} label="إجمالي رصيد المخزون" meta="رصيد متاح في المخازن" value={formatNumber(totals.available)} />
          <MetricCard icon={ArrowLeftRight} label="منخفض المخزون" meta="منتجات تحتاج متابعة" tone="amber" value={formatNumber(totals.low)} />
          <MetricCard icon={ShoppingCart} label="المخزون المحجوز" meta="مخصص للطلبيات" tone="sky" value={formatNumber(totals.reserved)} />
          <MetricCard icon={PackageCheck} label="حركات اليوم" meta={`${formatNumber(todayMovements.length)} حركة حديثة`} value={formatNumber(todayMovements.length)} />
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <article className="rounded-[1rem] border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-slate-950">قائمة المخازن</h2>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                {formatNumber(data.warehouses.length)} مخزن
              </span>
            </div>

            <div className="grid gap-2 lg:grid-cols-2">
              {warehouseBalances.map((warehouse) => (
                <div className="rounded-[0.95rem] border border-slate-200 bg-white p-3" key={warehouse.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-emerald-50 text-emerald-700">
                        <Warehouse size={17} />
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-950">{warehouse.name}</p>
                        <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                          {warehouse.cities?.name_ar || "مدينة غير محددة"}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${warehouse.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {warehouse.is_active ? "نشط" : "مخفي"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">متوفر {formatNumber(warehouse.available)}</span>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">محجوز {formatNumber(warehouse.reserved)}</span>
                  </div>
                </div>
              ))}
              {!warehouseBalances.length ? <EmptyText text="لا توجد مخازن بعد." /> : null}
            </div>
          </article>

          <article className="rounded-[1rem] border border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-slate-950">آخر الحركات</h2>
              <span className="text-[11px] font-black text-emerald-700">عرض حديث</span>
            </div>

            <div className="space-y-2">
              {data.movements.slice(0, 5).map((movement) => {
                const isOutgoing = movement.type === "out" || movement.type === "reserved" || movement.type === "transfer_out";
                const MovementIcon = isOutgoing ? ArrowDownRight : ArrowUpRight;

                return (
                  <div className="rounded-[0.9rem] bg-slate-50 px-3 py-2.5" key={movement.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isOutgoing ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}>
                          <MovementIcon size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-slate-900">
                            {movement.product_variants?.products?.name_ar || movementLabels[movement.type] || "حركة مخزون"}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
                            {warehouses.get(movement.warehouse_id) || "مخزن"} · {formatDate(movement.created_at)}
                          </p>
                        </div>
                      </div>
                      <strong className={`shrink-0 text-xs font-black ${isOutgoing ? "text-rose-600" : "text-emerald-700"}`}>
                        {isOutgoing ? "-" : "+"}{formatNumber(movement.quantity)}
                      </strong>
                    </div>
                  </div>
                );
              })}
              {!data.movements.length ? <EmptyText text="لا توجد حركات مخزون مسجلة بعد." /> : null}
            </div>
          </article>
        </div>
      </section>

      <WarehouseOperationShop categories={data.categories} variants={data.variants} warehouses={data.warehouses} />

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_400px]">
        <article className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
          <div className="mb-3 flex items-center gap-2">
            <GitBranch className="text-emerald-600" size={18} />
            <h2 className="text-sm font-black text-slate-950">ترتيب أولوية السحب حسب المدينة</h2>
          </div>
          <WarehousePriorityPlanner cities={data.cities} warehouses={data.warehouses} />
        </article>

        <article className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-slate-950">الأولويات المحفوظة</h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
              {formatNumber(data.priorities.length)}
            </span>
          </div>
          <div className="space-y-2">
            {data.priorities.map((priority) => (
              <div className="flex items-center justify-between rounded-[0.95rem] bg-slate-50 p-3" key={priority.id}>
                <div>
                  <p className="text-sm font-black text-slate-900">{cities.get(priority.city_id) || "مدينة"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{warehouses.get(priority.warehouse_id) || "مخزن"}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
                  {priority.priority_order}
                </span>
              </div>
            ))}
            {!data.priorities.length ? <EmptyText text="لم يتم ترتيب الأولويات بعد." /> : null}
          </div>
        </article>
      </section>
    </div>
  );
}

function PanelHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-sm font-black text-white">
        {index}
      </span>
      <h1 className="text-lg font-black text-slate-950">{title}</h1>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="rounded-[0.9rem] bg-slate-50 p-3 text-sm font-bold text-slate-500">{text}</div>;
}

function MetricCard({
  icon: Icon,
  label,
  meta,
  tone = "emerald",
  value,
}: {
  icon: typeof PackageCheck;
  label: string;
  meta: string;
  tone?: "emerald" | "amber" | "sky";
  value: string;
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 text-amber-600"
      : tone === "sky"
        ? "bg-sky-50 text-sky-600"
        : "bg-emerald-50 text-emerald-700";

  return (
    <div className="rounded-[1rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-black text-slate-500">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-[0.7rem] ${toneClass}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-[11px] font-bold text-slate-500">{meta}</p>
    </div>
  );
}
