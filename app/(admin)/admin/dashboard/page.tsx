import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  CreditCard,
  PackageOpen,
  ReceiptText,
  Sparkles,
  Truck,
  WalletCards,
} from "lucide-react";
import { SalesLineChart } from "@/components/admin/SalesLineChart";
import { getDashboardStats } from "@/lib/admin/data";
import { formatMoney, formatNumber } from "@/lib/admin/format";

type DashboardPageProps = {
  searchParams?: {
    period?: string;
  };
};

const periodLinks = [
  { value: "day", label: "اليوم" },
  { value: "week", label: "الأسبوع" },
  { value: "month", label: "الشهر" },
];

export default async function AdminDashboardPage({ searchParams }: DashboardPageProps) {
  const stats = await getDashboardStats(searchParams?.period);
  const urgentCards = [
    {
      label: "اعتمادات بانتظارك",
      value: stats.urgent.pendingApprovals,
      href: "/admin/orders?status=pending_approval",
      icon: Clock3,
      tone: "bg-amber-50 text-amber-700 ring-amber-100",
    },
    {
      label: "تحويلات تحتاج تأكيد",
      value: stats.urgent.bankTransfers,
      href: "/admin/orders?payment=bank_transfer",
      icon: CreditCard,
      tone: "bg-sky-50 text-sky-700 ring-sky-100",
    },
    {
      label: "طلبات إلغاء",
      value: stats.urgent.cancellationRequests,
      href: "/admin/orders",
      icon: AlertCircle,
      tone: "bg-rose-50 text-rose-700 ring-rose-100",
    },
    {
      label: "ديون قريبة",
      value: stats.urgent.supplierDebtsDue,
      href: "/admin/suppliers",
      icon: ReceiptText,
      tone: "bg-orange-50 text-orange-700 ring-orange-100",
    },
  ];
  const financeCards = [
    { label: "خزنة الكاش", value: formatMoney(stats.finance.cashBalance), icon: WalletCards },
    { label: "التحويلات", value: formatMoney(stats.finance.bankBalance), icon: Banknote },
    { label: "مبيعات الفترة", value: formatMoney(stats.finance.sales), icon: Coins },
    { label: "صافي الربح", value: formatMoney(stats.finance.netProfit), icon: Sparkles },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-500 p-5 text-white shadow-sm shadow-emerald-950/10 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-emerald-50">
              <CheckCircle2 size={18} />
              نبض المتجر الآن
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
              تابع الطلبات، المال، والتسليمات من مكان واحد.
            </h2>
          </div>

          <div className="flex w-fit rounded-full bg-white/18 p-1 ring-1 ring-white/25 backdrop-blur">
            {periodLinks.map((link) => (
              <Link
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  stats.period === link.value
                    ? "bg-white text-emerald-700"
                    : "text-white/90 hover:bg-white/15"
                }`}
                href={`/admin/dashboard?period=${link.value}`}
                key={link.value}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {urgentCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-950/5"
              href={card.href}
              key={card.label}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full p-2 ring-1 ${card.tone}`}>
                  <Icon size={19} />
                </span>
                <span className="text-3xl font-black text-slate-950">
                  {formatNumber(card.value)}
                </span>
              </div>
              <p className="mt-4 text-sm font-black text-slate-700">{card.label}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {financeCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5"
              key={card.label}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100">
                  <Icon size={20} />
                </span>
                <CalendarDays className="text-slate-300" size={18} />
              </div>
              <p className="mt-5 text-sm font-bold text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{card.value}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_0.9fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">حركة المبيعات</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{stats.periodLabel}</p>
            </div>
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-100">
              {formatNumber(stats.finance.ordersCount)} طلب
            </span>
          </div>
          <SalesLineChart data={stats.chart} />
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <Truck className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">عهد مندوبي التوصيل</h3>
          </div>
          <div className="space-y-3">
            {stats.deliveryCustody.length ? (
              stats.deliveryCustody.map((handover) => (
                <div
                  className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                  key={handover.id}
                >
                  <div>
                    <p className="text-sm font-black text-slate-800">{handover.deliveryName}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {formatNumber(handover.ordersCount)} طلب
                    </p>
                  </div>
                  <p className="text-sm font-black text-emerald-700">
                    {formatMoney(handover.amount)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">
                لا توجد عهد معلقة الآن.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">أفضل المسوقين</h3>
          </div>
          <div className="space-y-3">
            {stats.topMarketers.length ? (
              stats.topMarketers.map((marketer, index) => (
                <div className="flex items-center gap-3" key={marketer.id}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-800">{marketer.name}</p>
                    <p className="text-xs font-bold text-slate-500">
                      {formatNumber(marketer.orders)} طلب
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-950">
                    {formatMoney(marketer.sales)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">
                ستظهر النتائج بعد أول مبيعات للمسوقين.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <PackageOpen className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">تفصيل صافي الربح</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SoftMetric label="المبيعات" value={formatMoney(stats.finance.sales)} />
            <SoftMetric label="تكلفة البضاعة" value={formatMoney(stats.finance.costOfGoods)} />
            <SoftMetric label="العمولات" value={formatMoney(stats.finance.commissions)} />
            <SoftMetric label="المصاريف" value={formatMoney(stats.finance.expenses)} />
          </div>
        </article>
      </section>
    </div>
  );
}

function SoftMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
