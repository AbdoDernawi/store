import { ArrowLeftRight, Boxes, GitBranch, PackageCheck, ShoppingCart } from "lucide-react";
import { WarehouseOperationShop, WarehousePriorityPlanner } from "@/components/admin/WarehouseOperationShop";
import { getAdminWarehouses, cityNameMap, warehouseNameMap } from "@/lib/admin/management";
import { formatNumber } from "@/lib/admin/format";

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

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.7rem] border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
        <div className="grid gap-4 p-5 xl:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
              <Boxes size={19} />
              المخازن
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950">مخازن تعمل مثل متجر داخلي</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
              تنقل بين الأقسام، اختر المنتج واللون والمقاس والكمية، ثم نفذ التحويل أو تعديل المخزون من سلة واحدة مريحة.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">تصفح كالمتجر</span>
              <span className="rounded-full bg-sky-50 px-4 py-2 text-xs font-black text-sky-700 ring-1 ring-sky-100">سلة عمليات</span>
              <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-700 ring-1 ring-amber-100">قيود تعديل آمنة</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MetricCard icon={PackageCheck} label="المتوفر" value={formatNumber(totals.available)} />
            <MetricCard icon={ShoppingCart} label="المحجوز" value={formatNumber(totals.reserved)} />
            <MetricCard icon={ArrowLeftRight} label="منخفض المخزون" value={formatNumber(totals.low)} />
          </div>
        </div>
      </section>

      <section className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center gap-2">
          <PackageCheck className="text-emerald-600" size={20} />
          <h3 className="text-sm font-black text-slate-950">اختيار المنتجات وسلة العمليات</h3>
        </div>
        <WarehouseOperationShop categories={data.categories} variants={data.variants} warehouses={data.warehouses} />
      </section>

      <section className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
          <GitBranch size={19} />
          الأولويات
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">ترتيب السحب حسب المدينة</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
          هذا الجزء يبقى لإدارة أولوية المخازن عند تجهيز الطلبات، بعيداً عن تجربة اختيار المنتجات.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <Boxes className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">رصيد حديث للمراجعة</h3>
          </div>
          <div className="space-y-3">
            {data.inventory.map((row) => (
              <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 md:grid-cols-[1.2fr_0.8fr_0.6fr_0.6fr]" key={row.id}>
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {row.product_variants?.products?.name_ar || "منتج"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {[row.product_variants?.color, row.product_variants?.size, row.product_variants?.type].filter(Boolean).join(" / ") || "خيار أساسي"}
                  </p>
                </div>
                <p className="text-sm font-black text-slate-700">{row.warehouses?.name || "مخزن"}</p>
                <p className="text-sm font-black text-emerald-700">{formatNumber(row.quantity_available)} متاح</p>
                <p className="text-sm font-black text-amber-700">{formatNumber(row.quantity_reserved)} محجوز</p>
              </div>
            ))}
            {!data.inventory.length ? <EmptyText text="لا توجد أرصدة مخزون بعد." /> : null}
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <GitBranch className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">أولوية المدن</h3>
          </div>
          <div className="space-y-3">
            <WarehousePriorityPlanner cities={data.cities} warehouses={data.warehouses} />
            {data.priorities.map((priority) => (
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3" key={priority.id}>
                <div>
                  <p className="text-sm font-black text-slate-900">{cities.get(priority.city_id) || "مدينة"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{warehouses.get(priority.warehouse_id) || "مخزن"}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
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

function EmptyText({ text }: { text: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">{text}</div>;
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PackageCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-center gap-2 text-emerald-600">
        <Icon size={18} />
        <span className="text-xs font-black text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
