import { CustomerAccountPanel } from "@/components/customer/CustomerAccountPanel";
import { requireCurrentUser } from "@/lib/auth";
import { getCustomerLocationsAndAddresses } from "@/lib/customer/data";

export default async function CustomerAccountPage() {
  const user = await requireCurrentUser();
  const data = await getCustomerLocationsAndAddresses();

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-white p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
        <p className="text-xs font-black text-emerald-700">حسابي</p>
        <h2 className="mt-2 text-2xl font-black leading-9 text-slate-950">{user.fullName}</h2>
        <p className="mt-1 text-sm font-bold text-slate-500">{user.phone}</p>
      </section>
      <CustomerAccountPanel {...data} phone={user.phone} userName={user.fullName} />
    </div>
  );
}
