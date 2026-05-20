import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { MarketerChatThread } from "@/components/marketer/MarketerChatThread";
import { orderStatusLabels } from "@/lib/admin/format";
import { getMarketerOrderDetails } from "@/lib/marketer/data";

export default async function MarketerOrderChatPage({
  params,
}: {
  params: { id: string };
}) {
  const details = await getMarketerOrderDetails(params.id);

  if (!details) {
    notFound();
  }

  if (details.order.status !== "out_for_delivery") {
    return (
      <div className="space-y-4">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
          href={`/marketer/orders/${details.order.id}`}
        >
          <ArrowRight size={17} />
          العودة للطلب
        </Link>

        <section className="rounded-lg bg-white p-6 text-center shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <LockKeyhole size={22} />
          </div>
          <h2 className="mt-3 text-lg font-black text-slate-950">المحادثة غير مفتوحة الآن</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
            تفتح المحادثة عندما يصبح الطلب قيد التوصيل. الحالة الحالية:
            {" "}
            {orderStatusLabels[details.order.status] || details.order.status}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
        href={`/marketer/orders/${details.order.id}`}
      >
        <ArrowRight size={17} />
        العودة للطلب
      </Link>

      <MarketerChatThread orderId={details.order.id} />
    </div>
  );
}
