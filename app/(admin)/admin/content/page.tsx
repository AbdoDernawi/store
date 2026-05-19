import { Image as ImageIcon, LayoutGrid } from "lucide-react";
import { BannerForm } from "@/components/admin/AdminManagementForms";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminContent } from "@/lib/admin/management";

export default async function AdminContentPage() {
  const { banners } = await getAdminContent();

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
          <LayoutGrid size={19} />
          المحتوى
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">بنرات المتجر</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
          أضف صور العرض التي تظهر في واجهات الشراء.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <BannerForm />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {banners.map((banner) => (
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5" key={banner.id}>
            <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="h-full w-full object-cover" src={banner.image_url} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <StatusBadge status={banner.is_active ? "delivered" : "cancelled"}>
                {banner.is_active ? "نشط" : "متوقف"}
              </StatusBadge>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-100">
                ترتيب {banner.sort_order}
              </span>
            </div>
            {banner.link ? <p className="mt-3 truncate text-xs font-bold text-slate-500">{banner.link}</p> : null}
          </article>
        ))}
        {!banners.length ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500 lg:col-span-3">
            <ImageIcon className="mx-auto mb-3 text-slate-300" size={30} />
            لا توجد بنرات بعد.
          </div>
        ) : null}
      </section>
    </div>
  );
}
