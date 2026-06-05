import { getApiContext, jsonError, mapDatabaseError } from "@/lib/api/context";
import { createQrPngDataUrl } from "@/lib/invoices/qr";
import {
  ensureInvoiceForOrder,
  findInvoiceRecord,
  loadInvoiceDocument,
  markInvoicePrinted,
} from "@/lib/invoices/server";
import { normalizeInvoicePdfSize, normalizeInvoicePdfTemplate, renderInvoicePdf } from "@/lib/invoices/pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await getApiContext(["super_admin", "admin", "marketer", "customer"]);

  if (!auth.ok) {
    return auth.response;
  }

  const searchParams = new URL(request.url).searchParams;
  const invoiceId = searchParams.get("invoice_id");
  const orderId = searchParams.get("order_id");
  const download = searchParams.get("download") === "1";
  const archivePrint = searchParams.get("archive") === "1";

  if (!invoiceId && !orderId) {
    return jsonError("حدد الفاتورة أو الطلب المطلوب.", 400);
  }

  try {
    const invoice = invoiceId
      ? await findInvoiceRecord(auth.context.supabase, invoiceId)
      : await ensureInvoiceForOrder(auth.context.supabase, auth.context.user, orderId || "");

    if (!invoice) {
      return jsonError("تعذر العثور على الفاتورة المطلوبة.", 404);
    }

    const document = await loadInvoiceDocument(auth.context.supabase, invoice);

    if (!document) {
      return jsonError("تعذر تحميل تفاصيل الفاتورة.", 404);
    }

    const qrDataUrl = document.package?.qr_code_hash
      ? await createQrPngDataUrl(document.package.qr_code_hash, 300)
      : null;
    const printedInvoice = archivePrint
      ? await markInvoicePrinted(auth.context.supabase, document.invoice, auth.context.user)
      : document.invoice;
    const pdf = renderInvoicePdf(
      { ...document, invoice: printedInvoice },
      qrDataUrl,
      normalizeInvoicePdfSize(searchParams.get("size")),
      normalizeInvoicePdfTemplate(searchParams.get("template") || document.identity.invoiceTemplate),
    );
    const fileNumber = printedInvoice.invoice_number || document.order.order_number || "draft";

    return new Response(pdf, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename=\"invoice-${fileNumber}.pdf\"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    return mapDatabaseError(error);
  }
}
