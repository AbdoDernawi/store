import { CustomerProductShop } from "@/components/customer/CustomerProductShop";
import { getCustomerProductsData } from "@/lib/customer/data";

export default async function CustomerProductsPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const data = await getCustomerProductsData();

  return <CustomerProductShop {...data} initialCategory={searchParams?.category || "all"} />;
}
