import { MarketerSettingsForm } from "@/components/marketer/MarketerSettingsForm";
import { requireCurrentUser } from "@/lib/auth";
import { getMarketerVirtualStore } from "@/lib/marketer/data";

export default async function MarketerSettingsPage() {
  const user = await requireCurrentUser();
  const store = await getMarketerVirtualStore(user);

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
        <p className="text-xs font-black text-emerald-700">إعدادات المتجر</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">هوية بسيطة وجميلة لمتجرك</h2>
      </section>

      <MarketerSettingsForm store={store} userName={user.fullName} />
    </div>
  );
}
