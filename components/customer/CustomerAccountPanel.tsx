"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MapPin, Save, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/admin/format";
import type { CustomerAddress, CustomerCity, CustomerZone } from "@/lib/customer/data";

type AddressForm = {
  address: string;
  city_id: string;
  id?: string;
  is_default: boolean;
  label: string;
  phone: string;
  recipient_name: string;
  zone_id: string;
};

type PanelState = {
  tone: "idle" | "success" | "error";
  message: string;
};

const inputClass =
  "h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50";
const textareaClass =
  "min-h-24 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50";

export function CustomerAccountPanel({
  addresses,
  cities,
  phone,
  userName,
  zones,
}: {
  addresses: CustomerAddress[];
  cities: CustomerCity[];
  phone: string;
  userName: string;
  zones: CustomerZone[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<AddressForm>(emptyAddress(userName, phone));
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<PanelState>({
    tone: "idle",
    message: "العناوين المحفوظة تجعل الطلب القادم أسرع.",
  });
  const cityZones = useMemo(() => zones.filter((zone) => zone.city_id === form.city_id), [form.city_id, zones]);

  function editAddress(address: CustomerAddress) {
    setForm({
      address: address.address,
      city_id: address.city_id,
      id: address.id,
      is_default: address.is_default,
      label: address.label,
      phone: address.phone,
      recipient_name: address.recipient_name,
      zone_id: address.zone_id,
    });
  }

  async function saveAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setState({ tone: "idle", message: "جاري حفظ العنوان..." });

    const response = await fetch("/api/customer/addresses", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setSubmitting(false);

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر حفظ العنوان." });
      return;
    }

    setForm(emptyAddress(userName, phone));
    setState({ tone: "success", message: "تم حفظ العنوان." });
    router.refresh();
  }

  async function deleteAddress(id: string) {
    setState({ tone: "idle", message: "جاري حذف العنوان..." });
    const response = await fetch("/api/customer/addresses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر حذف العنوان." });
      return;
    }

    setState({ tone: "success", message: "تم حذف العنوان." });
    router.refresh();
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setState({ tone: "idle", message: "جاري تغيير كلمة المرور..." });

    const response = await fetch("/api/customer/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setSubmitting(false);

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر تغيير كلمة المرور." });
      return;
    }

    setPassword("");
    setState({ tone: "success", message: "تم تغيير كلمة المرور." });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
      <section className="space-y-4">
        <article className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <MapPin size={18} />
            </span>
            <h3 className="text-base font-black text-slate-950">العناوين</h3>
          </div>
          <div className="space-y-3">
            {addresses.length ? (
              addresses.map((address) => (
                <div className="rounded-[1rem] bg-slate-50 p-3 ring-1 ring-slate-100" key={address.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        {address.label} {address.is_default ? "· افتراضي" : ""}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {address.zone_name} · {formatMoney(address.delivery_fee)}
                      </p>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{address.address}</p>
                    </div>
                    <button
                      aria-label="حذف العنوان"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                      onClick={() => void deleteAddress(address.id)}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <button
                    className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-full bg-white px-4 text-xs font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => editAddress(address)}
                    type="button"
                  >
                    تعديل
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] bg-slate-50 p-4 text-sm font-bold text-slate-500">
                لا توجد عناوين محفوظة.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <form className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5" onSubmit={saveAddress}>
          <h3 className="mb-4 text-base font-black text-slate-950">{form.id ? "تعديل عنوان" : "عنوان جديد"}</h3>
          <div className="space-y-3">
            <input className={inputClass} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="اسم العنوان" value={form.label} />
            <input className={inputClass} onChange={(event) => setForm((current) => ({ ...current, recipient_name: event.target.value }))} placeholder="اسم المستلم" value={form.recipient_name} />
            <input className={inputClass} inputMode="tel" onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="الهاتف" value={form.phone} />
            <textarea className={textareaClass} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="العنوان" value={form.address} />
            <select
              className={inputClass}
              onChange={(event) => setForm((current) => ({ ...current, city_id: event.target.value, zone_id: "" }))}
              value={form.city_id}
            >
              <option value="">المدينة</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name_ar}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              disabled={!form.city_id}
              onChange={(event) => setForm((current) => ({ ...current, zone_id: event.target.value }))}
              value={form.zone_id}
            >
              <option value="">المنطقة</option>
              {cityZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name_ar}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-full bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-100">
              <input
                checked={form.is_default}
                onChange={(event) => setForm((current) => ({ ...current, is_default: event.target.checked }))}
                type="checkbox"
              />
              عنوان افتراضي
            </label>
          </div>
          <button
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={submitting}
            type="submit"
          >
            {submitting ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
            حفظ العنوان
          </button>
        </form>

        <form className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5" onSubmit={updatePassword}>
          <h3 className="mb-4 text-base font-black text-slate-950">كلمة المرور</h3>
          <input
            autoComplete="new-password"
            className={inputClass}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="كلمة مرور جديدة"
            type="password"
            value={password}
          />
          <button
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-sky-600 px-5 text-sm font-black text-white transition hover:bg-sky-700 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={submitting || password.length < 8}
            type="submit"
          >
            <CheckCircle2 size={17} />
            تغيير
          </button>
        </form>

        <div
          className={`rounded-[1rem] px-4 py-3 text-sm font-black ${
            state.tone === "success"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
              : state.tone === "error"
                ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                : "bg-slate-50 text-slate-500 ring-1 ring-slate-100"
          }`}
        >
          {state.message}
        </div>
      </section>
    </div>
  );
}

function emptyAddress(userName: string, phone: string): AddressForm {
  return {
    address: "",
    city_id: "",
    is_default: false,
    label: "البيت",
    phone,
    recipient_name: userName,
    zone_id: "",
  };
}
