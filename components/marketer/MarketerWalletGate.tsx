"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, LockKeyhole, Send, Wallet } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/admin/format";
import type { MarketerWalletData } from "@/lib/marketer/data";

type Props = {
  data: MarketerWalletData;
  phone: string;
};

type WithdrawalRequest = MarketerWalletData["withdrawalRequests"][number];

const withdrawalStatusLabels: Record<string, string> = {
  approved: "مقبول",
  paid: "مدفوع",
  pending: "قيد المراجعة",
  rejected: "مرفوض",
};

export function MarketerWalletGate({ data, phone }: Props) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [accountDetails, setAccountDetails] = useState("");
  const [note, setNote] = useState("");
  const [requests, setRequests] = useState(data.withdrawalRequests);
  const [requestMessage, setRequestMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const credits = useMemo(() => data.transactions.filter((transaction) => transaction.flow === "in"), [data.transactions]);
  const payouts = useMemo(() => data.transactions.filter((transaction) => transaction.flow === "out"), [data.transactions]);

  async function unlockWallet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnlockError("");

    const response = await fetch("/api/auth/login", {
      body: JSON.stringify({ next: "/marketer/wallet", password, phone }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok || result.error) {
      setUnlockError(result.error || "كلمة المرور غير صحيحة.");
      return;
    }

    setPassword("");
    setUnlocked(true);
  }

  async function submitWithdrawal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestMessage("");

    const response = await fetch("/api/marketer/wallet/withdrawals", {
      body: JSON.stringify({
        account_details: accountDetails,
        amount,
        method,
        note,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      request?: WithdrawalRequest;
    };

    if (!response.ok || result.error || !result.request) {
      setRequestMessage(result.error || "تعذر إرسال طلب السحب.");
      return;
    }

    setRequests((current) => [result.request as WithdrawalRequest, ...current]);
    setAmount("");
    setAccountDetails("");
    setNote("");
    setRequestMessage("تم إرسال طلب السحب للمراجعة.");
    startTransition(() => router.refresh());
  }

  if (!unlocked) {
    return (
      <section className="mx-auto max-w-xl rounded-[1.7rem] border border-emerald-100 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <LockKeyhole size={22} />
          </span>
          <div>
            <p className="text-xs font-black text-emerald-700">المحفظة محمية</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">أدخل كلمة المرور لعرض الرصيد</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
              الرصيد وسجل التحويلات لا يظهران لمن يستخدم الحساب إلا بعد التحقق.
            </p>
          </div>
        </div>
        <form className="space-y-3" onSubmit={unlockWallet}>
          <input
            className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="كلمة المرور"
            type="password"
            value={password}
          />
          {unlockError ? <p className="text-xs font-black text-rose-600">{unlockError}</p> : null}
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
            type="submit"
          >
            <Wallet size={18} />
            فتح المحفظة
          </button>
        </form>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-[#edf7ef] p-5 text-slate-950 ring-1 ring-emerald-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-emerald-700">الرصيد المتاح</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">{formatMoney(data.balance)}</h2>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm shadow-emerald-950/10">
            <Wallet size={22} />
          </span>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1fr]">
        <form className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5" onSubmit={submitWithdrawal}>
          <h3 className="text-base font-black text-slate-950">طلب سحب</h3>
          <div className="mt-4 space-y-3">
            <input className={inputClass} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} placeholder="المبلغ" value={amount} />
            <select className={inputClass} onChange={(event) => setMethod(event.target.value)} value={method}>
              <option value="bank_transfer">حوالة مصرفية</option>
              <option value="cash">كاش</option>
              <option value="other">طريقة أخرى</option>
            </select>
            <textarea className={`${inputClass} min-h-24 rounded-[1.1rem] py-3`} onChange={(event) => setAccountDetails(event.target.value)} placeholder="بيانات الحساب أو طريقة الاستلام" value={accountDetails} />
            <input className={inputClass} onChange={(event) => setNote(event.target.value)} placeholder="ملاحظة اختيارية" value={note} />
            {requestMessage ? <p className="text-xs font-black text-emerald-700">{requestMessage}</p> : null}
            <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-sm font-black text-white disabled:opacity-60" disabled={isPending} type="submit">
              <Send size={17} />
              إرسال الطلب
            </button>
          </div>
        </form>

        <WithdrawalRequests requests={requests} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TransactionList emptyText="لا توجد أرباح مسجلة بعد." icon="in" title="سجل الأرباح" transactions={credits} />
        <TransactionList emptyText="لا توجد تحويلات خارجة بعد." icon="out" title="سجل التحويلات" transactions={payouts} />
      </section>
    </div>
  );
}

function WithdrawalRequests({ requests }: { requests: WithdrawalRequest[] }) {
  return (
    <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <h3 className="mb-4 text-base font-black text-slate-950">طلبات السحب</h3>
      <div className="space-y-3">
        {requests.length ? (
          requests.map((request) => (
            <div className="rounded-lg bg-slate-50 p-3" key={request.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-950">{formatMoney(request.amount)}</p>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-100">
                  {withdrawalStatusLabels[request.status] || request.status}
                </span>
              </div>
              <p className="mt-2 text-xs font-bold text-slate-500">{formatDate(request.created_at)}</p>
              {request.account_details ? <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{request.account_details}</p> : null}
            </div>
          ))
        ) : (
          <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">لا توجد طلبات سحب بعد.</div>
        )}
      </div>
    </section>
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
  transactions: MarketerWalletData["transactions"];
}) {
  const positive = icon === "in";

  return (
    <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <div className="mb-4 flex items-center gap-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {positive ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
        </span>
        <h3 className="text-base font-black text-slate-950">{title}</h3>
      </div>
      <div className="space-y-3">
        {transactions.length ? (
          transactions.map((transaction) => (
            <div className="rounded-lg bg-slate-50 p-3" key={transaction.id}>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-sm font-black ${positive ? "text-emerald-700" : "text-rose-700"}`}>
                  {positive ? "+" : "-"}
                  {formatMoney(transaction.amount)}
                </p>
                <p className="text-xs font-bold text-slate-400">{formatDate(transaction.created_at)}</p>
              </div>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{transaction.note || transaction.source_type}</p>
            </div>
          ))
        ) : (
          <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">{emptyText}</div>
        )}
      </div>
    </section>
  );
}

const inputClass =
  "w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50";
