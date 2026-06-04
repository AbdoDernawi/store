const readiness = [
  { label: "إدارة الأدوار", value: "جاهزة" },
  { label: "الطلبات والمخازن", value: "مختبرة" },
  { label: "التوصيل والفواتير", value: "مفعّلة" },
  { label: "PWA و Vercel", value: "جاهز للإطلاق" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf7] text-stone-950">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-10 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="rounded-[2rem] border border-white/80 bg-white/70 p-6 shadow-[0_24px_80px_rgba(78,55,37,0.10)] backdrop-blur sm:p-8">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-[#f3ece4] px-4 py-2 text-sm font-bold text-[#8b6548]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8b6548]" />
              مرحلة الإطلاق النهائي
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight text-stone-950 sm:text-6xl">
              نظام إدارة متجر جاهز لتجربة يومية سلسة
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
              واجهات عربية لطيفة لإدارة المنتجات، المخازن، الطلبات، التوصيل، الفواتير، وتجربة التسوق للزبون والمسوق.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                className="rounded-full bg-[#8b6548] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#8b6548]/20 transition hover:bg-[#77533a]"
                href="/login"
              >
                دخول النظام
              </a>
              <a
                className="rounded-full border border-[#e3d8cc] bg-white px-6 py-3 text-sm font-bold text-stone-800 transition hover:border-[#8b6548] hover:text-[#8b6548]"
                href="/customer/home"
              >
                تجربة المتجر
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/90 bg-white/80 p-4 shadow-[0_24px_80px_rgba(78,55,37,0.10)] backdrop-blur sm:p-6">
            <div className="rounded-[1.5rem] bg-[#f8f4ef] p-5">
              <p className="text-sm font-bold text-[#8b6548]">حالة النظام</p>
              <h2 className="mt-2 text-2xl font-black text-stone-950">
                جاهز لفحص الإنتاج النهائي
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              {readiness.map((item) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-2xl border border-[#eee4da] bg-white px-4 py-4"
                  key={item.label}
                >
                  <span className="text-sm font-semibold text-stone-600">{item.label}</span>
                  <span className="rounded-full bg-[#f3ece4] px-3 py-1.5 text-sm font-bold text-[#8b6548]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[1.5rem] bg-[#fff7ed] p-4 text-sm font-semibold leading-7 text-[#8b6548]">
              التصميم المعتمد: بسيط، فاتح، ودافئ، مع انحناءات لطيفة وتجربة استخدام هادئة مناسبة للمتاجر.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
