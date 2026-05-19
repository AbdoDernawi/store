export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-4 text-sm font-semibold text-emerald-300">
          Phase 1 foundation
        </p>
        <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
          نظام إدارة المتجر الإلكتروني المتكامل
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          تم تجهيز هيكل Next.js الأساسي، إعدادات PWA، وتحضير قاعدة بيانات
          Supabase للطلبيات والمخازن والمالية.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            "إدارة متعددة الأدوار",
            "مخازن وسحب ذكي",
            "دورة طلبية كاملة",
          ].map((item) => (
            <div
              className="rounded-lg border border-slate-800 bg-slate-900/70 p-5 text-sm font-semibold text-slate-200"
              key={item}
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
