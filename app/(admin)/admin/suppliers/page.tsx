import { ReceiptText, Truck } from "lucide-react";
import { SupplierTools } from "@/components/admin/AdminManagementForms";
import { getAdminSuppliers } from "@/lib/admin/management";
import { formatDate, formatMoney } from "@/lib/admin/format";

export default async function AdminSuppliersPage() {
  const data = await getAdminSuppliers();

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
          <Truck size={19} />
          الموردين
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">المشتريات والديون</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
          سجّل الموردين والشراء والدفعات المرتبطة بالمخزون.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <SupplierTools suppliers={data.suppliers} variants={data.variants} warehouses={data.warehouses} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <h3 className="mb-4 text-sm font-black text-slate-950">قائمة الموردين</h3>
          <div className="space-y-3">
            {data.suppliers.map((supplier) => (
              <div className="rounded-lg bg-slate-50 p-4" key={supplier.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">{supplier.name}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{supplier.phone || "بدون رقم"}</p>
                  </div>
                  <p className="text-sm font-black text-rose-700">{formatMoney(supplier.total_debt)}</p>
                </div>
                {supplier.notes ? <p className="mt-2 text-xs font-bold text-slate-500">{supplier.notes}</p> : null}
              </div>
            ))}
            {!data.suppliers.length ? <EmptyText text="لا يوجد موردون بعد." /> : null}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">آخر المشتريات</h3>
          </div>
          <div className="space-y-3">
            {data.purchaseOrders.map((order) => (
              <div className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-[1fr_0.8fr_0.8fr]" key={order.id}>
                <div>
                  <p className="text-sm font-black text-slate-900">{order.suppliers?.name || "مورد"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(order.created_at)}</p>
                </div>
                <p className="text-sm font-black text-slate-700">{order.warehouses?.name || "مخزن"}</p>
                <div>
                  <p className="text-sm font-black text-emerald-700">{formatMoney(order.total_amount)}</p>
                  <p className="mt-1 text-xs font-bold text-rose-600">دين {formatMoney(order.debt_amount)}</p>
                </div>
              </div>
            ))}
            {!data.purchaseOrders.length ? <EmptyText text="لا توجد مشتريات مسجلة." /> : null}
          </div>
        </article>
      </section>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">{text}</div>;
}
