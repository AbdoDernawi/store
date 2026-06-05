"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Cropper, { ReactCropperElement } from "react-cropper";
import { ImagePlus, Loader2, Palette, Save, Store, Upload } from "lucide-react";
import type { MarketerVirtualStore } from "@/lib/marketer/data";

type ActionState = {
  tone: "idle" | "success" | "error";
  message: string;
};

const inputClass =
  "h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50";
const textareaClass =
  "min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50";

export function MarketerSettingsForm({
  store,
  userName,
}: {
  store: MarketerVirtualStore | null;
  userName: string;
}) {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [logoUrl, setLogoUrl] = useState(store?.logo_url || "");
  const [previewUrl, setPreviewUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState(store?.primary_color || "#10b981");
  const [secondaryColor, setSecondaryColor] = useState(store?.secondary_color || "#f59e0b");
  const [invoiceTemplate, setInvoiceTemplate] = useState(store?.invoice_template || "modern");
  const [state, setState] = useState<ActionState>({
    tone: "idle",
    message: "اضبط هوية متجرك الافتراضي لتظهر على الفواتير.",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function uploadLogo() {
    const cropper = cropperRef.current?.cropper;

    if (!cropper) {
      setState({ tone: "error", message: "اختر صورة الشعار أولاً." });
      return;
    }

    setUploading(true);
    setState({ tone: "idle", message: "جاري تجهيز الشعار..." });

    const canvas = cropper.getCroppedCanvas({
      fillColor: "#ffffff",
      height: 600,
      imageSmoothingQuality: "high",
      width: 600,
    });
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.88);
    });

    if (!blob) {
      setUploading(false);
      setState({ tone: "error", message: "تعذر قص الشعار." });
      return;
    }

    const formData = new FormData();
    formData.append("image", new File([blob], "store-logo.webp", { type: "image/webp" }));

    const response = await fetch("/api/uploads/store-logo", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      logo_url?: string;
    };

    setUploading(false);

    if (!response.ok || data.error || !data.logo_url) {
      setState({ tone: "error", message: data.error || "تعذر رفع الشعار." });
      return;
    }

    setLogoUrl(data.logo_url);
    setState({ tone: "success", message: "تم رفع الشعار. لا تنس حفظ الإعدادات." });
  }

  async function submitSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setState({ tone: "idle", message: "جاري حفظ المتجر..." });

    const response = await fetch("/api/marketer/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: String(form.get("address") || ""),
        contact_phone: String(form.get("contact_phone") || ""),
        invoice_note: String(form.get("invoice_note") || ""),
        invoice_template: invoiceTemplate,
        logo_url: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        store_name: String(form.get("store_name") || ""),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    setSaving(false);

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر حفظ الإعدادات." });
      return;
    }

    setState({ tone: "success", message: "تم حفظ إعدادات المتجر الافتراضي." });
  }

  return (
    <form className="grid gap-4 lg:grid-cols-[0.78fr_1fr]" onSubmit={submitSettings}>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <Store size={18} />
          </span>
          <div>
            <p className="text-xs font-black text-emerald-700">واجهة المتجر</p>
            <h3 className="text-base font-black text-slate-950">الشعار والألوان</h3>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
            {logoUrl ? (
              <Image alt="شعار المتجر" className="object-cover" fill sizes="80px" src={logoUrl} />
            ) : (
              <div className="flex h-full items-center justify-center text-emerald-700">
                <Store size={26} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">
              {store?.store_name || `متجر ${userName}`}
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              سيظهر الشعار في واجهة المتجر والفاتورة.
            </p>
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-black text-emerald-700">
          <ImagePlus size={18} />
          اختيار شعار جديد
          <input
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                setPreviewUrl(URL.createObjectURL(file));
              }
            }}
            type="file"
          />
        </label>

        {previewUrl ? (
          <div className="mt-4 space-y-3">
            <div className="overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
              <Cropper
                aspectRatio={1}
                background={false}
                guides={false}
                ref={cropperRef}
                src={previewUrl}
                style={{ height: 260, width: "100%" }}
                viewMode={1}
              />
            </div>
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
              disabled={uploading}
              onClick={uploadLogo}
              type="button"
            >
              {uploading ? <Loader2 className="animate-spin" size={17} /> : <Upload size={17} />}
              رفع الشعار المقصوص
            </button>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ColorField
            label="اللون الأساسي"
            onChange={setPrimaryColor}
            value={primaryColor}
          />
          <ColorField
            label="اللون المساند"
            onChange={setSecondaryColor}
            value={secondaryColor}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-700">
            <Palette size={18} />
          </span>
          <h3 className="text-base font-black text-slate-950">بيانات المتجر</h3>
        </div>

        <div className="space-y-3">
          <input
            className={inputClass}
            defaultValue={store?.store_name || ""}
            name="store_name"
            placeholder="اسم المتجر الافتراضي"
          />
          <input
            className={inputClass}
            defaultValue={store?.contact_phone || ""}
            name="contact_phone"
            placeholder="رقم التواصل"
          />
          <input
            className={inputClass}
            defaultValue={store?.address || ""}
            name="address"
            placeholder="عنوان المتجر"
          />
          <textarea
            className={textareaClass}
            defaultValue={store?.invoice_note || ""}
            name="invoice_note"
            placeholder="ملاحظة تظهر في الفاتورة"
          />
        </div>

        <div className="mt-3">
          <InvoiceTemplateField onChange={setInvoiceTemplate} value={invoiceTemplate} />
        </div>

        <Message state={state} />

        <button
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
          disabled={saving || uploading}
          type="submit"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          حفظ الإعدادات
        </button>
      </section>
    </form>
  );
}

function ColorField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <input
        aria-label={label}
        className="h-9 w-12 cursor-pointer rounded-full border-0 bg-transparent p-0"
        onChange={(event) => onChange(event.target.value)}
        type="color"
        value={value}
      />
    </label>
  );
}

function InvoiceTemplateField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const templates = [
    { label: "مودرن", value: "modern" },
    { label: "كلاسيك", value: "classic" },
    { label: "ناعم", value: "soft" },
  ];

  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="mb-2 text-xs font-black text-slate-600">شكل الفاتورة</p>
      <div className="flex flex-wrap gap-2">
        {templates.map((template) => (
          <button
            aria-pressed={value === template.value}
            className={`h-9 rounded-full px-4 text-xs font-black transition ${
              value === template.value
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/10"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-emerald-700"
            }`}
            key={template.value}
            onClick={() => onChange(template.value)}
            type="button"
          >
            {template.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Message({ state }: { state: ActionState }) {
  return (
    <div
      className={`mt-4 rounded-lg px-4 py-3 text-sm font-black ${
        state.tone === "success"
          ? "bg-emerald-50 text-emerald-700"
          : state.tone === "error"
            ? "bg-rose-50 text-rose-700"
            : "bg-slate-50 text-slate-500"
      }`}
    >
      {state.message}
    </div>
  );
}
