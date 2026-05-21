import { CustomerProductShop } from "@/components/customer/CustomerProductShop";
import { getCustomerProductsData } from "@/lib/customer/data";

export default async function CustomerProductsPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const data = await getCustomerProductsData();

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-white p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
        <p className="text-xs font-black text-emerald-700">المنتجات</p>
        <h2 className="mt-2 text-2xl font-black leading-9 text-slate-950">اختيار واضح وسلة سريعة</h2>
      </section>
      <CustomerProductShop {...data} initialCategory={searchParams?.category || "all"} />
    </div>
  );
}
