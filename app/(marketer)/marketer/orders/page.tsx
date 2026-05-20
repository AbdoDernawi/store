import Link from "next/link";
import { ArrowUpRight, MapPin, PackageCheck, Search, ShoppingBag } from "lucide-react";
import {
  formatDate,
  formatMoney,
  orderStatusLabels,
  paymentMethodLabels,
  statusTone,
} from "@/lib/admin/format";
import { requireCurrentUser } from "@/lib/auth";
import { getMarketerOrders, type MarketerOrderListItem } from "@/lib/marketer/data";

const filters = [
  { label: "الكل", value: "all" },
  { label: "بانتظار الاعتماد", value: "pending_approval" },
  { label: "معتمد", value: "approved" },
  { label: "قيد التجهيز", value: "preparing" },
  { label: "جاهز", value: "ready" },
  { label: "قيد التوصيل", value: "out_for_delivery" },
  { label: "تم التسليم", value: "delivered" },
];

export default async function MarketerOrdersPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const user = await requireCurrentUser();
  const activeStatus = searchParams?.status || "all";
  const { orders } = await getMarketerOrders(user, activeStatus);

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
        <p className="text-xs font-black text-emerald-700">طلباتك</p>
        <h2 className="mt-2 text-2xl font-black leading-9 text-slate-950">متابعة الطلبات بسلاسة</h2>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
          <Search size={17} />
          تصفية سريعة
        </div>
        <div className="flex flex-wrap gap-2 pb-1 sm:flex-nowrap sm:overflow-x-auto">
          {filters.map((filter) => (
            <Link
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ring-1 transition ${
                activeStatus === filter.value
                  ? "bg-emerald-600 text-white ring-emerald-600"
                  : "bg-slate-50 text-slate-600 ring-slate-100 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
              href={filter.value === "all" ? "/marketer/orders" : `/marketer/orders?status=${filter.value}`}
              key={filter.value}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {orders.length ? (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        ) : (
          <div className="rounded-lg bg-white p-6 text-center shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <ShoppingBag size={22} />
            </div>
            <p className="mt-3 text-sm font-black text-slate-600">لا توجد طلبات ضمن هذا الفلتر.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function OrderCard({ order }: { order: MarketerOrderListItem }) {
  return (
    <Link
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-950/10"
      href={`/marketer/orders/${order.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black text-slate-950">#{order.order_number || "-"}</span>
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusTone(order.status)}`}>
              {orderStatusLabels[order.status] || order.status}
            </span>
            {order.cancellation_requested_by ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-100">
                طلب إلغاء
              </span>
            ) : null}
          </div>
          <p className="mt-2 truncate text-sm font-black text-slate-800">{order.customer_name}</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500">
            <MapPin size={14} />
            {order.city_name} - {order.zone_name}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:block sm:text-left">
          <div>
            <p className="text-base font-black text-emerald-700">{formatMoney(order.total)}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {paymentMethodLabels[order.payment_method] || order.payment_method}
            </p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-100">
            <ArrowUpRight size={17} />
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
        <span className="inline-flex items-center gap-1">
          <PackageCheck size={14} />
          {formatDate(order.created_at)}
        </span>
        <span>هاتف: {order.customer_phone}</span>
      </div>
    </Link>
  );
}
