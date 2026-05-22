"use client";

import { Download, ExternalLink, Printer, Share2 } from "lucide-react";
import { useMemo, useState } from "react";

type InvoicePdfSize = "a4" | "a5" | "thermal";

type InvoicePreviewProps = {
  compact?: boolean;
  invoiceId?: string | null;
  orderId?: string | null;
  printHref?: string | null;
  title?: string;
};

export function InvoicePreview({
  compact = false,
  invoiceId,
  orderId,
  printHref,
  title = "معاينة الفاتورة",
}: InvoicePreviewProps) {
  const [shareMessage, setShareMessage] = useState("");
  const [size, setSize] = useState<InvoicePdfSize>("a4");
  const pdfUrl = useMemo(() => {
    const params = new URLSearchParams({ size });

    if (invoiceId) {
      params.set("invoice_id", invoiceId);
    }

    if (orderId) {
      params.set("order_id", orderId);
    }

    return `/api/invoices/generate?${params.toString()}`;
  }, [invoiceId, orderId, size]);

  async function shareInvoice() {
    try {
      const response = await fetch(`${pdfUrl}&download=1`);

      if (!response.ok) {
        setShareMessage("تعذر تجهيز ملف المشاركة.");
        return;
      }

      const blob = await response.blob();
      const file = new File([blob], "invoice.pdf", { type: "application/pdf" });

      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({
          files: [file],
          title,
        });
        setShareMessage("تم فتح المشاركة.");
        return;
      }

      window.open(`${pdfUrl}&download=1`, "_blank", "noopener,noreferrer");
      setShareMessage("تم فتح ملف PDF للمشاركة.");
    } catch {
      setShareMessage("المشاركة غير متاحة الآن.");
    }
  }

  if (!invoiceId && !orderId) {
    return null;
  }

  return (
    <section className={`rounded-[1.2rem] border border-slate-200 bg-white shadow-sm shadow-slate-950/5 ${compact ? "p-2" : "p-4"}`}>
      {!compact ? (
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black text-emerald-700">PDF</p>
            <h2 className="text-lg font-black text-slate-950">{title}</h2>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <InvoiceSizePicker onChange={setSize} value={size} />
            <InvoiceActions onShare={() => void shareInvoice()} pdfUrl={pdfUrl} printHref={printHref} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <InvoiceSizePicker compact onChange={setSize} value={size} />
          <InvoiceActions onShare={() => void shareInvoice()} pdfUrl={pdfUrl} printHref={printHref} />
        </div>
      )}

      {!compact ? (
        <iframe
          className="h-[680px] w-full rounded-[1rem] border border-slate-200 bg-slate-50"
          src={pdfUrl}
          title={title}
        />
      ) : null}
      {shareMessage ? <p className="mt-2 text-[11px] font-black text-emerald-700">{shareMessage}</p> : null}
    </section>
  );
}

function InvoiceSizePicker({
  compact = false,
  onChange,
  value,
}: {
  compact?: boolean;
  onChange: (value: InvoicePdfSize) => void;
  value: InvoicePdfSize;
}) {
  const sizes: Array<{ label: string; value: InvoicePdfSize }> = [
    { label: "A4", value: "a4" },
    { label: "A5", value: "a5" },
    { label: "حراري", value: "thermal" },
  ];

  return (
    <div
      aria-label="مقاس الفاتورة"
      className={`inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 p-1 ${compact ? "text-[11px]" : "text-xs"}`}
      role="group"
    >
      {sizes.map((size) => (
        <button
          aria-pressed={value === size.value}
          className={`h-8 rounded-full px-3 font-black transition ${
            value === size.value
              ? "bg-white text-emerald-700 shadow-sm shadow-slate-950/10"
              : "text-slate-500 hover:text-slate-800"
          }`}
          key={size.value}
          onClick={() => onChange(size.value)}
          type="button"
        >
          {size.label}
        </button>
      ))}
    </div>
  );
}

function InvoiceActions({
  onShare,
  pdfUrl,
  printHref,
}: {
  onShare: () => void;
  pdfUrl: string;
  printHref?: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <a
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-xs font-black text-white"
        href={`${pdfUrl}&download=1`}
      >
        <Download size={14} />
        تحميل
      </a>
      <a
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-50 px-3 text-xs font-black text-slate-700 ring-1 ring-slate-100"
        href={printHref || `${pdfUrl}&archive=1`}
        rel="noreferrer"
        target="_blank"
      >
        <Printer size={14} />
        طباعة
      </a>
      <button
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-50 px-3 text-xs font-black text-slate-700 ring-1 ring-slate-100"
        onClick={onShare}
        type="button"
      >
        <Share2 size={14} />
        مشاركة
      </button>
      <a
        aria-label="فتح المعاينة"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-100"
        href={pdfUrl}
        rel="noreferrer"
        target="_blank"
      >
        <ExternalLink size={14} />
      </a>
    </div>
  );
}
