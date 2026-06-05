import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  PackageSearch,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { formatDate, formatMoney, orderStatusLabels, statusTone } from "@/lib/admin/format";
import { requireCurrentUser } from "@/lib/auth";
import { getMarketerDashboardData } from "@/lib/marketer/data";

export default async function MarketerDashboardPage() {
  const user = await requireCurrentUser();
  const data = await getMarketerDashboardData(user);

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-[#edf7ef] p-5 text-slate-950 ring-1 ring-emerald-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black text-emerald-700">يوم جديد، طلبات أسهل</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">تابع مبيعاتك بخفة ووضوح</h2>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-black text-white shadow-sm shadow-emerald-950/10 transition hover:bg-emerald-700"
            href="/marketer/products"
          >
            <PackageSearch size={18} />
            تصفح المنتجات
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          accent="bg-emerald-50 text-emerald-700 ring-emerald-100"
          icon={Wallet}
          id="wallet"
          label="رصيد المحفظة"
          value="محمية"
        />
        <MetricCard
          accent="bg-amber-50 text-amber-700 ring-amber-100"
          icon={Clock3}
          label="طلبات قيد العمل"
          value={data.pendingOrders.toLocaleString("ar-LY")}
        />
        <MetricCard
          accent="bg-sky-50 text-sky-700 ring-sky-100"
          icon={CheckCircle2}
          label="طلبات تم تسليمها"
          value={data.deliveredOrders.toLocaleString("ar-LY")}
        />
        <MetricCard
          accent="bg-rose-50 text-rose-700 ring-rose-100"
          icon={Bell}
          label="إشعارات جديدة"
          value={data.unreadNotifications.toLocaleString("ar-LY")}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
        <article
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5"
          id="orders"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <ShoppingBag size={18} />
              </span>
              <h3 className="text-base font-black text-slate-950">آخر الطلبات</h3>
            </div>
            <Link
              className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100 transition hover:bg-emerald-50 hover:text-emerald-700"
              href="/marketer/products"
            >
              طلب جديد
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {data.lastOrders.length ? (
              data.lastOrders.map((order) => (
                <div
                  className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto]"
                  key={order.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-slate-950">
                        #{order.order_number || "-"}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusTone(order.status)}`}>
                        {orderStatusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm font-bold text-slate-600">
                      {order.customer_name}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-950">{formatMoney(order.total)}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      التوصيل: {formatMoney(order.delivery_fee)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">
                لا توجد طلبات بعد. ابدأ من صفحة المنتجات.
              </div>
            )}
          </div>
        </article>

        <article
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5"
          id="account"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-700">
              <Bell size={18} />
            </span>
            <h3 className="text-base font-black text-slate-950">لمحة سريعة</h3>
          </div>

          <div className="space-y-3">
            <SoftLine label="أفضل خطوة الآن" value="راجع المنتجات المتاحة وأنشئ طلباً جديداً." />
            <SoftLine label="حالة المحفظة" value="الرصيد مخفي ويظهر فقط بعد إدخال كلمة المرور." />
            <SoftLine label="طلبات نشطة" value={`${data.pendingOrders.toLocaleString("ar-LY")} طلب بانتظار اكتمال رحلته.`} />
          </div>
        </article>
      </section>
    </div>
  );
}

function MetricCard({
  accent,
  icon: Icon,
  id,
  label,
  value,
}: {
  accent: string;
  icon: typeof Wallet;
  id?: string;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5" id={id}>
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ring-1 ${accent}`}>
        <Icon size={20} />
      </div>
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </article>
  );
}

function SoftLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-800">{value}</p>
    </div>
  );
}
