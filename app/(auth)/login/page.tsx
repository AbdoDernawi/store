import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser, redirectPathForRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(redirectPathForRole(user.role));
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-6 text-slate-950 sm:px-6 sm:py-10">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="order-2 lg:order-1">
          <div className="rounded-[1.75rem] border border-white bg-white/95 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-emerald-100/70 sm:p-8">
            <p className="w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
              تسجيل الدخول
            </p>
            <h1 className="mt-4 text-3xl font-black leading-10 text-slate-950">
              أهلاً بك في لوحة إدارة المتجر
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              استخدم رقم الهاتف وكلمة المرور للوصول إلى الواجهة المناسبة لدورك.
            </p>
            <div className="mt-8">
              <Suspense fallback={<div className="h-64 rounded-[1.4rem] bg-slate-50 ring-1 ring-slate-100" />}>
                <LoginForm />
              </Suspense>
            </div>
            <div className="mt-6 rounded-[1.1rem] bg-slate-50 px-4 py-3 text-sm font-bold leading-7 text-slate-600 ring-1 ring-slate-100">
              ليس لديك حساب زبون؟{" "}
              <Link className="font-black text-emerald-700 hover:text-emerald-800" href="/register">
                إنشاء حساب جديد
              </Link>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="mb-4 w-fit rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-700 shadow-sm shadow-emerald-950/5 ring-1 ring-emerald-100">
            Modern commerce operations
          </p>
          <h2 className="max-w-2xl text-4xl font-black leading-[1.15] text-slate-950 sm:text-6xl">
            دخول واحد لكل الأدوار، وتوجيه تلقائي للواجهة الصحيحة.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            واجهة عربية فاتحة ومنظمة لإدارة الطلبات، المسوقين، مندوبي التوصيل،
            والزبائن بدون ازدحام بصري.
          </p>
        </div>
      </section>
    </main>
  );
}
