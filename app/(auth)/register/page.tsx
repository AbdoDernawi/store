import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getCurrentUser, redirectPathForRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
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
              حساب زبون جديد
            </p>
            <h1 className="mt-4 text-3xl font-black leading-10 text-slate-950">
              إنشاء حساب للتسوق والمتابعة
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              بعد التسجيل سيتم توجيهك مباشرة إلى واجهة الزبون.
            </p>
            <div className="mt-8">
              <RegisterForm />
            </div>
            <div className="mt-6 rounded-[1.1rem] bg-slate-50 px-4 py-3 text-sm font-bold leading-7 text-slate-600 ring-1 ring-slate-100">
              لديك حساب بالفعل؟{" "}
              <Link className="font-black text-emerald-700 hover:text-emerald-800" href="/login">
                تسجيل الدخول
              </Link>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="mb-4 w-fit rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-700 shadow-sm shadow-emerald-950/5 ring-1 ring-emerald-100">
            Customer first
          </p>
          <h2 className="max-w-2xl text-4xl font-black leading-[1.15] text-slate-950 sm:text-6xl">
            تجربة خفيفة للزبون من أول تسجيل حتى متابعة الطلب.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            لا صور شخصية ولا تعقيد؛ فقط بيانات واضحة ومسار سريع للشراء.
          </p>
        </div>
      </section>
    </main>
  );
}
