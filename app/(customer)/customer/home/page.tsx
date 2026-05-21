import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, FileText, PackageSearch, ShoppingBag, Truck } from "lucide-react";
import { formatMoney } from "@/lib/admin/format";
import { requireCurrentUser } from "@/lib/auth";
import { getCustomerHomeData, type CustomerCatalogProduct } from "@/lib/customer/data";

export default async function CustomerHomePage() {
  const user = await requireCurrentUser();
  const data = await getCustomerHomeData(user);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.5rem] bg-[#edf8f1] p-5 ring-1 ring-emerald-100">
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-xs font-black text-emerald-700">تسوق خفيف</p>
            <h2 className="mt-2 text-2xl font-black leading-9 text-slate-950 sm:text-3xl">
              منتجات واضحة وطلب سريع بدون تعقيد
            </h2>
          </div>
          <Link
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 text-sm font-black text-white shadow-sm shadow-emerald-950/10 transition hover:bg-emerald-700"
            href="/customer/products"
          >
            <PackageSearch size={18} />
            تصفح المنتجات
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={ShoppingBag} label="طلباتي" value={data.ordersCount.toLocaleString("ar-LY")} />
        <MetricCard icon={Truck} label="قيد التوصيل" value={data.inDelivery.toLocaleString("ar-LY")} />
        <MetricCard icon={FileText} label="الفواتير" value="أرشيفك" />
      </section>

      {data.banners.length ? (
        <section className="flex gap-3 overflow-x-auto pb-1">
          {data.banners.map((banner) => (
            <Link
              className="relative block h-36 min-w-[82%] overflow-hidden rounded-[1.35rem] bg-slate-100 ring-1 ring-slate-200 sm:min-w-[46%]"
              href={banner.link || "/customer/products"}
              key={banner.id}
            >
              <Image alt="عرض" className="object-cover" fill sizes="(min-width: 640px) 46vw, 82vw" src={banner.image_url} />
            </Link>
          ))}
        </section>
      ) : null}

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-slate-950">الأقسام</h3>
          <Link className="text-xs font-black text-emerald-700" href="/customer/products">
            الكل
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.categories.length ? (
            data.categories.map((category) => (
              <Link
                className="shrink-0 rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100 transition hover:bg-emerald-50 hover:text-emerald-700"
                href={`/customer/products?category=${category.id}`}
                key={category.id}
              >
                {category.name_ar}
              </Link>
            ))
          ) : (
            <span className="text-sm font-bold text-slate-500">لا توجد أقسام حالياً.</span>
          )}
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-slate-950">منتجات مميزة</h3>
          <Link
            className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100 transition hover:bg-emerald-50 hover:text-emerald-700"
            href="/customer/products"
          >
            المزيد
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.featuredProducts.length ? (
            data.featuredProducts.map((product) => <FeaturedProduct key={product.id} product={product} />)
          ) : (
            <div className="rounded-[1rem] bg-slate-50 p-4 text-sm font-bold text-slate-500 sm:col-span-2">
              لا توجد منتجات متاحة حالياً.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <Icon size={18} />
      </div>
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </article>
  );
}

function FeaturedProduct({ product }: { product: CustomerCatalogProduct }) {
  const imageUrl = product.images[0]?.medium || product.images[0]?.large || product.images[0]?.thumb || null;

  return (
    <Link className="block overflow-hidden rounded-[1.1rem] bg-slate-50 ring-1 ring-slate-100 transition hover:bg-emerald-50" href="/customer/products">
      <div className="relative aspect-[4/3] bg-emerald-50">
        {imageUrl ? (
          <Image alt={product.name_ar} className="object-cover" fill sizes="(min-width: 640px) 50vw, 100vw" src={imageUrl} />
        ) : (
          <div className="flex h-full items-center justify-center text-emerald-700">
            <PackageSearch size={30} />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-black leading-6 text-slate-950">{product.name_ar}</p>
        <p className="mt-2 text-sm font-black text-emerald-700">{formatMoney(product.customer_price)}</p>
      </div>
    </Link>
  );
}
