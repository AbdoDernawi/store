import { MarketerProductShop } from "@/components/marketer/MarketerProductShop";
import { getMarketerProductsData } from "@/lib/marketer/data";

export default async function MarketerProductsPage() {
  const data = await getMarketerProductsData();

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
        <p className="text-xs font-black text-emerald-700">كتالوج المسوّق</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">اختيار المنتجات وإنشاء طلب</h2>
      </section>

      <MarketerProductShop
        categories={data.categories}
        cities={data.cities}
        customers={data.customers}
        products={data.products}
        zones={data.zones}
      />
    </div>
  );
}
