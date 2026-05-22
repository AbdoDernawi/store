import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  Truck,
  UserRound,
} from "lucide-react";
import { InvoicePreview as PdfInvoicePreview } from "@/components/invoices/InvoicePreview";
import { MarketerOrderActions } from "@/components/marketer/MarketerOrderActions";
import {
  formatDate,
  formatMoney,
  orderStatusLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  statusTone,
} from "@/lib/admin/format";
import {
  getMarketerLocations,
  getMarketerOrderDetails,
  type MarketerOrderDetails,
} from "@/lib/marketer/data";

export default async function MarketerOrderDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [details, locations] = await Promise.all([
    getMarketerOrderDetails(params.id),
    getMarketerLocations(),
  ]);

  if (!details) {
    notFound();
  }

  const { order } = details;

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black text-emerald-700">تفاصيل الطلب</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">طلب #{order.order_number || "-"}</h2>
          </div>
          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${statusTone(order.status)}`}>
            {orderStatusLabels[order.status] || order.status}
          </span>
        </div>

        {order.status === "out_for_delivery" ? (
          <Link
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-sky-600 px-5 text-sm font-black text-white transition hover:bg-sky-700"
            href={`/marketer/orders/${order.id}/chat`}
          >
            <MessageCircle size={17} />
            محادثة المندوب
          </Link>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <InfoGrid details={details} />
          <InvoicePreview details={details} />
          <Timeline history={details.history} />
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                <Truck size={18} />
              </span>
              <h3 className="text-base font-black text-slate-950">مندوب التوصيل</h3>
            </div>
            <p className="text-sm font-black text-slate-800">
              {order.delivery_name || "لم يتم الإسناد بعد"}
            </p>
            {order.delivery_phone ? (
              <p className="mt-2 text-xs font-bold text-slate-500">{order.delivery_phone}</p>
            ) : null}
          </section>

          <MarketerOrderActions
            cities={locations.cities}
            order={order}
            zones={locations.zones}
          />
        </aside>
      </section>
    </div>
  );
}

function InfoGrid({ details }: { details: MarketerOrderDetails }) {
  const { order } = details;

  return (
    <section className="grid gap-3 sm:grid-cols-2">
      <InfoCard icon={UserRound} label="الزبون" value={order.customer_name} helper={order.customer_phone} />
      <InfoCard icon={CalendarDays} label="تاريخ الطلب" value={formatDate(order.created_at)} helper={order.customer_address} />
      <InfoCard icon={PackageCheck} label="المنطقة" value={`${order.city_name} - ${order.zone_name}`} helper={`التوصيل: ${formatMoney(order.delivery_fee)}`} />
      <InfoCard
        icon={ReceiptText}
        label="الدفع"
        value={paymentMethodLabels[order.payment_method] || order.payment_method}
        helper={paymentStatusLabels[order.payment_status] || order.payment_status}
      />
    </section>
  );
}

function InfoCard({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper?: string | null;
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <Icon size={18} />
      </div>
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-black leading-6 text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{helper}</p> : null}
    </article>
  );
}

function InvoicePreview({ details }: { details: MarketerOrderDetails }) {
  const { items, order } = details;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <ReceiptText size={18} />
        </span>
        <h3 className="text-base font-black text-slate-950">معاينة الفاتورة</h3>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-slate-50 p-3" key={item.id}>
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-black text-slate-950">{item.product_name}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {item.variant_label} × {item.quantity.toLocaleString("ar-LY")}
              </p>
            </div>
            <p className="text-sm font-black text-slate-900">{formatMoney(item.total_price)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 rounded-lg bg-[#fff8ec] p-3 ring-1 ring-amber-100">
        <AmountLine label="إجمالي المنتجات" value={formatMoney(order.subtotal)} />
        <AmountLine label="رسوم التوصيل" value={formatMoney(order.delivery_fee)} />
        {order.discount_amount > 0 ? (
          <AmountLine label="خصم" value={`-${formatMoney(order.discount_amount)}`} />
        ) : null}
        <AmountLine strong label="الإجمالي" value={formatMoney(order.total)} />
      </div>

      <div className="mt-3">
        <PdfInvoicePreview compact orderId={order.id} title={`فاتورة الطلب #${order.order_number || "-"}`} />
      </div>
    </section>
  );
}

function Timeline({ history }: { history: MarketerOrderDetails["history"] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <h3 className="text-base font-black text-slate-950">مسار الحالة</h3>
      <div className="mt-4 space-y-4 border-r border-slate-200 pr-4">
        {history.map((item) => (
          <div className="relative" key={item.id}>
            <span className="absolute -right-[23px] top-1 flex h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusTone(item.status)}`}>
                {orderStatusLabels[item.status] || item.status}
              </span>
              <span className="text-xs font-bold text-slate-400">{formatDate(item.created_at)}</span>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
              {item.note || "تم تحديث حالة الطلب."}
            </p>
            <p className="mt-1 text-xs font-black text-slate-500">
              بواسطة: {item.changed_by_name || "النظام"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AmountLine({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? "text-sm font-black text-slate-950" : "text-xs font-bold text-slate-600"}>
        {label}
      </span>
      <span className={strong ? "text-base font-black text-emerald-700" : "text-sm font-black text-slate-800"}>
        {value}
      </span>
    </div>
  );
}
