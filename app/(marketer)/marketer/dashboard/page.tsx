import { redirect } from "next/navigation";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { requireCurrentUser, redirectPathForRole } from "@/lib/auth";

export default async function MarketerDashboardPage() {
  const user = await requireCurrentUser();

  if (user.role !== "marketer") {
    redirect(redirectPathForRole(user.role));
  }

  return (
    <RoleDashboard
      description="مساحة المسوق تركز على الطلبات والعمولات بدون إظهار تكلفة المنتج أو هوية الطلب الأصلية."
      eyebrow="لوحة المسوق"
      items={[
        { label: "طلبات المسوق", value: "0", note: "لا توجد طلبات قيد العمل بعد." },
        { label: "الرصيد المتاح", value: "0", note: "يظهر بعد تسليم الطلبات المؤهلة." },
        { label: "الفواتير الافتراضية", value: "0", note: "جاهزة للفصل عن بيانات الطلب الأصلي." },
      ]}
      title="واجهة المسوق"
      user={user}
    />
  );
}
