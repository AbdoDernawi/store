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
    <main className="min-h-screen bg-[#f8faf8] px-5 py-10 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="order-2 lg:order-1">
          <div className="border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <p className="text-sm font-bold text-emerald-700">تسجيل الدخول</p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              أهلاً بك في لوحة إدارة المتجر
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              استخدم رقم الهاتف وكلمة المرور للوصول إلى الواجهة المناسبة لدورك.
            </p>
            <div className="mt-8">
              <Suspense fallback={<div className="h-64 border border-slate-100 bg-slate-50" />}>
                <LoginForm />
              </Suspense>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-5 text-sm font-semibold text-slate-600">
              ليس لديك حساب زبون؟{" "}
              <Link className="text-emerald-700 hover:text-emerald-800" href="/register">
                إنشاء حساب جديد
              </Link>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="mb-4 w-fit border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm">
            Modern commerce operations
          </p>
          <h2 className="max-w-2xl text-4xl font-black leading-tight text-slate-950 sm:text-6xl">
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
