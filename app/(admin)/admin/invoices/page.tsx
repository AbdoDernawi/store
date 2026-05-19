import { FileText, Printer } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminInvoices } from "@/lib/admin/management";
import { formatDate, formatMoney, paymentMethodLabels } from "@/lib/admin/format";

export default async function AdminInvoicesPage() {
  const { invoices } = await getAdminInvoices();

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
          <FileText size={19} />
          الفواتير
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">أرشيف الفواتير</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
          راجع الفواتير المطبوعة والطلبات المرتبطة بها.
        </p>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
        <div className="hidden grid-cols-[0.75fr_1.1fr_0.9fr_0.8fr_0.8fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-black text-slate-500 lg:grid">
          <span>الفاتورة</span>
          <span>الزبون</span>
          <span>الدفع</span>
          <span>الإجمالي</span>
          <span>الطباعة</span>
        </div>
        <div className="divide-y divide-slate-100">
          {invoices.map((invoice) => (
            <div className="grid gap-3 px-5 py-4 lg:grid-cols-[0.75fr_1.1fr_0.9fr_0.8fr_0.8fr] lg:items-center" key={invoice.id}>
              <div>
                <p className="text-sm font-black text-slate-950">#{invoice.invoice_number || "-"}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(invoice.created_at)}</p>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">{invoice.orders?.customer_name || "زبون"}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{invoice.orders?.customer_phone || "-"}</p>
              </div>
              <p className="text-sm font-bold text-slate-700">{paymentMethodLabels[invoice.payment_method] || invoice.payment_method}</p>
              <p className="text-sm font-black text-emerald-700">{formatMoney(invoice.total)}</p>
              <StatusBadge status={invoice.printed_at ? "delivered" : "pending_approval"}>
                <Printer size={13} />
                {invoice.printed_at ? "مطبوعة" : "جاهزة"}
              </StatusBadge>
            </div>
          ))}
          {!invoices.length ? <div className="px-5 py-12 text-center text-sm font-bold text-slate-500">لا توجد فواتير بعد.</div> : null}
        </div>
      </section>
    </div>
  );
}
