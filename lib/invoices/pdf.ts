import { readFileSync } from "fs";
import { join } from "path";
import { jsPDF } from "jspdf";
import type { InvoiceDocument } from "@/lib/invoices/server";

export type InvoicePdfSize = "a4" | "a5" | "thermal";

export function normalizeInvoicePdfSize(value?: string | null): InvoicePdfSize {
  return value === "a5" || value === "thermal" ? value : "a4";
}

export function renderInvoicePdf(
  document: InvoiceDocument,
  qrDataUrl: string | null,
  size: InvoicePdfSize,
) {
  const thermal = size === "thermal";
  const pageWidth = thermal ? 80 : size === "a5" ? 148 : 210;
  const pageHeight = thermal ? Math.max(220, 150 + document.items.length * 12) : size === "a5" ? 210 : 297;
  const pdf = new jsPDF({
    format: thermal ? [pageWidth, pageHeight] : size,
    orientation: "portrait",
    unit: "mm",
  });
  const margin = thermal ? 5 : 12;
  const right = pageWidth - margin;
  const left = margin;
  const titleSize = thermal ? 13 : 18;
  let y = margin;

  addArabicFonts(pdf);
  pdf.setLanguage("ar");
  pdf.setR2L(true);
  pdf.setTextColor("#0f172a");
  pdf.setFillColor(document.identity.secondaryColor);
  pdf.roundedRect(left, y, pageWidth - margin * 2, thermal ? 22 : 27, 2.5, 2.5, "F");
  const badgeSize = thermal ? 16 : 22;
  const qrSize = thermal ? 18 : 24;
  pdf.setFillColor(document.identity.primaryColor);
  pdf.roundedRect(left + 2, y + 2, badgeSize, badgeSize, 2.5, 2.5, "F");
  pdf.setTextColor("#ffffff");
  pdf.setFontSize(thermal ? 7 : 10);
  pdf.text(rtlText(document.identity.name.slice(0, 2)), left + 2 + badgeSize / 2, y + 2 + badgeSize / 2 + 1.5, { align: "center" });
  pdf.setTextColor("#0f172a");
  pdf.setFontSize(titleSize);
  pdf.setFont("NotoSansArabic", "bold");
  pdf.text(rtlText(document.identity.name), right - (qrDataUrl ? qrSize + 5 : 0), y + 8, { align: "right" });
  pdf.setFont("NotoSansArabic", "normal");
  pdf.setFontSize(thermal ? 7 : 9);
  pdf.text(rtlText(document.identity.contactPhone || "فاتورة المتجر"), right - (qrDataUrl ? qrSize + 5 : 0), y + 14, { align: "right" });
  pdf.text(rtlText(document.identity.address || "هوية المتجر الأصلية"), right - (qrDataUrl ? qrSize + 5 : 0), y + 19, { align: "right" });

  if (qrDataUrl) {
    pdf.addImage(qrDataUrl, "PNG", right - qrSize - 2, y + 2, qrSize, qrSize);
  }

  y += thermal ? 30 : 36;
  pdf.setFont("NotoSansArabic", "bold");
  pdf.setFontSize(thermal ? 12 : 16);
  pdf.text(rtlText(`فاتورة #${document.invoice.invoice_number || document.order.order_number || "-"}`), right, y, { align: "right" });
  y += thermal ? 6 : 8;
  pdf.setFont("NotoSansArabic", "normal");
  pdf.setFontSize(thermal ? 7.5 : 9);
  drawMeta(pdf, right, y, "التاريخ", formatInvoiceDate(document.invoice.created_at));
  y += thermal ? 5 : 6;
  drawMeta(pdf, right, y, "الزبون", document.order.customer_name);
  y += thermal ? 5 : 6;
  drawMeta(pdf, right, y, "الهاتف", document.order.customer_phone);
  y += thermal ? 5 : 6;
  drawWrappedMeta(pdf, right, y, pageWidth - margin * 2, "العنوان", document.order.customer_address || "-");
  y += thermal ? 10 : 13;

  const nameWidth = thermal ? pageWidth - margin * 2 - 34 : pageWidth - margin * 2 - 70;
  const quantityWidth = thermal ? 8 : 18;
  const priceWidth = thermal ? 12 : 24;
  const totalWidth = thermal ? 14 : 28;
  const rowHeight = thermal ? 7 : 8;
  pdf.setFillColor("#f1f5f9");
  pdf.roundedRect(left, y, pageWidth - margin * 2, rowHeight, 1.5, 1.5, "F");
  pdf.setFont("NotoSansArabic", "bold");
  pdf.setFontSize(thermal ? 6.5 : 8);
  pdf.text(rtlText("المنتج"), right - 2, y + rowHeight - 2, { align: "right" });
  pdf.text(rtlText("الكمية"), left + totalWidth + priceWidth + quantityWidth / 2, y + rowHeight - 2, { align: "center" });
  pdf.text(rtlText("السعر"), left + totalWidth + priceWidth / 2, y + rowHeight - 2, { align: "center" });
  pdf.text(rtlText("الإجمالي"), left + totalWidth / 2, y + rowHeight - 2, { align: "center" });
  y += rowHeight + 1;
  pdf.setFont("NotoSansArabic", "normal");
  pdf.setFontSize(thermal ? 6.5 : 8);

  for (const item of document.items) {
    const label = [item.productName, item.variantLabel].filter(Boolean).join(" - ");
    const productLines = pdf.splitTextToSize(rtlText(label), nameWidth) as string[];
    const itemHeight = Math.max(rowHeight, productLines.length * (thermal ? 3.4 : 4) + 2);

    pdf.setDrawColor("#e2e8f0");
    pdf.line(left, y + itemHeight, right, y + itemHeight);
    pdf.text(productLines, right - 2, y + (thermal ? 3.6 : 4.6), { align: "right" });
    pdf.text(String(item.quantity), left + totalWidth + priceWidth + quantityWidth / 2, y + (thermal ? 3.6 : 4.6), { align: "center" });
    pdf.text(money(item.unitPrice), left + totalWidth + priceWidth / 2, y + (thermal ? 3.6 : 4.6), { align: "center" });
    pdf.text(money(item.totalPrice), left + totalWidth / 2, y + (thermal ? 3.6 : 4.6), { align: "center" });
    y += itemHeight + 1;
  }

  y += thermal ? 3 : 5;
  pdf.setFillColor("#f8fafc");
  pdf.roundedRect(left, y, pageWidth - margin * 2, thermal ? 30 : 35, 2, 2, "F");
  y += thermal ? 6 : 7;
  drawAmount(pdf, left, right, y, "المجموع", document.invoice.subtotal, thermal);
  y += thermal ? 5 : 6;
  drawAmount(pdf, left, right, y, "الخصم", -document.invoice.discount_amount, thermal);
  y += thermal ? 5 : 6;
  drawAmount(pdf, left, right, y, "الإجمالي", document.invoice.total, thermal, true);
  y += thermal ? 7 : 9;
  pdf.setDrawColor("#cbd5e1");
  pdf.line(left, y, right, y);
  y += thermal ? 6 : 7;
  drawAmount(pdf, left, right, y, "سعر التوصيل", document.invoice.delivery_fee, thermal, true);
  y += thermal ? 5 : 6;
  pdf.setFontSize(thermal ? 6.5 : 8);
  pdf.setTextColor("#475569");
  pdf.text(rtlText("يحصّل من مندوب التوصيل"), right, y, { align: "right" });
  y += thermal ? 8 : 10;

  if (document.returnInfo || document.invoice.has_return) {
    pdf.setFillColor("#fff1f2");
    pdf.setTextColor("#9f1239");
    pdf.roundedRect(left, y, pageWidth - margin * 2, thermal ? 17 : 21, 2, 2, "F");
    pdf.setFont("NotoSansArabic", "bold");
    pdf.setFontSize(thermal ? 7 : 9);
    pdf.text(rtlText("راجع جزئي"), right - 2, y + (thermal ? 5 : 6), { align: "right" });
    pdf.setFont("NotoSansArabic", "normal");
    pdf.text(rtlText(document.returnInfo?.reason || "توجد مرتجعات مرتبطة بهذه الفاتورة."), right - 2, y + (thermal ? 10 : 13), { align: "right" });
    y += thermal ? 22 : 26;
  }

  if (document.identity.note) {
    pdf.setTextColor("#475569");
    pdf.setFontSize(thermal ? 6.5 : 8);
    pdf.text(pdf.splitTextToSize(rtlText(document.identity.note), pageWidth - margin * 2), right, y, { align: "right" });
  }

  return new Uint8Array(pdf.output("arraybuffer"));
}

