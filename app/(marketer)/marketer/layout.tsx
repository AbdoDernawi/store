import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Home,
  LogOut,
  PackageSearch,
  Settings,
  ShoppingBag,
  UserRound,
  Wallet,
} from "lucide-react";
import { redirectPathForRole, requireCurrentUser, signOut } from "@/lib/auth";

const navItems = [
  { href: "/marketer/dashboard", icon: Home, label: "الرئيسية" },
  { href: "/marketer/products", icon: PackageSearch, label: "المنتجات" },
  { href: "/marketer/orders", icon: ShoppingBag, label: "طلباتي" },
  { href: "/marketer/wallet", icon: Wallet, label: "محفظتي" },
  { href: "/marketer/settings", icon: Settings, label: "إعدادات" },
];

export default async function MarketerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();

  if (user.role !== "marketer") {
    redirect(redirectPathForRole(user.role));
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col overflow-x-hidden px-3 pb-24 pt-3 sm:px-5 sm:pt-5">
        <header className="mb-4 overflow-hidden rounded-[1.6rem] border border-[#eee5db] bg-white/90 px-4 py-3 shadow-sm shadow-[#4b3c2e]/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8b6548] text-white">
                <UserRound size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black text-[#8b6548]">مساحة المسوّق</p>
                <h1 className="truncate text-lg font-black text-slate-950">
                  أهلاً {user.fullName}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                aria-label="الإشعارات"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                href="/marketer/notifications"
                prefetch={false}
                title="الإشعارات"
              >
                <Bell size={18} />
              </Link>
              <form action={signOut}>
                <button
                  aria-label="تسجيل الخروج"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100"
                  title="تسجيل الخروج"
                  type="submit"
                >
                  <LogOut size={18} />
                </button>
              </form>
            </div>
          </div>
        </header>

        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-3 z-40 box-border px-3">
        <div className="mx-auto grid w-full max-w-xl grid-cols-5 gap-1 rounded-[1.8rem] bg-[#24252f] p-1.5 shadow-[0_20px_55px_rgba(15,23,42,0.28)]">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[1.35rem] text-[11px] font-black text-[#d9d3cd] transition hover:bg-white/10 hover:text-white"
                href={item.href}
                key={item.label}
                prefetch={false}
              >
                <Icon size={19} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
