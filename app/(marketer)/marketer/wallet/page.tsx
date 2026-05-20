import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/admin/format";
import { requireCurrentUser } from "@/lib/auth";
import { getMarketerWalletData } from "@/lib/marketer/data";

export default async function MarketerWalletPage() {
  const user = await requireCurrentUser();
  const data = await getMarketerWalletData(user);
  const credits = data.transactions.filter((transaction) => transaction.flow === "in");
  const payouts = data.transactions.filter((transaction) => transaction.flow === "out");

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-[#edf7ef] p-5 text-slate-950 ring-1 ring-emerald-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-emerald-700">محفظتك</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">{formatMoney(data.balance)}</h2>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm shadow-emerald-950/10">
            <Wallet size={22} />
          </span>
        </div>
        <p className="mt-4 rounded-lg bg-white/70 px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-white">
          لسحب أرباحك تواصل مع الأدمن
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TransactionList
          emptyText="لا توجد أرباح مسجلة بعد."
          icon="in"
          title="سجل الأرباح"
          transactions={credits}
        />
        <TransactionList
          emptyText="لا توجد عمليات سحب بعد."
          icon="out"
          title="سجل السحوبات"
          transactions={payouts}
        />
      </section>
    </div>
  );
}

function TransactionList({
  emptyText,
  icon,
  title,
  transactions,
}: {
  emptyText: string;
  icon: "in" | "out";
  title: string;
  transactions: Array<{
    amount: number;
    created_at: string;
    id: string;
    note: string | null;
    source_type: string;
  }>;
}) {
  const positive = icon === "in";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {positive ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
        </span>
        <h3 className="text-base font-black text-slate-950">{title}</h3>
      </div>

      <div className="space-y-3">
        {transactions.length ? (
          transactions.map((transaction) => (
            <div className="rounded-lg bg-slate-50 p-3" key={transaction.id}>
              <div className="flex items-center justify-between gap-3">
                <p
                  className={`text-sm font-black ${
                    positive ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {positive ? "+" : "-"}
                  {formatMoney(transaction.amount)}
                </p>
                <p className="text-xs font-bold text-slate-400">{formatDate(transaction.created_at)}</p>
              </div>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                {transaction.note || transaction.source_type}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}
