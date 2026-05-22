import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/invoices/PrintButton";
import { formatDate, formatMoney, paymentMethodLabels } from "@/lib/admin/format";
import { requireCurrentUser, redirectPathForRole } from "@/lib/auth";
import { createQrPngDataUrl } from "@/lib/invoices/qr";
import {
  ensureInvoiceForOrder,
  loadInvoiceDocument,
  markInvoicePrinted,
  type InvoiceDocument,
} from "@/lib/invoices/server";
import { createUserRouteClient } from "@/lib/supabase/route";

export default async function AdminPackagePrintPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireCurrentUser();

  if (user.role !== "super_admin" && user.role !== "admin") {
    redirect(redirectPathForRole(user.role));
  }

  const supabase = createUserRouteClient();

  if (!supabase) {
    redirect("/login");
  }

  const { data: pkg } = await supabase
    .from("order_packages")
    .select("id, package_number, qr_code_hash, order_ids, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!pkg) {
    notFound();
  }

  const orderIds = Array.isArray(pkg.order_ids) ? pkg.order_ids.map(String) : [];
  const documents = (
    await Promise.all(
      orderIds.map(async (orderId) => {
        const invoice = await ensureInvoiceForOrder(supabase, user, orderId);

        if (!invoice) {
          return null;
        }

        const document = await loadInvoiceDocument(supabase, invoice);

        if (!document) {
          return null;
        }

        return {
          ...document,
          invoice: await markInvoicePrinted(supabase, document.invoice, user),
        };
      }),
    )
  ).filter((document): document is InvoiceDocument => Boolean(document));
  const qrDataUrl = await createQrPngDataUrl(pkg.qr_code_hash, 360);

  return (
    <div className="package-print-root space-y-4">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          .package-print-root,
          .package-print-root * {
            visibility: visible;
          }

          .package-print-root {
            inset: 0;
            position: absolute;
            width: 100%;
          }

          .package-print-hide {
            display: none !important;
          }

          .package-print-sheet {
            border: 0 !important;
            box-shadow: none !important;
            break-after: page;
            margin: 0 !important;
            min-height: 0 !important;
          }
        }
      `}</style>

      <section className="package-print-hide flex flex-col gap-3 rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black text-emerald-700">حزمة QR</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">طباعة الحزمة #{pkg.package_number || "-"}</h1>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {formatNumberText(documents.length)} فاتورة · أنشئت {formatDate(pkg.created_at)}
          </p>
        </div>
        <PrintButton />
      </section>

      {documents.map((document) => (
        <InvoicePrintSheet document={document} key={document.order.id} qrDataUrl={qrDataUrl} />
      ))}

      {!documents.length ? (
        <div className="rounded-[1.2rem] border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500">
          لا توجد فواتير قابلة للطباعة لهذه الحزمة.
        </div>
      ) : null}
    </div>
  );
}

function InvoicePrintSheet({
  document,
  qrDataUrl,
}: {
  document: InvoiceDocument;
  qrDataUrl: string;
}) {
  return (
    <article className="package-print-sheet min-h-[960px] rounded-[1.2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5">
      <header className="grid gap-4 border-b border-slate-200 pb-5 md:grid-cols-[120px_minmax(0,1fr)_160px] md:items-start">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1rem] text-2xl font-black text-white" style={{ backgroundColor: document.identity.primaryColor }}>
          {document.identity.logoUrl ? (
            <Image alt={document.identity.name} className="h-full w-full object-cover" height={112} src={document.identity.logoUrl} unoptimized width={112} />
          ) : (
            document.identity.name.slice(0, 2)
          )}
        </div>
        <div>
          <p className="text-xs font-black text-emerald-700">فاتورة #{document.invoice.invoice_number || document.order.order_number || "-"}</p>
          <h2 className="mt-1 text-3xl font-black text-slate-950">{document.identity.name}</h2>
          <p className="mt-2 text-sm font-bold text-slate-500">{document.identity.contactPhone || "بيانات التواصل غير محددة"}</p>
          <p className="text-sm font-bold text-slate-500">{document.identity.address || "العنوان غير محدد"}</p>
          <div className="mt-3 rounded-[1rem] bg-slate-50 p-3 text-sm font-bold text-slate-700">
            <p>التاريخ: {formatDate(document.invoice.created_at)}</p>
            <p className="mt-1">الطلب: #{document.order.order_number || "-"}</p>
            <p className="mt-1">الدفع: {paymentMethodLabels[document.order.payment_method] || document.order.payment_method}</p>
          </div>
        </div>
        <Image alt="QR" className="h-28 w-28 justify-self-start rounded-[0.9rem] border border-slate-200 p-2 md:justify-self-end" height={112} src={qrDataUrl} width={112} />
      </header>

      <section className="mt-5 grid gap-3 rounded-[1rem] bg-slate-50 p-4 md:grid-cols-3">
        <MetaBlock label="الزبون" value={document.order.customer_name} />
        <MetaBlock label="الهاتف" value={document.order.customer_phone} />
        <MetaBlock label="العنوان" value={document.order.customer_address || "-"} />
      </section>

      <section className="mt-5 overflow-hidden rounded-[1rem] border border-slate-200">
        <div className="grid grid-cols-[minmax(0,1fr)_110px_140px_140px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black text-slate-500">
          <span>المنتج</span>
          <span>الكمية</span>
          <span>السعر</span>
          <span>الإجمالي</span>
        </div>
        <div className="divide-y divide-slate-100">
          {document.items.map((item) => (
            <div className="grid grid-cols-[minmax(0,1fr)_110px_140px_140px] gap-3 px-4 py-4 text-sm font-bold text-slate-700" key={item.id}>
              <div>
                <p className="font-black text-slate-950">{item.productName}</p>
                {item.variantLabel ? <p className="mt-1 text-xs text-slate-500">{item.variantLabel}</p> : null}
              </div>
              <span>{formatNumberText(item.quantity)}</span>
              <span>{formatMoney(item.unitPrice)}</span>
              <span className="font-black text-slate-950">{formatMoney(item.totalPrice)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[1rem] border border-dashed border-slate-200 p-4 text-sm font-bold leading-7 text-slate-500">
          {document.identity.note || "شكراً لتسوقكم معنا."}
          {document.returnInfo || document.invoice.has_return ? (
            <p className="mt-3 rounded-[0.8rem] bg-rose-50 p-3 font-black text-rose-700 ring-1 ring-rose-100">
              راجع جزئي: {document.returnInfo?.reason || "توجد مرتجعات مرتبطة بهذه الفاتورة."}
            </p>
          ) : null}
        </div>
        <div className="rounded-[1rem] bg-emerald-50/70 p-4 ring-1 ring-emerald-100">
          <AmountLine label="المجموع" value={formatMoney(document.invoice.subtotal)} />
          <AmountLine label="الخصم" value={`-${formatMoney(document.invoice.discount_amount)}`} />
          <AmountLine label="الإجمالي" strong value={formatMoney(document.invoice.total)} />
          <div className="my-3 border-t border-emerald-100" />
          <AmountLine label="سعر التوصيل" strong value={formatMoney(document.invoice.delivery_fee)} />
          <p className="mt-2 text-xs font-black text-emerald-800">يحصّل من مندوب التوصيل</p>
        </div>
      </section>
    </article>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function AmountLine({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className={strong ? "text-sm font-black text-slate-950" : "text-sm font-bold text-slate-600"}>{label}</span>
      <span className={strong ? "text-base font-black text-emerald-800" : "text-sm font-black text-slate-900"}>{value}</span>
    </div>
  );
}

function formatNumberText(value: number) {
  return Number(value || 0).toLocaleString("ar-LY");
}
