import { DeliveryHandoverPanel } from "@/components/delivery/DeliveryHandoverPanel";
import { requireCurrentUser } from "@/lib/auth";
import { getDeliveryHandoverData } from "@/lib/delivery/data";

export default async function DeliveryHandoverPage() {
  const user = await requireCurrentUser();
  const data = await getDeliveryHandoverData(user);

  return <DeliveryHandoverPanel {...data} />;
}
