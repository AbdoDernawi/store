import Link from "next/link";
import { ArrowUpRight, MapPin, Phone, ShoppingBag, Truck } from "lucide-react";
import {
  formatDate,
  formatMoney,
  orderStatusLabels,
  paymentMethodLabels,
  statusTone,
} from "@/lib/admin/format";
import { getCustomerOrders, type CustomerOrderListItem } from "@/lib/customer/data";

export default async function CustomerOrdersPage() {
  const { orders } = await getCustomerOrders();

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-white p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
        <p className="text-xs font-black text-emerald-700">طلباتي</p>
        <h2 className="mt-2 text-2xl font-black leading-9 text-slate-950">كل طلب في مساره الواضح</h2>
      </section>

      <section className="space-y-3">
        {orders.length ? (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        ) : (
          <div className="rounded-[1.35rem] bg-white p-6 text-center shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <ShoppingBag size={22} />
            </div>
            <p className="mt-3 text-sm font-black text-slate-600">لا توجد طلبات حتى الآن.</p>
            <Link className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700" href="/customer/products">
              تصفح المنتجات
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function OrderCard({ order }: { order: CustomerOrderListItem }) {
  return (
    <Link
      className="block rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-950/10"
      href={`/customer/orders/${order.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black text-slate-950">#{order.order_number || "-"}</span>
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusTone(order.status)}`}>
              {orderStatusLabels[order.status] || order.status}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-500">
            <MapPin size={14} />
            {order.city_name || "-"} · {order.zone_name || "-"}
          </p>
          {order.status === "out_for_delivery" && order.delivery_phone ? (
            <p className="mt-2 inline-flex items-center gap-1 text-sm font-black text-teal-700">
              <Phone size={14} />
              {order.delivery_name || "مندوب التوصيل"} · {order.delivery_phone}
            </p>
          ) : null}
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
          <Truck size={14} />
          {formatDate(order.created_at)}
        </span>
        <span>{order.items_count.toLocaleString("ar-LY")} منتجات</span>
      </div>
    </Link>
  );
}
