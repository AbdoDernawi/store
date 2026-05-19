"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Send,
  Shuffle,
  Upload,
} from "lucide-react";
import type {
  AdminCategory,
  AdminCity,
  AdminProductVariant,
  AdminSupplier,
  AdminWarehouse,
} from "@/lib/admin/management";

type ActionState = {
  tone: "idle" | "success" | "error";
  message: string;
};

type UploadedImage = {
  thumb: string;
  medium: string;
  large: string;
};

const inputClass =
  "h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50";
const textareaClass =
  "min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50";

function useJsonAction(defaultMessage: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ActionState>({
    tone: "idle",
    message: defaultMessage,
  });

  async function run(endpoint: string, payload: Record<string, unknown>, success: string) {
    setState({ tone: "idle", message: "جاري الحفظ..." });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر تنفيذ العملية." });
      return false;
    }

    setState({ tone: "success", message: success });
    startTransition(() => router.refresh());
    return true;
  }

  return { isPending, run, state, setState };
}

function FieldMessage({ state }: { state: ActionState }) {
  return (
    <div
      className={`rounded-lg px-4 py-3 text-sm font-black ${
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

export function ProductCreateForm({ categories }: { categories: AdminCategory[] }) {
  const { isPending, run, setState, state } = useJsonAction("املأ بيانات المنتج ثم احفظه.");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File) {
    setUploading(true);
    setState({ tone: "idle", message: "جاري تجهيز الصورة..." });
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch("/api/images/process", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json().catch(() => ({}))) as UploadedImage & { error?: string };
    setUploading(false);

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر رفع الصورة." });
      return;
    }

    setImages((current) => [...current, { thumb: data.thumb, medium: data.medium, large: data.large }]);
    setState({ tone: "success", message: "تم تجهيز الصورة بثلاثة أحجام WebP." });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const variants = parseVariants(String(form.get("variants") || ""));
    const discountValue = Number(form.get("discount_value") || 0);

    await run(
      "/api/admin/products",
      {
        category_id: String(form.get("category_id") || "") || null,
        name_ar: String(form.get("name_ar") || ""),
        name_en: String(form.get("name_en") || ""),
        description_ar: String(form.get("description_ar") || ""),
        description_en: String(form.get("description_en") || ""),
        images,
        cost_price: Number(form.get("cost_price") || 0),
        customer_price: Number(form.get("customer_price") || 0),
        marketer_price: Number(form.get("marketer_price") || 0),
        marketer_commission: Number(form.get("marketer_commission") || 0),
        low_stock_threshold: Number(form.get("low_stock_threshold") || 0),
        variants,
        discount:
          discountValue > 0
            ? {
                name: String(form.get("discount_name") || "تخفيض تلقائي"),
                type: String(form.get("discount_type") || "percentage"),
                value: discountValue,
                applies_to: String(form.get("applies_to") || "all"),
                auto_apply: form.get("auto_apply") === "on",
              }
            : undefined,
      },
      "تم حفظ المنتج وإضافة خياراته.",
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2">
        <input className={inputClass} name="name_ar" placeholder="اسم المنتج بالعربية" required />
        <input className={inputClass} name="name_en" placeholder="اسم المنتج بالإنجليزية" />
        <select className={inputClass} name="category_id">
          <option value="">بدون قسم</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name_ar}
            </option>
          ))}
        </select>
        <input className={inputClass} min="0" name="low_stock_threshold" placeholder="حد التنبيه" type="number" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <textarea className={textareaClass} name="description_ar" placeholder="وصف عربي" />
        <textarea className={textareaClass} name="description_en" placeholder="وصف إنجليزي" />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <input className={inputClass} min="0" name="cost_price" placeholder="سعر التكلفة" step="0.01" type="number" />
        <input className={inputClass} min="0" name="customer_price" placeholder="سعر الزبون" step="0.01" type="number" />
        <input className={inputClass} min="0" name="marketer_price" placeholder="سعر المسوق" step="0.01" type="number" />
        <input className={inputClass} min="0" name="marketer_commission" placeholder="عمولة المسوق" step="0.01" type="number" />
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-6 text-center text-sm font-black text-emerald-700">
        {uploading ? <Loader2 className="mb-2 animate-spin" size={22} /> : <ImagePlus className="mb-2" size={22} />}
        رفع صورة المنتج
        <input
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadImage(file);
          }}
          type="file"
        />
      </label>

      {images.length ? (
        <div className="flex flex-wrap gap-2">
          {images.map((image) => (
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-100" key={image.thumb}>
              صورة WebP جاهزة
            </span>
          ))}
        </div>
      ) : null}

      <textarea
        className={textareaClass}
        name="variants"
        placeholder="خيارات المنتج: لون,مقاس,نوع,فرق سعر,رابط صورة - كل خيار في سطر"
      />

      <div className="grid gap-3 md:grid-cols-5">
        <input className={inputClass} name="discount_name" placeholder="اسم التخفيض" />
        <select className={inputClass} name="discount_type">
          <option value="percentage">نسبة</option>
          <option value="fixed">قيمة ثابتة</option>
        </select>
        <input className={inputClass} min="0" name="discount_value" placeholder="قيمة التخفيض" step="0.01" type="number" />
        <select className={inputClass} name="applies_to">
          <option value="all">الجميع</option>
          <option value="customer_only">الزبون فقط</option>
          <option value="marketer_only">المسوق فقط</option>
        </select>
        <label className="flex h-11 items-center justify-center gap-2 rounded-full bg-slate-50 px-4 text-sm font-black text-slate-600 ring-1 ring-slate-100">
          <input name="auto_apply" type="checkbox" />
          تلقائي
        </label>
      </div>

      <FieldMessage state={state} />
      <SubmitButton disabled={isPending || uploading} icon={Save} label="حفظ المنتج" />
    </form>
  );
}

export function WarehouseTools({
  cities,
  variants,
  warehouses,
}: {
  cities: AdminCity[];
  variants: AdminProductVariant[];
  warehouses: AdminWarehouse[];
}) {
  const { isPending, run, state } = useJsonAction("اختر العملية المناسبة للمخزون.");

  async function submitAdjust(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      "/api/admin/warehouses/adjust",
      {
        warehouse_id: String(form.get("warehouse_id") || ""),
        product_variant_id: String(form.get("product_variant_id") || ""),
        delta: Number(form.get("delta") || 0),
        note: String(form.get("note") || ""),
      },
      "تم تحديث المخزون.",
    );
  }

  async function submitTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      "/api/warehouse/transfer",
      {
        source_warehouse_id: String(form.get("source_warehouse_id") || ""),
        target_warehouse_id: String(form.get("target_warehouse_id") || ""),
        product_variant_id: String(form.get("product_variant_id") || ""),
        quantity: Number(form.get("quantity") || 0),
        note: String(form.get("note") || ""),
      },
      "تم نقل الكمية بين المخازن.",
    );
  }

  async function submitPriority(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const warehouseIds = String(form.get("warehouse_ids") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    await run(
      "/api/admin/warehouses/priorities",
      {
        city_id: String(form.get("city_id") || ""),
        warehouse_ids: warehouseIds,
      },
      "تم حفظ ترتيب الأولوية.",
    );
  }

  return (
    <div className="space-y-4">
      <form className="grid gap-3 lg:grid-cols-[1fr_1fr_0.65fr_1fr_auto]" onSubmit={submitAdjust}>
        <WarehouseSelect warehouses={warehouses} />
        <VariantSelect variants={variants} />
        <input className={inputClass} name="delta" placeholder="+ أو -" type="number" />
        <input className={inputClass} name="note" placeholder="ملاحظة" />
        <SubmitButton disabled={isPending} icon={Plus} label="تعديل" />
      </form>

      <form className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_0.65fr_1fr_auto]" onSubmit={submitTransfer}>
        <WarehouseSelect name="source_warehouse_id" placeholder="المخزن المصدر" warehouses={warehouses} />
        <WarehouseSelect name="target_warehouse_id" placeholder="المخزن الوجهة" warehouses={warehouses} />
        <VariantSelect variants={variants} />
        <input className={inputClass} min="1" name="quantity" placeholder="الكمية" type="number" />
        <input className={inputClass} name="note" placeholder="ملاحظة النقل" />
        <SubmitButton disabled={isPending} icon={Shuffle} label="نقل" />
      </form>

      <form className="grid gap-3 lg:grid-cols-[1fr_2fr_auto]" onSubmit={submitPriority}>
        <select className={inputClass} name="city_id" required>
          <option value="">المدينة</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name_ar}
            </option>
          ))}
        </select>
        <input className={inputClass} name="warehouse_ids" placeholder="معرّفات المخازن بالترتيب مفصولة بفواصل" />
        <SubmitButton disabled={isPending} icon={Save} label="الأولوية" />
      </form>

      <FieldMessage state={state} />
    </div>
  );
}

export function SupplierTools({
  suppliers,
  variants,
  warehouses,
}: {
  suppliers: AdminSupplier[];
  variants: AdminProductVariant[];
  warehouses: AdminWarehouse[];
}) {
  const { isPending, run, state } = useJsonAction("أضف مورداً أو سجل عملية شراء.");

  async function submitSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      "/api/admin/suppliers",
      {
        name: String(form.get("name") || ""),
        phone: String(form.get("phone") || ""),
        notes: String(form.get("notes") || ""),
      },
      "تم حفظ المورد.",
    );
  }

  async function submitPurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      "/api/admin/suppliers/purchase-orders",
      {
        supplier_id: String(form.get("supplier_id") || ""),
        warehouse_id: String(form.get("warehouse_id") || ""),
        payment_type: String(form.get("payment_type") || "immediate"),
        paid_amount: Number(form.get("paid_amount") || 0),
        due_date: String(form.get("due_date") || "") || null,
        items: [
          {
            product_variant_id: String(form.get("product_variant_id") || ""),
            quantity: Number(form.get("quantity") || 0),
            unit_cost: Number(form.get("unit_cost") || 0),
          },
        ],
      },
      "تم تسجيل الشراء وتحديث المخزون.",
    );
  }

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      "/api/admin/suppliers/payments",
      {
        supplier_id: String(form.get("supplier_id") || ""),
        amount: Number(form.get("amount") || 0),
        note: String(form.get("note") || ""),
      },
      "تم تسجيل دفعة المورد.",
    );
  }

  return (
    <div className="space-y-4">
      <form className="grid gap-3 md:grid-cols-[1fr_1fr_1.3fr_auto]" onSubmit={submitSupplier}>
        <input className={inputClass} name="name" placeholder="اسم المورد" />
        <input className={inputClass} name="phone" placeholder="رقم الهاتف" />
        <input className={inputClass} name="notes" placeholder="ملاحظات" />
        <SubmitButton disabled={isPending} icon={Plus} label="إضافة" />
      </form>

      <form className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_0.55fr_0.65fr_0.7fr_0.8fr_auto]" onSubmit={submitPurchase}>
        <SupplierSelect suppliers={suppliers} />
        <WarehouseSelect warehouses={warehouses} />
        <VariantSelect variants={variants} />
        <input className={inputClass} min="1" name="quantity" placeholder="كمية" type="number" />
        <input className={inputClass} min="0" name="unit_cost" placeholder="تكلفة" step="0.01" type="number" />
        <input className={inputClass} min="0" name="paid_amount" placeholder="مدفوع" step="0.01" type="number" />
        <select className={inputClass} name="payment_type">
          <option value="immediate">فوري</option>
          <option value="debt">دين</option>
          <option value="partial">جزئي</option>
        </select>
        <SubmitButton disabled={isPending} icon={Upload} label="شراء" />
      </form>

      <form className="grid gap-3 md:grid-cols-[1fr_0.8fr_1.4fr_auto]" onSubmit={submitPayment}>
        <SupplierSelect suppliers={suppliers} />
        <input className={inputClass} min="0" name="amount" placeholder="المبلغ" step="0.01" type="number" />
        <input className={inputClass} name="note" placeholder="ملاحظة الدفعة" />
        <SubmitButton disabled={isPending} icon={Send} label="دفعة" />
      </form>

      <FieldMessage state={state} />
    </div>
  );
}

export function UserCreateForm() {
  const { isPending, run, state } = useJsonAction("أنشئ حساباً لفريق العمل أو الزبائن.");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      "/api/admin/users",
      {
        fullName: String(form.get("fullName") || ""),
        phone: String(form.get("phone") || ""),
        password: String(form.get("password") || ""),
        role: String(form.get("role") || "customer"),
      },
      "تم إنشاء الحساب.",
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-4">
        <input className={inputClass} name="fullName" placeholder="الاسم الكامل" required />
        <input className={inputClass} name="phone" placeholder="رقم الهاتف" required />
        <input className={inputClass} minLength={8} name="password" placeholder="كلمة المرور" required type="password" />
        <select className={inputClass} name="role">
          <option value="marketer">مسوق</option>
          <option value="delivery">مندوب توصيل</option>
          <option value="customer">زبون</option>
          <option value="admin">مدير</option>
        </select>
      </div>
      <FieldMessage state={state} />
      <SubmitButton disabled={isPending} icon={Plus} label="إنشاء حساب" />
    </form>
  );
}

export function FinanceExpenseForm() {
  const { isPending, run, state } = useJsonAction("سجل مصروفاً جديداً في الخزنة.");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      "/api/admin/finance/expenses",
      {
        type: String(form.get("type") || ""),
        amount: Number(form.get("amount") || 0),
        note: String(form.get("note") || ""),
      },
      "تم تسجيل المصروف.",
    );
  }

  return (
    <form className="grid gap-3 md:grid-cols-[1fr_0.8fr_1.4fr_auto]" onSubmit={submit}>
      <input className={inputClass} name="type" placeholder="نوع المصروف" />
      <input className={inputClass} min="0" name="amount" placeholder="المبلغ" step="0.01" type="number" />
      <input className={inputClass} name="note" placeholder="ملاحظة" />
      <SubmitButton disabled={isPending} icon={Plus} label="تسجيل" />
      <div className="md:col-span-4">
        <FieldMessage state={state} />
      </div>
    </form>
  );
}

export function SettingsForms({ cities }: { cities: AdminCity[] }) {
  const { isPending, run, state } = useJsonAction("أضف مدينة أو منطقة أو حالة طلب.");

  async function submit(event: React.FormEvent<HTMLFormElement>, endpoint: string, payload: Record<string, unknown>, success: string) {
    event.preventDefault();
    await run(endpoint, payload, success);
  }

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          const form = new FormData(event.currentTarget);
          void submit(
            event,
            "/api/admin/settings/cities",
            {
              name_ar: String(form.get("name_ar") || ""),
              name_en: String(form.get("name_en") || ""),
            },
            "تمت إضافة المدينة.",
          );
        }}
      >
        <input className={inputClass} name="name_ar" placeholder="مدينة بالعربية" />
        <input className={inputClass} name="name_en" placeholder="مدينة بالإنجليزية" />
        <SubmitButton disabled={isPending} icon={Plus} label="مدينة" />
      </form>

      <form
        className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_0.75fr_auto]"
        onSubmit={(event) => {
          const form = new FormData(event.currentTarget);
          void submit(
            event,
            "/api/admin/settings/zones",
            {
              city_id: String(form.get("city_id") || ""),
              name_ar: String(form.get("name_ar") || ""),
              name_en: String(form.get("name_en") || ""),
              delivery_fee: Number(form.get("delivery_fee") || 0),
            },
            "تمت إضافة المنطقة.",
          );
        }}
      >
        <select className={inputClass} name="city_id">
          <option value="">المدينة</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name_ar}
            </option>
          ))}
        </select>
        <input className={inputClass} name="name_ar" placeholder="منطقة بالعربية" />
        <input className={inputClass} name="name_en" placeholder="منطقة بالإنجليزية" />
        <input className={inputClass} min="0" name="delivery_fee" placeholder="التوصيل" step="0.01" type="number" />
        <SubmitButton disabled={isPending} icon={Plus} label="منطقة" />
      </form>

      <form
        className="grid gap-3 md:grid-cols-[1fr_0.7fr_0.7fr_auto]"
        onSubmit={(event) => {
          const form = new FormData(event.currentTarget);
          void submit(
            event,
            "/api/admin/settings/statuses",
            {
              name: String(form.get("name") || ""),
              color: String(form.get("color") || "#10b981"),
              sort_order: Number(form.get("sort_order") || 0),
            },
            "تمت إضافة حالة الطلب.",
          );
        }}
      >
        <input className={inputClass} name="name" placeholder="اسم الحالة" />
        <input className={inputClass} name="color" type="color" />
        <input className={inputClass} name="sort_order" placeholder="الترتيب" type="number" />
        <SubmitButton disabled={isPending} icon={Plus} label="حالة" />
      </form>

      <FieldMessage state={state} />
    </div>
  );
}

export function BannerForm() {
  const { isPending, run, setState, state } = useJsonAction("أضف بنراً للصفحة الرئيسية.");
  const [imageUrl, setImageUrl] = useState("");

  async function uploadImage(file: File) {
    setState({ tone: "idle", message: "جاري تجهيز صورة البنر..." });
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch("/api/images/process", { method: "POST", body: formData });
    const data = (await response.json().catch(() => ({}))) as UploadedImage & { error?: string };

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر رفع صورة البنر." });
      return;
    }

    setImageUrl(data.large);
    setState({ tone: "success", message: "صورة البنر جاهزة." });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      "/api/admin/content/banners",
      {
        image_url: imageUrl,
        link: String(form.get("link") || ""),
        sort_order: Number(form.get("sort_order") || 0),
      },
      "تم حفظ البنر.",
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-[1fr_0.7fr_auto]">
        <input className={inputClass} name="link" placeholder="رابط اختياري" />
        <input className={inputClass} name="sort_order" placeholder="الترتيب" type="number" />
        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
          <ImagePlus size={17} />
          صورة
          <input
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadImage(file);
            }}
            type="file"
          />
        </label>
      </div>
      {imageUrl ? <p className="text-xs font-black text-emerald-700">تم اختيار صورة البنر.</p> : null}
      <FieldMessage state={state} />
      <SubmitButton disabled={isPending || !imageUrl} icon={Save} label="حفظ البنر" />
    </form>
  );
}

function SubmitButton({
  disabled,
  icon: Icon,
  label,
}: {
  disabled: boolean;
  icon: typeof Save;
  label: string;
}) {
  return (
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-black text-white shadow-sm shadow-emerald-950/10 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      disabled={disabled}
      type="submit"
    >
      <Icon size={17} />
      {label}
    </button>
  );
}

function WarehouseSelect({
  name = "warehouse_id",
  placeholder = "المخزن",
  warehouses,
}: {
  name?: string;
  placeholder?: string;
  warehouses: AdminWarehouse[];
}) {
  return (
    <select className={inputClass} name={name} required>
      <option value="">{placeholder}</option>
      {warehouses.map((warehouse) => (
        <option key={warehouse.id} value={warehouse.id}>
          {warehouse.name}
        </option>
      ))}
    </select>
  );
}

function VariantSelect({ variants }: { variants: AdminProductVariant[] }) {
  return (
    <select className={inputClass} name="product_variant_id" required>
      <option value="">المنتج / الخيار</option>
      {variants.map((variant) => (
        <option key={variant.id} value={variant.id}>
          {variantLabel(variant)}
        </option>
      ))}
    </select>
  );
}

function variantLabel(variant: AdminProductVariant) {
  const productName = variant.products?.name_ar || "منتج";
  const details = [variant.color, variant.size, variant.type].filter(Boolean).join(" / ");

  return details ? `${productName} - ${details}` : productName;
}

function SupplierSelect({ suppliers }: { suppliers: AdminSupplier[] }) {
  return (
    <select className={inputClass} name="supplier_id" required>
      <option value="">المورد</option>
      {suppliers.map((supplier) => (
        <option key={supplier.id} value={supplier.id}>
          {supplier.name}
        </option>
      ))}
    </select>
  );
}

function parseVariants(value: string): Array<Record<string, string | number | null>> {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [color, size, type, extraPrice, imageUrl] = line.split(",").map((part) => part.trim());

      return {
        color: color || null,
        size: size || null,
        type: type || null,
        extra_price: Number(extraPrice || 0),
        image_url: imageUrl || null,
      };
    });
}
