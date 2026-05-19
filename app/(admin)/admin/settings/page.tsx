import { MapPinned, Settings, SlidersHorizontal } from "lucide-react";
import { SettingsForms } from "@/components/admin/AdminManagementForms";
import { getAdminSettings, groupedZonesByCity } from "@/lib/admin/management";
import { formatMoney, formatNumber } from "@/lib/admin/format";

export default async function AdminSettingsPage() {
  const data = await getAdminSettings();
  const zonesByCity = groupedZonesByCity(data.zones);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
          <Settings size={19} />
          الإعدادات
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">المدن والحالات</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
          اضبط المدن والمناطق وحالات الطلب التي تظهر لفريق العمل.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <SettingsForms cities={data.cities} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <MapPinned className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">المدن والمناطق</h3>
          </div>
          <div className="space-y-3">
            {data.cities.map((city) => (
              <div className="rounded-lg bg-slate-50 p-4" key={city.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">{city.name_ar}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{city.name_en}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                    {formatNumber(zonesByCity.get(city.id)?.length || 0)} منطقة
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(zonesByCity.get(city.id) || []).map((zone) => (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-100" key={zone.id}>
                      {zone.name_ar} · {formatMoney(zone.delivery_fee)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {!data.cities.length ? <EmptyText text="لا توجد مدن بعد." /> : null}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal className="text-emerald-600" size={20} />
            <h3 className="text-sm font-black text-slate-950">حالات الطلب</h3>
          </div>
          <div className="space-y-3">
            {data.statuses.map((status) => (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3" key={status.id}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
                  <p className="text-sm font-black text-slate-900">{status.name}</p>
                </div>
                <p className="text-xs font-black text-slate-500">{status.sort_order}</p>
              </div>
            ))}
            {!data.statuses.length ? <EmptyText text="لا توجد حالات مخصصة." /> : null}
          </div>
        </article>
      </section>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">{text}</div>;
}
