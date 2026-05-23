import { MarketerProductShop } from "@/components/marketer/MarketerProductShop";
import { getMarketerProductsData } from "@/lib/marketer/data";

export default async function MarketerProductsPage() {
  const data = await getMarketerProductsData();

  return (
    <MarketerProductShop
      categories={data.categories}
      cities={data.cities}
      customers={data.customers}
      products={data.products}
      zones={data.zones}
    />
  );
}
