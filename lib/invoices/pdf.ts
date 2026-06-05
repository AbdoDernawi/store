import { readFileSync } from "fs";
import { join } from "path";
import { jsPDF } from "jspdf";
import type { InvoiceDocument } from "@/lib/invoices/server";

export type InvoicePdfSize = "a4" | "a5" | "thermal";
export type InvoicePdfTemplate = "modern" | "classic" | "soft";

type InvoiceTheme = {
  accent: string;
  header: string;
  muted: string;
  text: string;
};

const themes: Record<InvoicePdfTemplate, InvoiceTheme> = {
  classic: {
    accent: "#0f172a",
    header: "#f8fafc",
    muted: "#64748b",
    text: "#0f172a",
  },
  modern: {
    accent: "#059669",
    header: "#ecfdf5",
    muted: "#64748b",
    text: "#0f172a",
  },
  soft: {
    accent: "#8b6548",
    header: "#f6eee4",
    muted: "#746b63",
    text: "#29252b",
  },
};

export function normalizeInvoicePdfSize(value?: string | null): InvoicePdfSize {
  return value === "a5" || value === "thermal" ? value : "a4";
}

export function normalizeInvoicePdfTemplate(value?: string | null): InvoicePdfTemplate {
  return value === "classic" || value === "soft" ? value : "modern";
}

