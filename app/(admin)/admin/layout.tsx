import Link from "next/link";
import {
  BarChart3,
  Boxes,
  FileText,
  HandCoins,
  Home,
  Landmark,
  LayoutGrid,
  LogOut,
  PackageCheck,
  Settings,
  ShoppingBag,
  Tags,
  Truck,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { signOut, requireCurrentUser, redirectPathForRole } from "@/lib/auth";

const navItems = [
  { href: "/admin/dashboard", label: "الداشبورد", icon: Home },
  { href: "/admin/orders", label: "الطلبيات", icon: ShoppingBag },
  { href: "/admin/products", label: "المنتجات", icon: PackageCheck },
  { href: "/admin/categories", label: "الأقسام", icon: Tags },
  { href: "/admin/warehouses", label: "المخازن", icon: Boxes },
  { href: "/admin/suppliers", label: "الموردين", icon: Truck },
  { href: "/admin/delivery-agents", label: "المندوبين", icon: HandCoins },
  { href: "/admin/users", label: "المستخدمين", icon: Users },
  { href: "/admin/finance", label: "المالية", icon: Landmark },
  { href: "/admin/invoices", label: "الفواتير", icon: FileText },
  { href: "/admin/content", label: "المحتوى", icon: LayoutGrid },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

const roleLabel = {
  super_admin: "مشرف عام",
  admin: "مدير",
  marketer: "مسوق",
  delivery: "مندوب",
  customer: "زبون",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();

  if (user.role !== "super_admin" && user.role !== "admin") {
    redirect(redirectPathForRole(user.role));
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1500px] gap-4 px-3 py-3 sm:px-5 sm:py-5">
        <aside className="hidden w-72 shrink-0 flex-col rounded-[1.35rem] border border-emerald-100 bg-white/92 p-3 shadow-sm shadow-emerald-950/5 lg:flex">
          <Link className="mb-5 flex items-center gap-3 rounded-[1.15rem] bg-emerald-50 px-4 py-4" href="/admin/dashboard">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white">
              <BarChart3 size={22} strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-base font-black text-slate-950">إدارة المتجر</span>
              <span className="block text-xs font-bold text-emerald-700">مساحة العمل اليومية</span>
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="group flex items-center gap-3 rounded-full px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="text-slate-400 transition group-hover:text-emerald-600" size={19} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="rounded-[1.35rem] border border-slate-200 bg-white/92 px-4 py-3 shadow-sm shadow-slate-950/5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-700">صباح العمل الهادئ</p>
                <h1 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
                  أهلاً {user.fullName}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  {roleLabel[user.role]}
                </span>
                <Link
                  className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100 transition hover:bg-emerald-50 hover:text-emerald-700"
                  href="/admin/orders"
                >
                  الطلبيات
                </Link>
                <form action={signOut}>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100"
                    type="submit"
                  >
                    <LogOut size={15} />
                    خروج
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navItems.map((item) => (
                <Link
                  className="shrink-0 rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </header>

          {children}
        </section>
      </div>
    </main>
  );
}
