import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Bell, Home, LogOut, PackageCheck, ScanLine, Truck, UserRound } from "lucide-react";
import { redirectPathForRole, requireCurrentUser, signOut } from "@/lib/auth";

const navItems = [
  { href: "/delivery/dashboard", icon: Home, label: "الرئيسية" },
  { href: "/delivery/custody", icon: PackageCheck, label: "عهدتي" },
  { href: "/delivery/report", icon: BarChart3, label: "تقريري" },
  { href: "/delivery/notifications", icon: Bell, label: "الإشعارات" },
];

export default async function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();

  if (user.role !== "delivery") {
    redirect(redirectPathForRole(user.role));
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfcf8] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col overflow-x-hidden px-3 pb-24 pt-3 sm:px-5 sm:pt-5">
        <header className="mb-4 overflow-hidden rounded-[1.35rem] border border-white bg-white/90 px-4 py-3 shadow-sm shadow-slate-950/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
                <UserRound size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black text-teal-700">مساحة التوصيل</p>
                <h1 className="truncate text-lg font-black text-slate-950">
                  أهلاً {user.fullName}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                aria-label="مسح QR"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
                href="/delivery/scan"
                title="مسح QR"
              >
                <ScanLine size={18} />
              </Link>
              <Link
                aria-label="العهدة"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                href="/delivery/handover"
                title="العهدة"
              >
                <Truck size={18} />
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

      <nav className="fixed inset-x-0 bottom-0 z-40 box-border overflow-hidden border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[1.1rem] text-[11px] font-black text-slate-500 transition hover:bg-teal-50 hover:text-teal-700"
                href={item.href}
                key={item.label}
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
