import Link from "next/link";
import { ArrowUpRight, Bell, Banknote, CheckCircle2, PackageCheck, RotateCcw, ScanLine, Truck } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/admin/format";
import { requireCurrentUser } from "@/lib/auth";
import { getDeliveryDashboardData, type DeliveryPackageSummary } from "@/lib/delivery/data";

export default async function DeliveryDashboardPage() {
  await requireCurrentUser();
  const data = await getDeliveryDashboardData();

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-[#edf8f1] p-5 text-slate-950 ring-1 ring-emerald-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black text-teal-700">رحلة خفيفة ومنظمة</p>
            <h2 className="mt-2 text-2xl font-black leading-9 sm:text-3xl">
              استلم الشحنة، سلّم الطلب، وسجّل عهدتك بهدوء
            </h2>
          </div>
          <Link
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-teal-600 px-6 text-sm font-black text-white shadow-sm shadow-teal-950/10 transition hover:bg-teal-700"
            href="/delivery/scan"
          >
            <ScanLine size={19} />
            مسح QR
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          accent="bg-teal-50 text-teal-700 ring-teal-100"
          icon={PackageCheck}
          label="بعهدتي"
          value={data.custodyCount.toLocaleString("ar-LY")}
        />
        <MetricCard
          accent="bg-emerald-50 text-emerald-700 ring-emerald-100"
          icon={Banknote}
          label="الكاش معي"
          value={formatMoney(data.cashWithMe)}
        />
        <MetricCard
          accent="bg-amber-50 text-amber-700 ring-amber-100"
          icon={RotateCcw}
          label="راجعة"
          value={data.returnsCount.toLocaleString("ar-LY")}
        />
        <MetricCard
          accent="bg-sky-50 text-sky-700 ring-sky-100"
          icon={CheckCircle2}
          label="سلّمت اليوم"
          value={data.deliveredToday.toLocaleString("ar-LY")}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
        <article className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                <Truck size={18} />
              </span>
              <h3 className="text-base font-black text-slate-950">شحنات متاحة</h3>
            </div>
            <Link
              className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100 transition hover:bg-teal-50 hover:text-teal-700"
              href="/delivery/custody"
            >
              عهدتي
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {data.availablePackages.length ? (
              data.availablePackages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)
            ) : (
              <div className="rounded-[1.1rem] bg-slate-50 p-5 text-center text-sm font-bold leading-6 text-slate-500">
                لا توجد شحنات جاهزة الآن. عندما يجهز المخزن شحنة ستظهر هنا فوراً.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-700">
              <Bell size={18} />
            </span>
            <h3 className="text-base font-black text-slate-950">لمحة لطيفة</h3>
          </div>

          <div className="space-y-3">
            <SoftLine label="الخطوة التالية" value="ابدأ بمسح QR للشحنة التي ستستلمها من المخزن." />
            <SoftLine label="إشعارات جديدة" value={`${data.unreadNotifications.toLocaleString("ar-LY")} تنبيه يحتاج انتباهك.`} />
            <SoftLine label="العهدة" value="بعد انتهاء التوصيل أنشئ عهدة كاش أو مرتجعات ليؤكدها المدير." />
          </div>
        </article>
      </section>
    </div>
  );
}

function MetricCard({
  accent,
  icon: Icon,
  label,
  value,
}: {
  accent: string;
  icon: typeof PackageCheck;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ring-1 ${accent}`}>
        <Icon size={20} />
      </div>
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </article>
  );
}

function PackageCard({ pkg }: { pkg: DeliveryPackageSummary }) {
  return (
    <Link
      className="block rounded-[1.1rem] bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:bg-teal-50 hover:ring-teal-100"
      href={`/delivery/scan?code=${encodeURIComponent(pkg.qr_code_hash)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">شحنة #{pkg.package_number || "-"}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {pkg.order_count.toLocaleString("ar-LY")} طلب · {pkg.cities.join("، ") || "كل المدن"}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-teal-700 ring-1 ring-teal-100">
          {formatMoney(pkg.cash_total)}
        </span>
      </div>
      <p className="mt-3 text-xs font-bold text-slate-400">{formatDate(pkg.created_at)}</p>
    </Link>
  );
}

function SoftLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-800">{value}</p>
    </div>
  );
}
