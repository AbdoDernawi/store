import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DeliveryChatThread } from "@/components/delivery/DeliveryChatThread";
import { getDeliveryOrderDetails } from "@/lib/delivery/data";
import { notFound } from "next/navigation";

export default async function DeliveryOrderChatPage({
  params,
}: {
  params: { id: string };
}) {
  const details = await getDeliveryOrderDetails(params.id);

  if (!details) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-teal-50 hover:text-teal-700"
        href={`/delivery/orders/${params.id}`}
      >
        <ArrowRight size={15} />
        تفاصيل الطلب
      </Link>
      <DeliveryChatThread orderId={params.id} />
    </div>
  );
}
