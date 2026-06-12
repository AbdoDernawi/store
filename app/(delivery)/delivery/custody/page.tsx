import Link from "next/link";
import { ArrowUpRight, Banknote, Building2, MapPin, MessageCircle, PackageCheck, Phone, ReceiptText } from "lucide-react";
import { DeliveryCustodyProductsPanel } from "@/components/delivery/DeliveryCustodyProductsPanel";
import {
  formatDate,
  formatMoney,
  orderStatusLabels,
  paymentMethodLabels,
  statusTone,
} from "@/lib/admin/format";
import { requireCurrentUser } from "@/lib/auth";
import { getDeliveryCustody, type DeliveryOrderListItem } from "@/lib/delivery/data";

export default async function DeliveryCustodyPage() {
  const user = await requireCurrentUser();
  const { items, orders } = await getDeliveryCustody(user);
  const activeOrders = orders.filter((order) => order.status === "out_for_delivery");
  const returnableItemsCount = items.filter((item) => item.returnable).length;

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-white p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
        <p className="text-xs font-black text-teal-700">عهدتي</p>
        <h2 className="mt-2 text-2xl font-black leading-9 text-slate-950">طلباتك الحالية في مكان واحد</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <MetricPill label="طلبات قيد التوصيل" value={activeOrders.length.toLocaleString("ar-LY")} />
          <MetricPill label="منتجات بالعهدة" value={items.length.toLocaleString("ar-LY")} />
          <MetricPill label="تحتاج ترجيع" value={returnableItemsCount.toLocaleString("ar-LY")} />
        </div>
      </section>

      <DeliveryCustodyProductsPanel items={items} />

      <section className="space-y-3">
        {activeOrders.length ? (
          activeOrders.map((order) => <CustodyCard key={order.id} order={order} />)
        ) : (
          <div className="rounded-[1.35rem] bg-white p-6 text-center shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <PackageCheck size={22} />
            </div>
            <p className="mt-3 text-sm font-black text-slate-600">لا توجد طلبات بعهدتك الآن.</p>
            <Link
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-teal-600 px-4 text-sm font-black text-white transition hover:bg-teal-700"
              href="/delivery/scan"
            >
              مسح شحنة جديدة
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function CustodyCard({ order }: { order: DeliveryOrderListItem }) {
  const paidTransfer = order.payment_method === "bank_transfer" && order.payment_status === "confirmed";

  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black text-slate-950">#{order.order_number || "-"}</span>
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusTone(order.status)}`}>
              {orderStatusLabels[order.status] || order.status}
            </span>
          </div>
          <p className="mt-3 text-lg font-black text-slate-900">{order.customer_name}</p>
          <a
            className="mt-1 inline-flex items-center gap-1 text-sm font-black text-teal-700"
            href={`tel:${order.customer_phone}`}
          >
            <Phone size={15} />
            {order.customer_phone}
          </a>
          <div className="mt-3 rounded-[1rem] bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="flex items-center gap-2 text-xs font-black text-slate-500">
              <Building2 size={15} />
              {order.store_name}
            </p>
            {order.store_phone ? (
              <a
                className="mt-2 inline-flex items-center gap-1 text-sm font-black text-sky-700"
                href={`tel:${order.store_phone}`}
              >
                <Phone size={15} />
                {order.store_phone}
              </a>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.1rem] bg-emerald-50 px-4 py-3 text-right ring-1 ring-emerald-100 sm:text-left">
          <p className="text-lg font-black text-emerald-700">{formatMoney(order.total)}</p>
          <p className="mt-1 text-xs font-bold text-emerald-700">
            التوصيل: {formatMoney(order.delivery_fee)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-[1.1rem] bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-600">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 shrink-0 text-slate-400" size={16} />
          <span>
            {order.city_name} · {order.zone_name} · {order.customer_address}
          </span>
        </p>
        <p className="flex items-center gap-2">
          <ReceiptText className="shrink-0 text-slate-400" size={16} />
          <span>{formatDate(order.created_at)}</span>
        </p>
      </div>

      <div
        className={`mt-3 rounded-full px-4 py-2 text-center text-xs font-black ring-1 ${
          paidTransfer
            ? "bg-sky-50 text-sky-700 ring-sky-100"
            : "bg-amber-50 text-amber-700 ring-amber-100"
        }`}
      >
        {paidTransfer ? "✅ مدفوع بتحويل — لا تطلب مالاً" : paymentMethodLabels[order.payment_method] || "كاش"}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link
          className="inline-flex h-11 items-center justify-center gap-1 rounded-full bg-slate-50 px-3 text-xs font-black text-slate-700 ring-1 ring-slate-100 transition hover:bg-teal-50 hover:text-teal-700"
          href={`/delivery/orders/${order.id}`}
        >
          تفاصيل
          <ArrowUpRight size={14} />
        </Link>
        <Link
          className="inline-flex h-11 items-center justify-center gap-1 rounded-full bg-sky-50 px-3 text-xs font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
          href={`/delivery/orders/${order.id}/chat`}
        >
          شات
          <MessageCircle size={14} />
        </Link>
        <Link
          className="inline-flex h-11 items-center justify-center gap-1 rounded-full bg-teal-600 px-3 text-xs font-black text-white transition hover:bg-teal-700"
          href={`/delivery/orders/${order.id}#delivery-actions`}
        >
          تغيير الحالة
          <Banknote size={14} />
        </Link>
      </div>
    </article>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full bg-slate-50 px-4 py-2 ring-1 ring-slate-100">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <span className="ms-2 text-sm font-black text-slate-950">{value}</span>
    </div>
  );
}