export function renderInvoicePdf(
  document: InvoiceDocument,
  qrDataUrl: string | null,
  size: InvoicePdfSize,
  template: InvoicePdfTemplate = "modern",
) {
  const thermal = size === "thermal";
  const pageWidth = thermal ? 80 : size === "a5" ? 148 : 210;
  const pageHeight = thermal ? Math.max(230, 168 + document.items.length * 15) : size === "a5" ? 210 : 297;
  const pdf = new jsPDF({
    format: thermal ? [pageWidth, pageHeight] : size,
    orientation: "portrait",
    unit: "mm",
  });
  const theme = themes[template];
  const margin = thermal ? 5 : 12;
  const right = pageWidth - margin;
  const left = margin;
  let y = margin;

  addArabicFonts(pdf);
  pdf.setLanguage("ar");
  pdf.setR2L(true);
  pdf.setTextColor(theme.text);

  const headerHeight = thermal ? 24 : 31;
  const qrSize = thermal ? 18 : 25;
  pdf.setFillColor(theme.header);
  pdf.roundedRect(left, y, pageWidth - margin * 2, headerHeight, thermal ? 2 : 4, thermal ? 2 : 4, "F");
  pdf.setFillColor(theme.accent);
  pdf.roundedRect(left + 2, y + 2, thermal ? 16 : 22, thermal ? 16 : 22, 3, 3, "F");
  pdf.setFont("NotoSansArabic", "bold");
  pdf.setFontSize(thermal ? 7 : 10);
  pdf.setTextColor("#ffffff");
  pdf.text(ar(pdf, document.identity.name.slice(0, 2) || "مت"), left + (thermal ? 10 : 13), y + (thermal ? 11 : 15), {
    align: "center",
  });

  pdf.setTextColor(theme.text);
  pdf.setFontSize(thermal ? 12 : 17);
  pdf.text(ar(pdf, document.identity.name || "فاتورة المتجر"), right - (qrDataUrl ? qrSize + 5 : 0), y + (thermal ? 8 : 10), {
    align: "right",
  });
  pdf.setFont("NotoSansArabic", "normal");
  pdf.setFontSize(thermal ? 7 : 9);
  pdf.setTextColor(theme.muted);
  pdf.text(ar(pdf, document.identity.contactPhone || "فاتورة المتجر"), right - (qrDataUrl ? qrSize + 5 : 0), y + (thermal ? 14 : 17), {
    align: "right",
  });
  pdf.text(ar(pdf, document.identity.address || "هوية المتجر الأصلية"), right - (qrDataUrl ? qrSize + 5 : 0), y + (thermal ? 19 : 23), {
    align: "right",
  });

  if (qrDataUrl) {
    pdf.addImage(qrDataUrl, "PNG", right - qrSize - 2, y + 3, qrSize, qrSize);
  }

  y += headerHeight + (thermal ? 8 : 10);
  pdf.setTextColor(theme.text);
  pdf.setFont("NotoSansArabic", "bold");
  pdf.setFontSize(thermal ? 12 : 16);
  pdf.text(ar(pdf, `فاتورة #${document.invoice.invoice_number || document.order.order_number || "-"}`), right, y, {
    align: "right",
  });
  y += thermal ? 7 : 8;
  pdf.setFont("NotoSansArabic", "normal");
  pdf.setFontSize(thermal ? 7.2 : 9);
  y = drawMeta(pdf, right, y, "التاريخ", formatInvoiceDate(document.invoice.created_at), theme, thermal);
  y = drawMeta(pdf, right, y, "الزبون", document.order.customer_name, theme, thermal);
  y = drawMeta(pdf, right, y, "الهاتف", document.order.customer_phone, theme, thermal);
  y = drawMeta(pdf, right, y, "العنوان", document.order.customer_address || "-", theme, thermal, pageWidth - margin * 2 - 24);
  y += thermal ? 4 : 6;

  const nameWidth = thermal ? pageWidth - margin * 2 - 35 : pageWidth - margin * 2 - 78;
  const quantityWidth = thermal ? 8 : 18;
  const priceWidth = thermal ? 13 : 26;
  const totalWidth = thermal ? 14 : 30;
  const rowHeight = thermal ? 8 : 9;

  pdf.setFillColor(template === "classic" ? "#e2e8f0" : theme.header);
  pdf.roundedRect(left, y, pageWidth - margin * 2, rowHeight, 2, 2, "F");
  pdf.setFont("NotoSansArabic", "bold");
  pdf.setFontSize(thermal ? 6.2 : 8);
  pdf.setTextColor(theme.text);
  pdf.text(ar(pdf, "المنتج"), right - 2, y + rowHeight - 2.5, { align: "right" });
  pdf.text(ar(pdf, "الكمية"), left + totalWidth + priceWidth + quantityWidth / 2, y + rowHeight - 2.5, { align: "center" });
  pdf.text(ar(pdf, "السعر"), left + totalWidth + priceWidth / 2, y + rowHeight - 2.5, { align: "center" });
  pdf.text(ar(pdf, "الإجمالي"), left + totalWidth / 2, y + rowHeight - 2.5, { align: "center" });
  y += rowHeight + 1;

  pdf.setFont("NotoSansArabic", "normal");
  pdf.setFontSize(thermal ? 6.2 : 8);

  for (const item of document.items) {
    const label = [item.productName, item.variantLabel].filter(Boolean).join(" - ");
    const productLines = splitAr(pdf, label, nameWidth);
    const lineHeight = thermal ? 3.8 : 4.5;
    const itemHeight = Math.max(rowHeight, productLines.length * lineHeight + 3);

    y = ensurePage(pdf, y, itemHeight + 4, pageHeight, margin, thermal);
    pdf.setDrawColor("#e2e8f0");
    pdf.line(left, y + itemHeight, right, y + itemHeight);
    pdf.text(productLines, right - 2, y + (thermal ? 4 : 5), { align: "right" });
    pdf.text(String(item.quantity), left + totalWidth + priceWidth + quantityWidth / 2, y + (thermal ? 4 : 5), { align: "center" });
    pdf.text(money(item.unitPrice), left + totalWidth + priceWidth / 2, y + (thermal ? 4 : 5), { align: "center" });
    pdf.text(money(item.totalPrice), left + totalWidth / 2, y + (thermal ? 4 : 5), { align: "center" });
    y += itemHeight + 1;
  }

  y = ensurePage(pdf, y, thermal ? 48 : 54, pageHeight, margin, thermal);
  y += thermal ? 3 : 5;
  pdf.setFillColor(template === "classic" ? "#f8fafc" : theme.header);
  pdf.roundedRect(left, y, pageWidth - margin * 2, thermal ? 36 : 41, 3, 3, "F");
  y += thermal ? 7 : 8;
  drawAmount(pdf, left, right, y, "المجموع", document.invoice.subtotal, thermal, theme);
  y += thermal ? 5 : 6;
  drawAmount(pdf, left, right, y, "الخصم", -document.invoice.discount_amount, thermal, theme);
  y += thermal ? 5 : 6;
  drawAmount(pdf, left, right, y, "الإجمالي", document.invoice.total, thermal, theme, true);
  y += thermal ? 7 : 9;
  pdf.setDrawColor("#cbd5e1");
  pdf.line(left + 2, y, right - 2, y);
  y += thermal ? 6 : 7;
  drawAmount(pdf, left, right, y, "سعر التوصيل", document.invoice.delivery_fee, thermal, theme, true);
  y += thermal ? 6 : 7;
  pdf.setFontSize(thermal ? 6.5 : 8);
  pdf.setTextColor(theme.muted);
  pdf.text(ar(pdf, "يحصّل من مندوب التوصيل"), right - 2, y, { align: "right" });
  y += thermal ? 8 : 10;

  if (document.returnInfo || document.invoice.has_return) {
    y = ensurePage(pdf, y, thermal ? 22 : 28, pageHeight, margin, thermal);
    pdf.setFillColor("#fff1f2");
    pdf.setTextColor("#9f1239");
    pdf.roundedRect(left, y, pageWidth - margin * 2, thermal ? 18 : 22, 2, 2, "F");
    pdf.setFont("NotoSansArabic", "bold");
    pdf.setFontSize(thermal ? 7 : 9);
    pdf.text(ar(pdf, "راجع جزئي"), right - 2, y + (thermal ? 5 : 6), { align: "right" });
    pdf.setFont("NotoSansArabic", "normal");
    pdf.text(ar(pdf, document.returnInfo?.reason || "توجد مرتجعات مرتبطة بهذه الفاتورة."), right - 2, y + (thermal ? 11 : 14), {
      align: "right",
    });
    y += thermal ? 23 : 28;
  }

  if (document.identity.note) {
    y = ensurePage(pdf, y, 20, pageHeight, margin, thermal);
    pdf.setTextColor(theme.muted);
    pdf.setFontSize(thermal ? 6.5 : 8);
    pdf.text(splitAr(pdf, document.identity.note, pageWidth - margin * 2), right, y, { align: "right" });
  }

  return new Uint8Array(pdf.output("arraybuffer"));
}

