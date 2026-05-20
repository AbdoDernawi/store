import { DeliveryQrScanner } from "@/components/delivery/DeliveryQrScanner";

export default function DeliveryScanPage({
  searchParams,
}: {
  searchParams?: { code?: string };
}) {
  return <DeliveryQrScanner initialCode={searchParams?.code || ""} />;
}
