import Link from "next/link";
import { Bell, LogOut, PackageCheck, ShieldCheck, Truck, UserRound } from "lucide-react";
import { formatMoney } from "@/lib/admin/format";
import { requireCurrentUser, signOut } from "@/lib/auth";
import { getDeliveryDashboardData, getDeliveryReportData } from "@/lib/delivery/data";

export default async function DeliveryAccountPage() {
  const user = await requireCurrentUser();
  const [dashboard, report] = await Promise.all([
    getDeliveryDashboardData(),
    getDeliveryReportData(user),
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-white p-5 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
        <div className="flex items-start gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
            <UserRound size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-teal-700">حسابي</p>
            <h2 className="mt-1 truncate text-2xl font-black text-slate-950">{user.fullName}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{user.phone}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <AccountMetric
          icon={PackageCheck}
          label="طلبات بعهدتي"
          tone="bg-teal-50 text-teal-700 ring-teal-100"
          value={dashboard.custodyCount.toLocaleString("ar-LY")}
        />
        <AccountMetric
          icon={Truck}
          label="سلّمت اليوم"
          tone="bg-emerald-50 text-emerald-700 ring-emerald-100"
          value={dashboard.deliveredToday.toLocaleString("ar-LY")}
        />
        <AccountMetric
          icon={ShieldCheck}
          label="طلبات منتهية"
          tone="bg-sky-50 text-sky-700 ring-sky-100"
          value={report.totalFinishedOrders.toLocaleString("ar-LY")}
        />
        <AccountMetric
          icon={Bell}
          label="تنبيهات جديدة"
          tone="bg-amber-50 text-amber-700 ring-amber-100"
          value={dashboard.unreadNotifications.toLocaleString("ar-LY")}
        />
      </section>

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <h3 className="text-base font-black text-slate-950">اختصارات مفيدة</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <QuickLink href="/delivery/custody" label="فتح عهدتي" />
          <QuickLink href="/delivery/handover" label={`تسليم كاش أو مرتجعات · ${formatMoney(dashboard.cashWithMe)}`} />
          <QuickLink href="/delivery/report" label="مراجعة تقريري" />
          <QuickLink href="/delivery/notifications" label="الإشعارات" />
        </div>
      </section>

      <form action={signOut}>
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-rose-50 px-5 text-sm font-black text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100"
          type="submit"
        >
          <LogOut size={17} />
          تسجيل الخروج
        </button>
      </form>
    </div>
  );
}

function AccountMetric({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: typeof PackageCheck;
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ring-1 ${tone}`}>
        <Icon size={20} />
      </div>
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </article>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-50 px-4 text-center text-sm font-black leading-6 text-slate-700 ring-1 ring-slate-100 transition hover:bg-teal-50 hover:text-teal-700"
      href={href}
    >
      {label}
    </Link>
  );
}
