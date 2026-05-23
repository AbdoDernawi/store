import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpLeft,
  FileText,
  Heart,
  PackageSearch,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { formatMoney } from "@/lib/admin/format";
import { requireCurrentUser } from "@/lib/auth";
import { getCustomerHomeData, type CustomerCatalogProduct } from "@/lib/customer/data";

export default async function CustomerHomePage() {
  const user = await requireCurrentUser();
  const data = await getCustomerHomeData(user);
  const heroProduct = data.featuredProducts[0] || null;
  const heroImage = productImage(heroProduct);

  return (
    <div className="space-y-4" dir="rtl">
      <section className="overflow-hidden rounded-[2rem] border border-[#eee5db] bg-white p-3 shadow-[0_22px_70px_rgba(59,45,33,0.08)]">
        <Link
          className="flex h-[3.25rem] items-center gap-3 rounded-[1.15rem] border border-[#ece2d6] bg-[#fcfbf8] px-4 text-sm font-bold text-[#a89d93] transition hover:border-[#b58a63] hover:text-[#65584d]"
          href="/customer/products"
        >
          <Search size={18} />
          ابحث عن منتج
        </Link>

        <div className="relative mt-3 min-h-[220px] overflow-hidden rounded-[1.7rem] bg-[#f3eadf] ring-1 ring-[#eadccf]">
          <div className="absolute inset-y-0 left-0 w-[47%]">
            <HomeProductImage imageUrl={heroImage} name={heroProduct?.name_ar || "تشكيلة المتجر"} />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(243,234,223,0.04)_0%,rgba(243,234,223,0.96)_47%,rgba(243,234,223,1)_100%)]" />
          <div className="relative z-10 flex min-h-[220px] max-w-[64%] flex-col justify-center px-5 py-6 sm:max-w-[56%] sm:px-7">
            <p className="w-fit rounded-full bg-white/80 px-3 py-1 text-xs font-black text-[#8b6548] ring-1 ring-white">
              أهلًا {user.fullName}
            </p>
            <h2 className="mt-3 text-balance text-2xl font-black leading-8 text-[#29252b] sm:text-3xl sm:leading-10">
              تسوق بخفة من أحدث المنتجات
            </h2>
            <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-[#6f665e]">
              {heroProduct?.name_ar || "اكتشف المنتجات الجاهزة للطلب."}
            </p>
            <Link
              className="mt-4 inline-flex h-11 w-fit items-center justify-center rounded-full bg-[#8b6548] px-5 text-sm font-black text-white transition hover:bg-[#745238]"
              href="/customer/products"
            >
              تسوق الآن
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <QuickMetric href="/customer/orders" icon={ShoppingBag} label="طلباتي" value={data.ordersCount} />
        <QuickMetric href="/customer/orders" icon={Truck} label="قيد التوصيل" value={data.inDelivery} />
        <QuickMetric href="/customer/invoices" icon={FileText} label="فواتيري" value={null} />
      </section>

      {data.banners.length ? (
        <section className="flex gap-3 overflow-x-auto pb-1">
          {data.banners.map((banner) => (
            <Link
              className="relative block h-36 min-w-[82%] overflow-hidden rounded-[1.5rem] bg-[#f5efe6] ring-1 ring-[#eadccf] sm:min-w-[46%]"
              href={banner.link || "/customer/products"}
              key={banner.id}
            >
              <Image alt="عرض" className="object-cover" fill sizes="(min-width: 640px) 46vw, 82vw" src={banner.image_url} />
            </Link>
          ))}
        </section>
      ) : null}

      <section className="rounded-[1.7rem] border border-[#eee5db] bg-white p-4 shadow-sm shadow-[#4b3c2e]/5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-[#29252b]">الأقسام</h3>
          <Link className="text-xs font-black text-[#8b6548]" href="/customer/products">
            الكل
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {data.categories.length ? (
            data.categories.map((category) => (
              <Link className="w-20 shrink-0 text-center" href={`/customer/products?category=${category.id}`} key={category.id}>
                <span className="relative mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#f8f4ed] text-[#8b6548] ring-1 ring-[#eadccf]">
                  {category.image_url ? (
                    <Image alt="" className="object-cover" fill sizes="64px" src={category.image_url} />
                  ) : (
                    <ShoppingBag size={22} />
                  )}
                </span>
                <span className="mt-2 block truncate text-xs font-black text-[#534b45]">{category.name_ar}</span>
              </Link>
            ))
          ) : (
            <span className="text-sm font-bold text-[#8a7d72]">لا توجد أقسام حاليًا.</span>
          )}
        </div>
      </section>

      <ProductRow products={data.featuredProducts} title="أحدث المنتجات" />
      <ProductRow products={data.popularProducts} title="الأكثر طلبًا" />
    </div>
  );
}

function QuickMetric({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: typeof ShoppingBag;
  label: string;
  value: number | null;
}) {
  return (
    <Link
      className="rounded-[1.35rem] border border-[#eee5db] bg-white p-4 shadow-sm shadow-[#4b3c2e]/5 transition hover:bg-[#fbf7f1]"
      href={href}
    >
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#f5e9db] text-[#8b6548]">
        <Icon size={18} />
      </span>
      <p className="text-xs font-black text-[#9a8b7e]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#29252b]">
        {value === null ? <Heart size={22} /> : value.toLocaleString("ar-LY")}
      </p>
    </Link>
  );
}

function ProductRow({ products, title }: { products: CustomerCatalogProduct[]; title: string }) {
  return (
    <section className="rounded-[1.7rem] border border-[#eee5db] bg-white p-4 shadow-sm shadow-[#4b3c2e]/5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-[#29252b]">{title}</h3>
        <Link
          className="inline-flex items-center gap-1 rounded-full bg-[#f8f4ed] px-3 py-2 text-xs font-black text-[#8b6548] ring-1 ring-[#eadccf]"
          href="/customer/products"
        >
          المزيد
          <ArrowUpLeft size={14} />
        </Link>
      </div>

      {products.length ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {products.map((product) => (
            <Link
              className="w-[188px] shrink-0 overflow-hidden rounded-[1.5rem] bg-[#fbfaf7] ring-1 ring-[#eadfd3] transition hover:-translate-y-0.5 sm:w-[214px]"
              href="/customer/products"
              key={`${title}-${product.id}`}
            >
              <HomeProductImage imageUrl={productImage(product)} name={product.name_ar} />
              <div className="p-3">
                <p className="truncate text-xs font-black text-[#8b6548]">
                  {product.category_name || "منتج"}
                </p>
                <p className="mt-1 line-clamp-2 min-h-11 text-sm font-black leading-5 text-[#29252b]">
                  {product.name_ar}
                </p>
                <p className="mt-3 text-sm font-black text-[#29252b]">
                  {formatMoney(product.customer_price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.2rem] bg-[#faf7f2] p-5 text-sm font-bold text-[#8a7d72] ring-1 ring-[#efe4d8]">
          لا توجد منتجات متاحة الآن.
        </div>
      )}
    </section>
  );
}

function HomeProductImage({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  if (!imageUrl) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-[#f5e9db] text-[#8b6548]">
        <PackageSearch size={34} />
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#f5efe6]">
      <Image alt={name} className="object-cover" fill sizes="(min-width: 640px) 214px, 188px" src={imageUrl} />
    </div>
  );
}

function productImage(product: CustomerCatalogProduct | null) {
  return product?.images[0]?.large || product?.images[0]?.medium || product?.images[0]?.thumb || null;
}
