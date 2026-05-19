import { Banknote, HandCoins, WalletCards } from "lucide-react";
import { FinanceExpenseForm } from "@/components/admin/AdminManagementForms";
import { getAdminFinance } from "@/lib/admin/management";
import { formatDate, formatMoney, formatNumber } from "@/lib/admin/format";

export default async function AdminFinancePage() {
  const data = await getAdminFinance();

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
          <Banknote size={19} />
          المالية
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">الخزنة والمحافظ</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
          تابع الأرصدة والعهد والمصاريف ودفعات المحافظ.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.treasury.map((row) => (
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5" key={row.id}>
            <WalletCards className="text-emerald-600" size={22} />
            <p className="mt-4 text-sm font-bold text-slate-500">{row.type === "cash" ? "خزنة الكاش" : "خزنة التحويلات"}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{formatMoney(row.balance)}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <FinanceExpenseForm />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <HandCoins className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">عهد التوصيل</h3>
          </div>
          <div className="space-y-3">
            {data.handovers.map((handover) => (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3" key={handover.id}>
                <div>
                  <p className="text-sm font-black text-slate-900">{handover.users?.full_name || "مندوب"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{formatNumber(handover.order_ids?.length || 0)} طلب</p>
                </div>
                <p className="text-sm font-black text-emerald-700">{formatMoney(handover.total_amount)}</p>
              </div>
            ))}
            {!data.handovers.length ? <EmptyText text="لا توجد عهد معلقة." /> : null}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <h3 className="mb-4 text-sm font-black text-slate-950">مصروفات أخيرة</h3>
          <div className="space-y-3">
            {data.expenses.map((expense) => (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3" key={expense.id}>
                <div>
                  <p className="text-sm font-black text-slate-900">{expense.type}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(expense.created_at)}</p>
                </div>
                <p className="text-sm font-black text-rose-700">{formatMoney(expense.amount)}</p>
              </div>
            ))}
            {!data.expenses.length ? <EmptyText text="لا توجد مصروفات بعد." /> : null}
          </div>
        </article>
      </section>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">{text}</div>;
}
