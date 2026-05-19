export default function Home() {
  const readiness = [
    { label: "إدارة متعددة الأدوار", value: "جاهز" },
    { label: "قاعدة بيانات Supabase", value: "37 جدول" },
    { label: "PWA و Vercel", value: "منشور" },
  ];

  return (
    <main className="min-h-screen bg-[#f8faf8] text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-8 flex w-fit items-center gap-3 border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm">
              <span className="h-2.5 w-2.5 bg-emerald-500" />
              Phase 1 verified
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-6xl">
              نظام إدارة المتجر الإلكتروني المتكامل
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              أساس تقني نظيف لإدارة الطلبات، المخازن، التوصيل، والمالية ضمن
              واجهات عربية حديثة وخفيفة مناسبة لبيئة المتاجر.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                className="border border-emerald-700 bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
                href="/login"
              >
                دخول النظام
              </a>
              <a
                className="border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-emerald-200 hover:text-emerald-700"
                href="https://github.com/AbdoDernawi/store"
              >
                مستودع المشروع
              </a>
            </div>
          </div>

          <div className="border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="border-b border-slate-100 pb-5">
              <p className="text-sm font-bold text-emerald-700">حالة التأسيس</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                جاهز للمرحلة الثانية
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              {readiness.map((item) => (
                <div
                  className="flex items-center justify-between gap-4 py-5"
                  key={item.label}
                >
                  <span className="text-sm font-semibold text-slate-600">
                    {item.label}
                  </span>
                  <span className="bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-900">
              الاتجاه البصري المعتمد: minimal حديث، ألوان فاتحة، وتباين هادئ
              مناسب لتجربة متجر يومية.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
