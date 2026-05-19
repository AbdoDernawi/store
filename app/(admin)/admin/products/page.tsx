import {
  Boxes,
  Image as ImageIcon,
  PackagePlus,
  Search,
  Tags,
} from "lucide-react";
import { ProductCreateForm } from "@/components/admin/AdminManagementForms";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAdminProducts } from "@/lib/admin/management";
import { formatMoney, formatNumber } from "@/lib/admin/format";

type ProductsPageProps = {
  searchParams?: {
    q?: string;
  };
};

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const { categories, products } = await getAdminProducts(searchParams?.q);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
              <PackagePlus size={19} />
              المنتجات
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">كتالوج المتجر</h2>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
              أضف المنتجات والخيارات والأسعار والصور من مكان واحد.
            </p>
          </div>

          <form className="relative w-full max-w-sm" method="get">
            <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 pr-11 text-sm font-bold outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              defaultValue={searchParams?.q || ""}
              name="q"
              placeholder="ابحث باسم المنتج"
            />
          </form>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon className="text-emerald-600" size={20} />
          <h3 className="text-sm font-black text-slate-950">إضافة منتج</h3>
        </div>
        <ProductCreateForm categories={categories} />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {products.map((product) => (
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5" key={product.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-slate-950">{product.name_ar}</h3>
                <p className="mt-1 truncate text-sm font-bold text-slate-500">{product.name_en}</p>
              </div>
              <StatusBadge status={product.is_active ? "delivered" : "cancelled"}>
                {product.is_active ? "نشط" : "متوقف"}
              </StatusBadge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <SoftValue label="للزبون" value={formatMoney(product.customer_price)} />
              <SoftValue label="للمسوق" value={formatMoney(product.marketer_price)} />
              <SoftValue label="التكلفة" value={formatMoney(product.cost_price)} />
              <SoftValue label="العمولة" value={formatMoney(product.marketer_commission)} />
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
              <span className="flex items-center gap-1">
                <Tags size={14} />
                {product.categories?.name_ar || "بدون قسم"}
              </span>
              <span className="flex items-center gap-1">
                <Boxes size={14} />
                {formatNumber(product.product_variants?.length || 0)} خيار
              </span>
            </div>
          </article>
        ))}

        {!products.length ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500 lg:col-span-3">
            لا توجد منتجات مطابقة.
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SoftValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
