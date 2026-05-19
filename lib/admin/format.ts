export type AdminPeriod = "day" | "week" | "month";

export const orderStatusLabels: Record<string, string> = {
  pending_approval: "بانتظار الاعتماد",
  approved: "معتمد",
  rejected: "مرفوض",
  preparing: "قيد التجهيز",
  ready: "جاهز للتسليم",
  out_for_delivery: "قيد التوصيل",
  delivered: "تم التسليم",
  partial_return: "راجع جزئي",
  full_return: "راجع كامل",
  cancelled: "ملغي",
};

export const paymentMethodLabels: Record<string, string> = {
  cash: "كاش",
  bank_transfer: "تحويل مصرفي",
};

export const paymentStatusLabels: Record<string, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكد",
};

export const orderTypeLabels: Record<string, string> = {
  customer: "زبون",
  marketer: "مسوق",
};

export function formatMoney(value?: number | string | null) {
  const amount = Number(value || 0);

  return `${amount.toLocaleString("ar-LY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} د.ل`;
}

export function formatNumber(value?: number | string | null) {
  return Number(value || 0).toLocaleString("ar-LY");
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function periodRange(period: string | undefined): {
  period: AdminPeriod;
  start: Date;
  label: string;
} {
  const now = new Date();
  const normalized: AdminPeriod =
    period === "week" || period === "month" || period === "day" ? period : "day";
  const start = new Date(now);

  if (normalized === "day") {
    start.setHours(0, 0, 0, 0);
  }

  if (normalized === "week") {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  }

  if (normalized === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  return {
    period: normalized,
    start,
    label: normalized === "day" ? "اليوم" : normalized === "week" ? "آخر 7 أيام" : "هذا الشهر",
  };
}

export function statusTone(status?: string | null) {
  if (status === "delivered" || status === "approved" || status === "confirmed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "pending_approval" || status === "preparing" || status === "ready") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (status === "out_for_delivery") {
    return "bg-sky-50 text-sky-700 ring-sky-100";
  }

  if (status === "rejected" || status === "cancelled" || status === "full_return") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  if (status === "partial_return") {
    return "bg-orange-50 text-orange-700 ring-orange-100";
  }

  return "bg-slate-50 text-slate-700 ring-slate-100";
}
