import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { formatDate, formatMoney, paymentMethodLabels } from "@/lib/admin/format";
import { getCustomerInvoices } from "@/lib/customer/data";

export default async function CustomerInvoicesPage({
  searchParams,
}: {
  searchParams?: { from?: string; q?: string; to?: string };
}) {
  const query = searchParams?.q || "";
  const dateFrom = searchParams?.from || "";
  const dateTo = searchParams?.to || "";
  const { invoices } = await getCustomerInvoices(query, dateFrom, dateTo);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-white p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
        <p className="text-xs font-black text-emerald-700">فواتيري</p>
        <h2 className="mt-2 text-2xl font-black leading-9 text-slate-950">أرشيف الفواتير</h2>
      </section>

      <form className="rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5">
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            defaultValue={query}
            name="q"
            placeholder="رقم فاتورة، طلب، اسم، هاتف"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            className="h-11 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            defaultValue={dateFrom}
            name="from"
            type="date"
          />
          <input
            className="h-11 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            defaultValue={dateTo}
            name="to"
            type="date"
          />
        </div>
        <button className="mt-3 h-11 w-full rounded-full bg-slate-950 text-sm font-black text-white transition hover:bg-slate-800" type="submit">
          بحث
        </button>
      </form>

      <section className="space-y-3">
        {invoices.length ? (
          invoices.map((invoice) => (
            <article className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5" key={invoice.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-black text-slate-950">فاتورة #{invoice.invoice_number || "-"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    طلب #{invoice.order?.order_number || "-"} · {formatDate(invoice.created_at)}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  {formatMoney(invoice.total)}
                </span>
              </div>
              <div className="mt-3 rounded-[1rem] bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-600 ring-1 ring-slate-100">
                <p>{invoice.order?.customer_name || "-"}</p>
                <p>{invoice.order?.customer_phone || "-"}</p>
                <p>{paymentMethodLabels[invoice.payment_method] || invoice.payment_method}</p>
                <p>سعر التوصيل: {formatMoney(invoice.delivery_fee)} · يُحصَّل من مندوب التوصيل</p>
              </div>
              {invoice.has_return ? (
                <p className="mt-3 rounded-full bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-700 ring-1 ring-amber-100">
                  راجع جزئي
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-[1.35rem] bg-white p-6 text-center shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-700">
              <FileText size={22} />
            </div>
            <p className="mt-3 text-sm font-black text-slate-600">لا توجد فواتير مطابقة.</p>
            <Link className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700" href="/customer/products">
              تصفح المنتجات
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
