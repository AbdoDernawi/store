import Link from "next/link";
import { BarChart3, CheckCircle2, PackageCheck, RotateCcw, Truck } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth";
import { getDeliveryReportData } from "@/lib/delivery/data";

export default async function DeliveryReportPage() {
  const user = await requireCurrentUser();
  const report = await getDeliveryReportData(user);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-[#eef8f5] p-5 ring-1 ring-teal-100">
        <p className="text-xs font-black text-teal-700">تقريري</p>
        <h2 className="mt-2 text-2xl font-black leading-9 text-slate-950">أرقام بسيطة عن إنجازك</h2>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <ReportCard
          icon={Truck}
          label="كل الطلبات المنتهية"
          tone="bg-teal-50 text-teal-700 ring-teal-100"
          value={report.totalFinishedOrders}
        />
        <ReportCard
          icon={PackageCheck}
          label="منتجات سلّمتها"
          tone="bg-emerald-50 text-emerald-700 ring-emerald-100"
          value={report.productsDelivered}
        />
        <ReportCard
          icon={CheckCircle2}
          label="تسليم كامل"
          tone="bg-sky-50 text-sky-700 ring-sky-100"
          value={report.deliveredOrders}
        />
        <ReportCard
          icon={RotateCcw}
          label="طلبات راجعة"
          tone="bg-amber-50 text-amber-700 ring-amber-100"
          value={report.partialReturns + report.fullReturns}
        />
      </section>

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600">
            <BarChart3 size={18} />
          </span>
          <h3 className="text-base font-black text-slate-950">تفصيل سريع</h3>
        </div>
        <div className="space-y-3">
          <SoftLine label="راجع جزئي" value={`${report.partialReturns.toLocaleString("ar-LY")} طلب`} />
          <SoftLine label="راجع كامل" value={`${report.fullReturns.toLocaleString("ar-LY")} طلب`} />
          <SoftLine label="أفضل خطوة الآن" value="راجع عهدتك وسلّم الكاش أو المرتجعات عند نهاية الجولة." />
        </div>
        <Link
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-teal-600 px-5 text-sm font-black text-white transition hover:bg-teal-700"
          href="/delivery/handover"
        >
          فتح العهدة
        </Link>
      </section>
    </div>
  );
}

function ReportCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: typeof Truck;
  label: string;
  tone: string;
  value: number;
}) {
  return (
    <article className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ring-1 ${tone}`}>
        <Icon size={20} />
      </div>
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value.toLocaleString("ar-LY")}</p>
    </article>
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
