import { Banknote, CreditCard, HandCoins, ReceiptText, Tags, WalletCards } from "lucide-react";
import { ExpenseTypeForm, FinanceExpenseForm, PaymentMethodForm } from "@/components/admin/AdminManagementForms";
import { getAdminFinance } from "@/lib/admin/management";
import { formatDate, formatMoney, formatNumber } from "@/lib/admin/format";

export default async function AdminFinancePage() {
  const data = await getAdminFinance();

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
          <Banknote size={19} />
          المالية
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">الخزنة والمحافظ</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
          تابع الأرصدة حسب وسيلة الدفع، وسجل المصروفات من الخزينة الصحيحة بدون إدخال يدوي مربك.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.paymentMethods.map((method) => {
          const treasury = method.payment_method_treasuries?.[0];

          return (
            <article className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5" key={method.id}>
              <WalletCards className="text-emerald-600" size={22} />
              <p className="mt-4 text-sm font-bold text-slate-500">خزينة {method.name_ar}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{formatMoney(treasury?.balance)}</p>
              <p className="mt-2 text-xs font-bold text-slate-400">{method.is_active ? "نشطة" : "مخفية"}</p>
            </article>
          );
        })}

        {!data.paymentMethods.length ? data.treasury.map((row) => (
          <article className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5" key={row.id}>
            <WalletCards className="text-emerald-600" size={22} />
            <p className="mt-4 text-sm font-bold text-slate-500">{row.type === "cash" ? "خزنة الكاش" : "خزنة التحويلات"}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{formatMoney(row.balance)}</p>
          </article>
        )) : null}
      </section>

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center gap-2">
          <ReceiptText className="text-emerald-600" size={20} />
          <h3 className="text-sm font-black text-slate-950">تسجيل مصروف</h3>
        </div>
        <FinanceExpenseForm expenseTypes={data.expenseTypes} paymentMethods={data.paymentMethods} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <Tags className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">أنواع المصروفات</h3>
          </div>
          <ExpenseTypeForm />
          <div className="mt-4 flex flex-wrap gap-2">
            {data.expenseTypes.map((type) => (
              <span
                className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-100"
                key={type.id}
              >
                {type.name}
              </span>
            ))}
            {!data.expenseTypes.length ? <EmptyText text="لا توجد أنواع مصروفات بعد." /> : null}
          </div>
        </article>

        <article className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">وسائل الدفع والخزائن</h3>
          </div>
          <PaymentMethodForm />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {data.paymentMethods.map((method) => (
              <div className="rounded-2xl bg-slate-50 p-3" key={method.id}>
                <p className="text-sm font-black text-slate-900">{method.name_ar}</p>
                <p className="mt-1 text-xs font-bold text-slate-500" dir="ltr">{method.code}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <HandCoins className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">عهد التوصيل</h3>
          </div>
          <div className="space-y-3">
            {data.handovers.map((handover) => (
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3" key={handover.id}>
                <div>
                  <p className="text-sm font-black text-slate-900">{handover.users?.full_name || "مندوب"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {formatNumber(handover.order_ids?.length || 0)} طلب · {handover.type === "return_goods" ? "مرتجعات" : "كاش"}
                  </p>
                </div>
                <p className="text-sm font-black text-emerald-700">{formatMoney(handover.total_amount)}</p>
              </div>
            ))}
            {!data.handovers.length ? <EmptyText text="لا توجد عهد معلقة." /> : null}
          </div>
        </article>

        <article className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <h3 className="mb-4 text-sm font-black text-slate-950">مصروفات أخيرة</h3>
          <div className="space-y-3">
            {data.expenses.map((expense) => (
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3" key={expense.id}>
                <div>
                  <p className="text-sm font-black text-slate-900">{expense.expense_types?.name || expense.type}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {expense.payment_methods?.name_ar || "خزينة"} · {formatDate(expense.created_at)}
                  </p>
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
  return <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">{text}</div>;
}
