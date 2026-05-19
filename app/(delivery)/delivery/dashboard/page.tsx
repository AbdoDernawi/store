import { redirect } from "next/navigation";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { requireCurrentUser, redirectPathForRole } from "@/lib/auth";

export default async function DeliveryDashboardPage() {
  const user = await requireCurrentUser();

  if (user.role !== "delivery") {
    redirect(redirectPathForRole(user.role));
  }

  return (
    <RoleDashboard
      description="مركز عمل مندوب التوصيل للمهام النشطة والتحصيلات والمرتجعات."
      eyebrow="لوحة التوصيل"
      items={[
        { label: "مهام اليوم", value: "0", note: "لا توجد مهام مخصصة بعد." },
        { label: "تحصيلات معلقة", value: "0", note: "يتم فصل أجرة التوصيل عن قيمة الطلب." },
        { label: "مرتجعات", value: "0", note: "لا توجد مرتجعات بانتظار التسليم." },
      ]}
      title="واجهة مندوب التوصيل"
      user={user}
    />
  );
}
