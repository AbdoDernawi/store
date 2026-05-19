import { redirect } from "next/navigation";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { requireCurrentUser, redirectPathForRole } from "@/lib/auth";

export default async function CustomerHomePage() {
  const user = await requireCurrentUser();

  if (user.role !== "customer") {
    redirect(redirectPathForRole(user.role));
  }

  return (
    <RoleDashboard
      description="واجهة خفيفة للزبون لمتابعة الحساب والطلبات عند تفعيل المتجر."
      eyebrow="واجهة الزبون"
      items={[
        { label: "طلباتك", value: "0", note: "لا توجد طلبات مسجلة بعد." },
        { label: "قيد المتابعة", value: "0", note: "ستظهر الطلبات المعتمدة هنا." },
        { label: "المدينة", value: "-", note: "تحدد عند أول طلب." },
      ]}
      title="مرحبًا بك في المتجر"
      user={user}
    />
  );
}
