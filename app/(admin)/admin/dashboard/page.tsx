import { redirect } from "next/navigation";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { requireCurrentUser, redirectPathForRole } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const user = await requireCurrentUser();

  if (user.role !== "super_admin" && user.role !== "admin") {
    redirect(redirectPathForRole(user.role));
  }

  return (
    <RoleDashboard
      description="متابعة هادئة لمؤشرات الإدارة قبل الانتقال إلى وحدات المنتجات والطلبات."
      eyebrow={user.role === "super_admin" ? "لوحة المشرف العام" : "لوحة المدير"}
      items={[
        { label: "طلبات اليوم", value: "0", note: "لا توجد طلبات جديدة بعد." },
        { label: "المنتجات النشطة", value: "0", note: "سيتم ربطها بالمخزون لاحقًا." },
        { label: "التنبيهات", value: "0", note: "كل شيء واضح الآن." },
      ]}
      title="لوحة إدارة المتجر"
      user={user}
    />
  );
}
