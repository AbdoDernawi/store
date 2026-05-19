import { Boxes, GitBranch, PackageCheck } from "lucide-react";
import { WarehouseTools } from "@/components/admin/AdminManagementForms";
import { getAdminWarehouses, cityNameMap, warehouseNameMap } from "@/lib/admin/management";
import { formatNumber } from "@/lib/admin/format";

export default async function AdminWarehousesPage() {
  const data = await getAdminWarehouses();
  const cities = cityNameMap(data.cities);
  const warehouses = warehouseNameMap(data.warehouses);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
          <Boxes size={19} />
          المخازن
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">المخزون والتحويلات</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
          عدّل الكميات، انقل بين المخازن، ورتّب أولوية السحب حسب المدينة.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center gap-2">
          <PackageCheck className="text-emerald-600" size={20} />
          <h3 className="text-sm font-black text-slate-950">عمليات المخزون</h3>
        </div>
        <WarehouseTools cities={data.cities} variants={data.variants} warehouses={data.warehouses} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <Boxes className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">رصيد المخزون</h3>
          </div>
          <div className="space-y-3">
            {data.inventory.map((row) => (
              <div className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[1.2fr_0.8fr_0.6fr_0.6fr]" key={row.id}>
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

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <GitBranch className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">أولوية المدن</h3>
          </div>
          <div className="space-y-3">
            {data.priorities.map((priority) => (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3" key={priority.id}>
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
  return <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">{text}</div>;
}
