import { signOut } from "@/lib/auth";
import type { AuthSession } from "@/types/auth";

type DashboardItem = {
  label: string;
  value: string;
  note: string;
};

type RoleDashboardProps = {
  user: AuthSession;
  eyebrow: string;
  title: string;
  description: string;
  items: DashboardItem[];
};

const roleLabels: Record<AuthSession["role"], string> = {
  super_admin: "مشرف عام",
  admin: "مدير",
  marketer: "مسوق",
  delivery: "مندوب توصيل",
  customer: "زبون",
};

export function RoleDashboard({
  user,
  eyebrow,
  title,
  description,
  items,
}: RoleDashboardProps) {
  return (
    <main className="min-h-screen bg-[#f8faf8] px-5 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-700">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm font-bold text-slate-950">{user.fullName}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {roleLabels[user.role]}
              </p>
            </div>
            <form action={signOut}>
              <button
                className="border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                type="submit"
              >
                تسجيل الخروج
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-4 py-8 md:grid-cols-3">
          {items.map((item) => (
            <article
              className="border border-slate-200 bg-white p-5 shadow-sm"
              key={item.label}
            >
              <p className="text-sm font-bold text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.note}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