function drawMeta(pdf: jsPDF, right: number, y: number, label: string, value: string) {
  pdf.setFont("NotoSansArabic", "bold");
  pdf.text(rtlText(`${label}:`), right, y, { align: "right" });
  pdf.setFont("NotoSansArabic", "normal");
  pdf.text(rtlText(value || "-"), right - 18, y, { align: "right" });
}

function drawWrappedMeta(
  pdf: jsPDF,
  right: number,
  y: number,
  width: number,
  label: string,
  value: string,
) {
  pdf.setFont("NotoSansArabic", "bold");
  pdf.text(rtlText(`${label}:`), right, y, { align: "right" });
  pdf.setFont("NotoSansArabic", "normal");
  pdf.text(pdf.splitTextToSize(rtlText(value || "-"), width - 20), right - 18, y, { align: "right" });
}

function drawAmount(
  pdf: jsPDF,
  left: number,
  right: number,
  y: number,
  label: string,
  value: number,
  thermal: boolean,
  strong = false,
) {
  pdf.setFont("NotoSansArabic", strong ? "bold" : "normal");
  pdf.setFontSize(thermal ? 7 : strong ? 10 : 9);
  pdf.setTextColor(strong ? "#0f172a" : "#475569");
  pdf.text(rtlText(label), right - 2, y, { align: "right" });
  pdf.text(money(value), left + 2, y, { align: "left" });
}

function rtlText(value: string) {
  return value
    .replace(/-/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString("ar-LY", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })} د.ل`;
}

function formatInvoiceDate(value: string) {
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

let arabicFonts: { bold: string; regular: string } | null = null;

function addArabicFonts(pdf: jsPDF) {
  const fonts = getArabicFonts();

  pdf.addFileToVFS("NotoSansArabic-Regular.ttf", fonts.regular);
  pdf.addFont("NotoSansArabic-Regular.ttf", "NotoSansArabic", "normal");
  pdf.addFileToVFS("NotoSansArabic-Bold.ttf", fonts.bold);
  pdf.addFont("NotoSansArabic-Bold.ttf", "NotoSansArabic", "bold");
  pdf.setFont("NotoSansArabic", "normal");
}

function getArabicFonts() {
  if (!arabicFonts) {
    const fontRoot = join(process.cwd(), "node_modules", "@expo-google-fonts", "noto-sans-arabic");

    arabicFonts = {
      bold: readFileSync(join(fontRoot, "700Bold", "NotoSansArabic_700Bold.ttf")).toString("base64"),
      regular: readFileSync(join(fontRoot, "400Regular", "NotoSansArabic_400Regular.ttf")).toString("base64"),
    };
  }

  return arabicFonts;
}
