import { ShieldCheck, Users } from "lucide-react";
import { UserCreateForm } from "@/components/admin/AdminManagementForms";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminUsers } from "@/lib/admin/management";
import { formatDate } from "@/lib/admin/format";

const roleLabel: Record<string, string> = {
  super_admin: "مشرف عام",
  admin: "مدير",
  marketer: "مسوق",
  delivery: "مندوب",
  customer: "زبون",
};

export default async function AdminUsersPage() {
  const { users } = await getAdminUsers();

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
          <Users size={19} />
          المستخدمين
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">الفريق والحسابات</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
          أنشئ حسابات العمل وتابع حالة الزبائن والفريق.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="text-emerald-600" size={20} />
          <h3 className="text-sm font-black text-slate-950">إنشاء حساب</h3>
        </div>
        <UserCreateForm />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
        <div className="hidden grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-black text-slate-500 lg:grid">
          <span>الاسم</span>
          <span>الهاتف</span>
          <span>الدور</span>
          <span>الحالة</span>
        </div>
        <div className="divide-y divide-slate-100">
          {users.map((user) => (
            <div className="grid gap-3 px-5 py-4 lg:grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr] lg:items-center" key={user.id}>
              <div>
                <p className="text-sm font-black text-slate-950">{user.full_name}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(user.created_at)}</p>
              </div>
              <p className="text-sm font-bold text-slate-700">{user.phone}</p>
              <p className="text-sm font-black text-slate-800">{roleLabel[user.role] || user.role}</p>
              <StatusBadge status={user.is_active ? "delivered" : "cancelled"}>
                {user.is_active ? "نشط" : "متوقف"}
              </StatusBadge>
            </div>
          ))}
          {!users.length ? <div className="px-5 py-12 text-center text-sm font-bold text-slate-500">لا توجد حسابات متاحة للعرض.</div> : null}
        </div>
      </section>
    </div>
  );
}
