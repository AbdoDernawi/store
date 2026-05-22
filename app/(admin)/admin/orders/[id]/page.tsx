import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Boxes,
  CalendarClock,
  Hash,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  User,
  type LucideIcon,
} from "lucide-react";
import { OrderActionsPanel } from "@/components/admin/OrderActionsPanel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminOrderDetails } from "@/lib/admin/data";
import {
  formatDate,
  formatMoney,
  orderStatusLabels,
  orderTypeLabels,
  paymentMethodLabels,
  paymentStatusLabels,
} from "@/lib/admin/format";

type OrderDetailsPageProps = {
  params: {
    id: string;
  };
};

export default async function AdminOrderDetailsPage({ params }: OrderDetailsPageProps) {
  const order = await getAdminOrderDetails(params.id);

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <Link
          className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100 transition hover:bg-emerald-50 hover:text-emerald-700"
          href="/admin/orders"
        >
          <ArrowRight size={15} />
          عودة للطلبات
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status}>
                {orderStatusLabels[order.status] || order.status}
              </StatusBadge>
              <StatusBadge status={order.payment_status}>
                {paymentStatusLabels[order.payment_status] || order.payment_status}
              </StatusBadge>
            </div>
            <h2 className="mt-3 text-3xl font-black text-slate-950">
              طلب #{order.order_number || "-"}
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              {orderTypeLabels[order.type] || order.type} · {formatDate(order.created_at)}
            </p>
          </div>

          <div className="rounded-lg bg-emerald-50 px-5 py-4 text-emerald-800 ring-1 ring-emerald-100">
            <p className="text-xs font-black">إجمالي الطلب</p>
            <p className="mt-1 text-2xl font-black">{formatMoney(order.total)}</p>
            <p className="mt-1 text-xs font-bold">التوصيل منفصل: {formatMoney(order.delivery_fee)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-5 flex items-center gap-2">
            <User className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">بيانات الزبون</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoLine icon={User} label="الاسم" value={order.customer_name} />
            <InfoLine icon={Phone} label="الهاتف" value={order.customer_phone} />
            <InfoLine icon={MapPin} label="العنوان" value={order.customer_address} />
            <InfoLine icon={Banknote} label="الدفع" value={paymentMethodLabels[order.payment_method] || order.payment_method} />
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-5 flex items-center gap-2">
            <ReceiptText className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">ملخص المال</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SoftAmount label="المجموع" value={formatMoney(order.subtotal)} />
            <SoftAmount label="الخصم" value={formatMoney(order.discount_amount)} />
            <SoftAmount label="الإجمالي" value={formatMoney(order.total)} />
            <SoftAmount label="التوصيل" value={formatMoney(order.delivery_fee)} />
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-5 flex items-center gap-2">
            <Package className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">المنتجات والمخازن</h3>
          </div>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[1.4fr_0.8fr_0.8fr]"
                key={item.id}
              >
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {item.products?.name_ar || "منتج"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {[item.product_variants?.color, item.product_variants?.size, item.product_variants?.type]
                      .filter(Boolean)
                      .join(" · ") || "بدون متغيرات"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">المخزن</p>
                  <p className="mt-1 text-sm font-black text-slate-800">
                    {item.warehouses?.name || "لم يحجز بعد"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">الكمية والإجمالي</p>
                  <p className="mt-1 text-sm font-black text-slate-800">
                    {item.quantity} × {formatMoney(item.unit_price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <OrderActionsPanel
          chatId={order.chatId}
          orderId={order.id}
          paymentMethod={order.payment_method}
          paymentStatus={order.payment_status}
          status={order.status}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-5 flex items-center gap-2">
            <Boxes className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">حزمة QR</h3>
          </div>
          {order.package ? (
            <div className="space-y-3">
              <InfoLine icon={Hash} label="رقم الحزمة" value={`#${order.package.package_number || "-"}`} />
              <InfoLine icon={CalendarClock} label="وقت الإسناد" value={formatDate(order.package.assigned_at)} />
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500">رمز QR</p>
                <p className="mt-2 break-all text-xs font-bold text-slate-700">
                  {order.package.qr_code_hash}
                </p>
              </div>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
                href={`/admin/packages/${order.package.id}/print`}
              >
                طباعة الفاتورة وQR
              </Link>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">
              لم يتم إنشاء حزمة QR لهذا الطلب بعد.
            </div>
          )}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-5 flex items-center gap-2">
            <CalendarClock className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">خط الحالة</h3>
          </div>
          <div className="space-y-4">
            {order.history.length ? (
              order.history.map((item) => (
                <div className="flex gap-3" key={item.id}>
                  <span className="mt-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {orderStatusLabels[item.status] || item.status}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {formatDate(item.created_at)}
                    </p>
                    {item.note ? (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                        {item.note}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">
                لا توجد تحديثات حالة بعد.
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-500">
        <Icon className="text-slate-400" size={15} />
        {label}
      </div>
      <p className="text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function SoftAmount({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
