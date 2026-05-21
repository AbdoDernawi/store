import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Banknote, History, MapPin, PackageCheck, Phone } from "lucide-react";
import { CustomerOrderActions } from "@/components/customer/CustomerOrderActions";
import {
  formatDate,
  formatMoney,
  orderStatusLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  statusTone,
} from "@/lib/admin/format";
import {
  getCustomerLocationsAndAddresses,
  getCustomerOrderDetails,
} from "@/lib/customer/data";

export default async function CustomerOrderDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [details, locations] = await Promise.all([
    getCustomerOrderDetails(params.id),
    getCustomerLocationsAndAddresses(),
  ]);

  if (!details) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-emerald-50 hover:text-emerald-700"
        href="/customer/orders"
      >
        <ArrowRight size={15} />
        طلباتي
      </Link>

      <section className="rounded-[1.5rem] bg-white p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-black text-slate-950">#{details.order.order_number || "-"}</span>
              <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusTone(details.order.status)}`}>
                {orderStatusLabels[details.order.status] || details.order.status}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-950">{details.order.customer_name}</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">{formatDate(details.order.created_at)}</p>
          </div>

          <div className="rounded-[1.1rem] bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
            <p className="text-2xl font-black text-emerald-700">{formatMoney(details.order.total)}</p>
            <p className="mt-1 text-xs font-bold text-emerald-700">
              التوصيل: {formatMoney(details.order.delivery_fee)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoLine
            icon={MapPin}
            label="العنوان"
            value={`${details.order.city_name || "-"} · ${details.order.zone_name || "-"} · ${details.order.customer_address}`}
          />
          <InfoLine
            icon={Banknote}
            label="الدفع"
            value={`${paymentMethodLabels[details.order.payment_method] || details.order.payment_method} · ${paymentStatusLabels[details.order.payment_status] || details.order.payment_status}`}
          />
        </div>

        {details.order.status === "out_for_delivery" && details.order.delivery_phone ? (
          <a
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-teal-600 px-5 text-sm font-black text-white transition hover:bg-teal-700"
            href={`tel:${details.order.delivery_phone}`}
          >
            <Phone size={17} />
            {details.order.delivery_name || "مندوب التوصيل"} · {details.order.delivery_phone}
          </a>
        ) : null}
      </section>

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <PackageCheck size={18} />
          </span>
          <h3 className="text-base font-black text-slate-950">المنتجات</h3>
        </div>
        <div className="space-y-3">
          {details.items.map((item) => (
            <div className="rounded-[1rem] bg-slate-50 p-3 ring-1 ring-slate-100" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900">{item.product_name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.variant_label}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-100">
                  × {item.quantity.toLocaleString("ar-LY")}
                </span>
              </div>
              <p className="mt-2 text-sm font-black text-emerald-700">{formatMoney(item.total_price)}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <CustomerOrderActions cities={locations.cities} order={details.order} zones={locations.zones} />

        <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600">
              <History size={18} />
            </span>
            <h3 className="text-base font-black text-slate-950">تسلسل الحالة</h3>
          </div>
          <div className="space-y-3">
            {details.history.map((history) => (
              <div className="rounded-[1rem] bg-slate-50 p-3 ring-1 ring-slate-100" key={history.id}>
                <p className="text-sm font-black text-slate-800">
                  {orderStatusLabels[history.status] || history.status}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(history.created_at)}</p>
                {history.note ? <p className="mt-2 text-xs font-bold text-slate-500">{history.note}</p> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.1rem] bg-slate-50 p-3 ring-1 ring-slate-100">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 shrink-0 text-slate-400" size={16} />
        <div>
          <p className="text-xs font-black text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}
