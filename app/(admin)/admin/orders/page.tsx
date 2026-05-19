import Link from "next/link";
import {
  Filter,
  PackageSearch,
  Phone,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminOrders, type OrdersFilters } from "@/lib/admin/data";
import {
  formatDate,
  formatMoney,
  orderStatusLabels,
  orderTypeLabels,
  paymentMethodLabels,
  paymentStatusLabels,
} from "@/lib/admin/format";

type OrdersPageProps = {
  searchParams?: OrdersFilters;
};

const statusOptions = [
  ["pending_approval", "بانتظار الاعتماد"],
  ["approved", "معتمد"],
  ["preparing", "قيد التجهيز"],
  ["ready", "جاهز"],
  ["out_for_delivery", "قيد التوصيل"],
  ["delivered", "تم التسليم"],
  ["partial_return", "راجع جزئي"],
  ["full_return", "راجع كامل"],
  ["cancelled", "ملغي"],
  ["rejected", "مرفوض"],
];

export default async function AdminOrdersPage({ searchParams = {} }: OrdersPageProps) {
  const { orders, cities, zones } = await getAdminOrders(searchParams);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
              <PackageSearch size={19} />
              الطلبيات
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">كل طلب في مكانه الواضح</h2>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
              تابع الطلبات المفتوحة والتحويلات والتوصيل من مكان واحد.
            </p>
          </div>

          <Link
            className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm shadow-emerald-950/10 transition hover:bg-emerald-700"
            href="/admin/dashboard"
          >
            <SlidersHorizontal size={18} />
            الداشبورد
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.85fr_0.85fr_0.95fr_0.85fr_0.85fr_auto]" method="get">
          <label className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 pr-11 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              defaultValue={searchParams.q || ""}
              name="q"
              placeholder="اسم أو رقم هاتف"
            />
          </label>

          <select
            className="h-12 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            defaultValue={searchParams.status || ""}
            name="status"
          >
            <option value="">كل الحالات</option>
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            className="h-12 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            defaultValue={searchParams.city || ""}
            name="city"
          >
            <option value="">كل المدن</option>
            {Array.from(cities.entries()).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          <input
            className="h-12 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            defaultValue={searchParams.marketer || ""}
            name="marketer"
            placeholder="معرّف المسوق"
          />

          <input
            className="h-12 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            defaultValue={searchParams.from || ""}
            name="from"
            type="date"
          />

          <input
            className="h-12 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            defaultValue={searchParams.to || ""}
            name="to"
            type="date"
          />

          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
            type="submit"
          >
            <Filter size={17} />
            تصفية
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
        <div className="hidden grid-cols-[0.8fr_1.2fr_1fr_1fr_1fr_0.7fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-black text-slate-500 lg:grid">
          <span>الطلب</span>
          <span>الزبون</span>
          <span>الموقع</span>
          <span>الدفع</span>
          <span>الحالة</span>
          <span>الإجمالي</span>
        </div>

        <div className="divide-y divide-slate-100">
          {orders.length ? (
            orders.map((order) => (
              <Link
                className="grid gap-4 px-5 py-5 transition hover:bg-emerald-50/45 lg:grid-cols-[0.8fr_1.2fr_1fr_1fr_1fr_0.7fr] lg:items-center"
                href={`/admin/orders/${order.id}`}
                key={order.id}
              >
                <div>
                  <p className="text-sm font-black text-slate-950">
                    #{order.order_number || "-"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {orderTypeLabels[order.type] || order.type}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-black text-slate-900">{order.customer_name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500">
                    <Phone size={13} />
                    {order.customer_phone}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-700">
                    {cities.get(order.city_id) || "مدينة"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {zones.get(order.zone_id) || formatDate(order.created_at)}
                  </p>
                </div>

                <div className="space-y-2">
                  <StatusBadge status={order.payment_status}>
                    {paymentStatusLabels[order.payment_status] || order.payment_status}
                  </StatusBadge>
                  <p className="text-xs font-bold text-slate-500">
                    {paymentMethodLabels[order.payment_method] || order.payment_method}
                  </p>
                </div>

                <StatusBadge status={order.status}>
                  {orderStatusLabels[order.status] || order.status}
                </StatusBadge>

                <div>
                  <p className="text-sm font-black text-slate-950">{formatMoney(order.total)}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    توصيل {formatMoney(order.delivery_fee)}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <PackageSearch size={28} />
              </div>
              <p className="mt-4 text-lg font-black text-slate-950">لا توجد طلبات مطابقة</p>
              <p className="mt-2 text-sm font-bold text-slate-500">
                جرّب تخفيف الفلاتر أو العودة لكل الحالات.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
