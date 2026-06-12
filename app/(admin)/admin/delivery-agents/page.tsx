import { HandCoins, PackageCheck, RefreshCcw, Truck, UserRoundCheck } from "lucide-react";
import { HandoverConfirmButton } from "@/components/admin/AdminManagementForms";
import { getAdminDeliveryAgents } from "@/lib/admin/management";
import { formatDate, formatMoney, formatNumber, orderStatusLabels, paymentMethodLabels, statusTone } from "@/lib/admin/format";

export default async function AdminDeliveryAgentsPage() {
  const { agents } = await getAdminDeliveryAgents();

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
          <Truck size={19} />
          مندوبي التوصيل
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">العهد والطلبات مع كل مندوب</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
          راقب الطلبات النشطة، مبالغ الكاش، والعهد المعلقة حتى يتم تسليمها للخزنة.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {agents.map((agent) => (
          <article className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5" key={agent.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-black text-slate-950">{agent.full_name}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{agent.phone}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-black ring-1 ${
                  agent.is_active
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                    : "bg-slate-50 text-slate-500 ring-slate-100"
                }`}
              >
                {agent.is_active ? "نشط" : "موقوف"}
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <MetricCard icon={PackageCheck} label="طلبات قيد التوصيل" value={formatNumber(agent.activeOrders)} />
              <MetricCard icon={HandCoins} label="عهدة كاش حالية" value={formatMoney(agent.activeCashCustody)} />
              <MetricCard icon={UserRoundCheck} label="كاش مكتمل ينتظر التسليم" value={formatMoney(agent.completedCashCustody)} />
              <MetricCard icon={RefreshCcw} label="طلبات راجعة" value={formatNumber(agent.returnOrders)} />
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-black text-slate-950">العهد المعلقة</h3>
              <div className="mt-3 space-y-2">
                {agent.pendingHandovers.map((handover) => (
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50/70 p-3" key={handover.id}>
                    <div>
                      <p className="text-sm font-black text-emerald-800">{formatMoney(handover.total_amount)}</p>
                      <p className="mt-1 text-xs font-bold text-emerald-700">
                        {handover.type === "return_goods" ? "مرتجعات" : "كاش"} · {formatNumber(handover.order_ids?.length || 0)} طلب
                      </p>
                    </div>
                    <HandoverConfirmButton handoverId={handover.id} />
                  </div>
                ))}
                {!agent.pendingHandovers.length ? (
                  <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">لا توجد عهد معلقة لهذا المندوب.</div>
                ) : null}
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-black text-slate-950">آخر الطلبات</h3>
              <div className="mt-3 space-y-2">
                {agent.orders.map((order) => (
                  <div className="rounded-2xl bg-slate-50 p-3" key={order.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">#{order.order_number || "-"}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{order.customer_name}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1.5 text-xs font-black ring-1 ${statusTone(order.status)}`}>
                        {orderStatusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                      <span>{paymentMethodLabels[order.payment_method] || order.payment_method}</span>
                      <span>{formatMoney(order.total)}</span>
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                  </div>
                ))}
                {!agent.orders.length ? (
                  <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">لا توجد طلبات مسندة بعد.</div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </section>

      {!agents.length ? <div className="rounded-[1.35rem] bg-white p-5 text-sm font-bold text-slate-500">لا يوجد مندوبي توصيل بعد.</div> : null}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof HandCoins;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-emerald-600">
        <Icon size={17} />
        <span className="text-xs font-black text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}