function drawMeta(
  pdf: jsPDF,
  right: number,
  y: number,
  label: string,
  value: string,
  theme: InvoiceTheme,
  thermal: boolean,
  valueWidth = 80,
) {
  pdf.setFont("NotoSansArabic", "bold");
  pdf.setTextColor(theme.text);
  pdf.text(ar(pdf, `${label}:`), right, y, { align: "right" });
  pdf.setFont("NotoSansArabic", "normal");
  pdf.setTextColor(theme.muted);
  const lines = splitAr(pdf, value || "-", valueWidth);
  pdf.text(lines, right - (thermal ? 15 : 19), y, { align: "right" });
  return y + Math.max(thermal ? 5 : 6, lines.length * (thermal ? 4 : 5));
}

function drawAmount(
  pdf: jsPDF,
  left: number,
  right: number,
  y: number,
  label: string,
  value: number,
  thermal: boolean,
  theme: InvoiceTheme,
  strong = false,
) {
  pdf.setFont("NotoSansArabic", strong ? "bold" : "normal");
  pdf.setFontSize(thermal ? 7 : strong ? 10 : 9);
  pdf.setTextColor(strong ? theme.text : theme.muted);
  pdf.text(ar(pdf, label), right - 2, y, { align: "right" });
  pdf.text(money(value), left + 2, y, { align: "left" });
}

function ensurePage(pdf: jsPDF, y: number, needed: number, pageHeight: number, margin: number, thermal: boolean) {
  if (thermal || y + needed < pageHeight - margin) {
    return y;
  }

  pdf.addPage();
  return margin;
}

function ar(pdf: jsPDF, value: string) {
  const cleaned = String(value || "")
    .replace(/-/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

  return pdf.processArabic(cleaned);
}

function splitAr(pdf: jsPDF, value: string, width: number) {
  return pdf.splitTextToSize(ar(pdf, value), width) as string[];
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
