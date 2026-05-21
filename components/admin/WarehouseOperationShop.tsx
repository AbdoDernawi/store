"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Edit3,
  Loader2,
  PackagePlus,
  Save,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import type { AdminCategory, AdminCity, AdminProductVariant, AdminWarehouse } from "@/lib/admin/management";
import { formatMoney, formatNumber } from "@/lib/admin/format";

type OperationType = "transfer" | "adjust_in" | "adjust_out";

type CartItem = {
  variantId: string;
  quantity: number;
};

type ProductGroup = {
  id: string;
  categoryId: string | null;
  nameAr: string;
  nameEn: string;
  images: Array<{ thumb?: string; medium?: string; large?: string }>;
  categoryName: string;
  costPrice: number;
  customerPrice: number;
  marketerPrice: number;
  marketerCommission: number;
  lowStockThreshold: number;
  isActive: boolean;
  variants: AdminProductVariant[];
};

type ActionState = {
  tone: "idle" | "success" | "error";
  message: string;
};

const operationOptions: Array<{ value: OperationType; label: string; hint: string }> = [
  { value: "transfer", label: "تحويل بين المخازن", hint: "اختر من المصدر ثم حول السلة إلى مخزن آخر" },
  { value: "adjust_in", label: "إضافة كمية", hint: "استلام أو زيادة مخزون لعدة منتجات" },
  { value: "adjust_out", label: "إنقاص كمية", hint: "تسوية أو إخراج مخزون من عدة منتجات" },
];

export function WarehouseOperationShop({
  categories,
  variants,
  warehouses,
}: {
  categories: AdminCategory[];
  variants: AdminProductVariant[];
  warehouses: AdminWarehouse[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.is_active);
  const firstWarehouseId = activeWarehouses[0]?.id || "";
  const secondWarehouseId = activeWarehouses.find((warehouse) => warehouse.id !== firstWarehouseId)?.id || "";
  const [operationType, setOperationType] = useState<OperationType>("transfer");
  const [sourceWarehouseId, setSourceWarehouseId] = useState(firstWarehouseId);
  const [targetWarehouseId, setTargetWarehouseId] = useState(secondWarehouseId);
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [query, setQuery] = useState("");
  const [colorFilter, setColorFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
  const [draftQuantityByVariant, setDraftQuantityByVariant] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState("");
  const [state, setState] = useState<ActionState>({
    tone: "idle",
    message: "اختر المنتجات كما لو كنت تجهز سلة متجر، ثم نفذ العملية دفعة واحدة.",
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const products = useMemo(() => groupProducts(variants), [variants]);
  const colorOptions = useMemo(() => uniqueValues(variants.map((variant) => variant.color)), [variants]);
  const sizeOptions = useMemo(() => uniqueValues(variants.map((variant) => variant.size)), [variants]);
  const selectedWarehouseId = operationType === "transfer" ? sourceWarehouseId : sourceWarehouseId;
  const selectedWarehouseName = warehouseName(activeWarehouses, selectedWarehouseId);
  const targetWarehouseName = warehouseName(activeWarehouses, targetWarehouseId);
  const selectedProduct = editingProductId ? products.find((product) => product.id === editingProductId) || null : null;

  const filteredProducts = products.filter((product) => {
    const search = query.trim().toLowerCase();
    const matchesCategory = activeCategoryId === "all" || product.categoryId === activeCategoryId;
    const matchesSearch =
      !search ||
      product.nameAr.toLowerCase().includes(search) ||
      product.nameEn.toLowerCase().includes(search) ||
      product.variants.some((variant) => [variant.color, variant.size, variant.type].filter(Boolean).join(" ").toLowerCase().includes(search));
    const matchesColor = colorFilter === "all" || product.variants.some((variant) => variant.color === colorFilter);
    const matchesSize = sizeFilter === "all" || product.variants.some((variant) => variant.size === sizeFilter);

    return matchesCategory && matchesSearch && matchesColor && matchesSize;
  });

  function selectedVariantFor(product: ProductGroup) {
    const preferredId = selectedVariantByProduct[product.id];
    const preferred = product.variants.find((variant) => variant.id === preferredId);

    return preferred || product.variants[0];
  }

  function quantityFor(variantId: string) {
    return Math.max(1, draftQuantityByVariant[variantId] || 1);
  }

  function setDraftQuantity(variant: AdminProductVariant, quantity: number) {
    const max = stockForVariant(variant, selectedWarehouseId).available;
    const next = operationType === "adjust_in" ? Math.max(1, quantity) : Math.min(Math.max(1, quantity), Math.max(1, max));
    setDraftQuantityByVariant((current) => ({ ...current, [variant.id]: next }));
  }

  function addToCart(product: ProductGroup) {
    const variant = selectedVariantFor(product);
    const stock = stockForVariant(variant, selectedWarehouseId);
    const quantity = quantityFor(variant.id);

    if (operationType !== "adjust_in" && stock.available <= 0) {
      setState({ tone: "error", message: "هذا الخيار غير متوفر في المخزن المصدر." });
      return;
    }

    if (operationType !== "adjust_in" && quantity > stock.available) {
      setState({ tone: "error", message: "الكمية المختارة أكبر من المتاح في المخزن المصدر." });
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.variantId === variant.id);
      if (existing) {
        return current.map((item) =>
          item.variantId === variant.id
            ? {
                ...item,
                quantity: operationType === "adjust_in"
                  ? item.quantity + quantity
                  : Math.min(item.quantity + quantity, stock.available),
              }
            : item,
        );
      }

      return [...current, { variantId: variant.id, quantity }];
    });
    setState({ tone: "success", message: "تمت إضافة المنتج إلى سلة العملية." });
  }

  function updateCartQuantity(variantId: string, quantity: number) {
    const variant = variants.find((item) => item.id === variantId);
    if (!variant) {
      return;
    }

    const max = stockForVariant(variant, selectedWarehouseId).available;
    const next = operationType === "adjust_in" ? Math.max(1, quantity) : Math.min(Math.max(1, quantity), Math.max(1, max));

    setCart((current) => current.map((item) => (item.variantId === variantId ? { ...item, quantity: next } : item)));
  }

  async function submitCart() {
    if (!cart.length) {
      setState({ tone: "error", message: "أضف منتجات إلى السلة أولاً." });
      return;
    }

    if (!sourceWarehouseId) {
      setState({ tone: "error", message: "اختر المخزن المطلوب." });
      return;
    }

    if (operationType === "transfer" && (!targetWarehouseId || sourceWarehouseId === targetWarehouseId)) {
      setState({ tone: "error", message: "اختر مخزناً وجهة مختلفاً عن المصدر." });
      return;
    }

    setState({ tone: "idle", message: "جاري تنفيذ سلة العملية..." });
    const endpoint = operationType === "transfer" ? "/api/admin/warehouses/transfer-batch" : "/api/admin/warehouses/adjust-batch";
    const payload =
      operationType === "transfer"
        ? {
            source_warehouse_id: sourceWarehouseId,
            target_warehouse_id: targetWarehouseId,
            items: cart.map((item) => ({ product_variant_id: item.variantId, quantity: item.quantity })),
            note,
          }
        : {
            warehouse_id: sourceWarehouseId,
            items: cart.map((item) => ({
              product_variant_id: item.variantId,
              delta: operationType === "adjust_in" ? item.quantity : -item.quantity,
            })),
            note,
          };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر تنفيذ العملية." });
      return;
    }

    setCart([]);
    setNote("");
    setState({ tone: "success", message: operationType === "transfer" ? "تم تحويل السلة بين المخازن." : "تم تحديث كميات السلة." });
    startTransition(() => router.refresh());
  }

  return (
    <section className="space-y-4">
      <div className="rounded-[1.7rem] border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-950/5">
        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.85fr_0.85fr]">
          <div className="grid gap-2 sm:grid-cols-3">
            {operationOptions.map((option) => (
              <button
                className={`rounded-[1.25rem] border p-3 text-right transition ${
                  operationType === option.value
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm shadow-emerald-950/5"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                }`}
                key={option.value}
                onClick={() => {
                  setOperationType(option.value);
                  setCart([]);
                }}
                type="button"
              >
                <span className="block text-sm font-black">{option.label}</span>
                <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">{option.hint}</span>
              </button>
            ))}
          </div>

          <div className="rounded-[1.25rem] bg-slate-50 p-3">
            <p className="mb-2 text-xs font-black text-slate-500">{operationType === "transfer" ? "المخزن المصدر" : "المخزن"}</p>
            <WarehouseSelectField value={sourceWarehouseId} warehouses={activeWarehouses} onChange={setSourceWarehouseId} />
          </div>

          <div className={`rounded-[1.25rem] bg-slate-50 p-3 ${operationType === "transfer" ? "" : "opacity-50"}`}>
            <p className="mb-2 text-xs font-black text-slate-500">المخزن الوجهة</p>
            <WarehouseSelectField disabled={operationType !== "transfer"} value={targetWarehouseId} warehouses={activeWarehouses} onChange={setTargetWarehouseId} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[210px_minmax(0,1fr)_370px]">
        <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5 xl:sticky xl:top-24">
          <p className="px-2 pb-2 text-xs font-black text-slate-500">الأقسام</p>
          <div className="flex gap-2 overflow-x-auto xl:flex-col xl:overflow-visible">
            <CategoryButton active={activeCategoryId === "all"} label="كل المنتجات" onClick={() => setActiveCategoryId("all")} />
            {categories.filter((category) => category.is_active).map((category) => (
              <CategoryButton active={activeCategoryId === category.id} key={category.id} label={category.name_ar} onClick={() => setActiveCategoryId(category.id)} />
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          <div className="grid gap-2 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5 md:grid-cols-[1fr_0.55fr_0.55fr]">
            <label className="flex h-12 items-center gap-2 rounded-full bg-slate-50 px-4 text-sm font-bold text-slate-500 ring-1 ring-slate-100">
              <Search size={17} />
              <input
                className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث باسم المنتج أو اللون أو المقاس"
                value={query}
              />
            </label>
            <select className="h-12 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none" onChange={(event) => setColorFilter(event.target.value)} value={colorFilter}>
              <option value="all">كل الألوان</option>
              {colorOptions.map((color) => <option key={color} value={color}>{color}</option>)}
            </select>
            <select className="h-12 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none" onChange={(event) => setSizeFilter(event.target.value)} value={sizeFilter}>
              <option value="all">كل المقاسات</option>
              {sizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const selectedVariant = selectedVariantFor(product);
              const stock = stockForVariant(selectedVariant, selectedWarehouseId);
              const imageUrl = selectedVariant.image_url || product.images[0]?.medium || product.images[0]?.thumb || product.images[0]?.large || "";
              const selectedQuantity = quantityFor(selectedVariant.id);

              return (
                <article className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm shadow-slate-950/5" key={product.id}>
                  <div className="relative h-36 bg-emerald-50">
                    {imageUrl ? <Image alt="" className="object-cover" fill sizes="(min-width: 1536px) 24vw, (min-width: 768px) 42vw, 90vw" src={imageUrl} /> : <div className="flex h-full items-center justify-center text-emerald-600"><PackagePlus size={42} /></div>}
                    <button
                      className="absolute left-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition hover:text-emerald-700"
                      onClick={() => setEditingProductId(product.id)}
                      title="تعديل المنتج"
                      type="button"
                    >
                      <Edit3 size={17} />
                    </button>
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-base font-black text-slate-950">{product.nameAr}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{product.categoryName || "بدون قسم"} · {formatMoney(product.customerPrice)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((variant) => {
                        const variantStock = stockForVariant(variant, selectedWarehouseId);
                        const isSelected = selectedVariant.id === variant.id;

                        return (
                          <button
                            className={`rounded-full px-3 py-1.5 text-xs font-black ring-1 transition ${
                              isSelected
                                ? "bg-emerald-600 text-white ring-emerald-600"
                                : "bg-slate-50 text-slate-600 ring-slate-100 hover:bg-emerald-50 hover:text-emerald-700"
                            }`}
                            key={variant.id}
                            onClick={() => setSelectedVariantByProduct((current) => ({ ...current, [product.id]: variant.id }))}
                            type="button"
                          >
                            {variantShortLabel(variant)} · {formatNumber(variantStock.available)}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <MetricMini label="متوفر" tone="emerald" value={formatNumber(stock.available)} />
                      <MetricMini label="محجوز" tone="amber" value={formatNumber(stock.reserved)} />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <QuantityStepper
                        disabled={operationType !== "adjust_in" && stock.available <= 0}
                        onChange={(next) => setDraftQuantity(selectedVariant, next)}
                        value={selectedQuantity}
                      />
                      <button
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-black text-white shadow-sm shadow-emerald-950/10 transition hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
                        disabled={operationType !== "adjust_in" && stock.available <= 0}
                        onClick={() => addToCart(product)}
                        type="button"
                      >
                        <ShoppingCart size={16} />
                        إضافة
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {!filteredProducts.length ? (
            <div className="rounded-[1.5rem] bg-white p-5 text-sm font-bold text-slate-500">لا توجد منتجات مطابقة للفلاتر الحالية.</div>
          ) : null}
        </div>

        <aside className="rounded-[1.6rem] border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-950/5 xl:sticky xl:top-24">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-emerald-700">سلة العملية</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{formatNumber(cart.length)} منتج</h3>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                {operationType === "transfer" ? `${selectedWarehouseName} ← ${targetWarehouseName || "اختر وجهة"}` : selectedWarehouseName}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShoppingCart size={22} />
            </span>
          </div>

          <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto pr-1">
            {cart.map((item) => {
              const variant = variants.find((entry) => entry.id === item.variantId);
              if (!variant) {
                return null;
              }

              return (
                <div className="rounded-2xl bg-slate-50 p-3" key={item.variantId}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-slate-900">{variant.products?.name_ar || "منتج"}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{variantShortLabel(variant)}</p>
                    </div>
                    <button className="rounded-full bg-white p-2 text-rose-600 ring-1 ring-rose-100" onClick={() => setCart((current) => current.filter((entry) => entry.variantId !== item.variantId))} type="button">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <QuantityStepper onChange={(next) => updateCartQuantity(item.variantId, next)} value={item.quantity} />
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-100">
                      {operationType === "adjust_out" ? "-" : "+"}{formatNumber(item.quantity)}
                    </span>
                  </div>
                </div>
              );
            })}
            {!cart.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-500">السلة فارغة. اختر المنتجات من الشبكة كأنك تجهز طلب متجر.</div> : null}
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            <input
              className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none"
              onChange={(event) => setNote(event.target.value)}
              placeholder="ملاحظة اختيارية"
              value={note}
            />
            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-black text-white shadow-sm shadow-emerald-950/10 transition hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
              disabled={isPending}
              onClick={() => void submitCart()}
              type="button"
            >
              {isPending ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
              تنفيذ السلة
            </button>
            <FieldMessage state={state} />
          </div>
        </aside>
      </div>

      {selectedProduct ? (
        <ProductEditDrawer
          categories={categories}
          onClose={() => setEditingProductId(null)}
          product={selectedProduct}
          onSaved={() => startTransition(() => router.refresh())}
        />
      ) : null}
    </section>
  );
}

export function WarehousePriorityPlanner({
  cities,
  warehouses,
}: {
  cities: AdminCity[];
  warehouses: AdminWarehouse[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cityId, setCityId] = useState(cities[0]?.id || "");
  const [orderedWarehouseIds, setOrderedWarehouseIds] = useState<string[]>(warehouses.filter((warehouse) => warehouse.is_active).map((warehouse) => warehouse.id));
  const [state, setState] = useState<ActionState>({ tone: "idle", message: "اختر المدينة ورتب المخازن حسب أولوية السحب." });

  function moveWarehouse(warehouseId: string, direction: -1 | 1) {
    setOrderedWarehouseIds((current) => {
      const index = current.indexOf(warehouseId);
      const target = index + direction;

      if (index < 0 || target < 0 || target >= current.length) {
        return current;
      }

      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  async function submit() {
    if (!cityId || !orderedWarehouseIds.length) {
      setState({ tone: "error", message: "اختر المدينة ورتب مخزناً واحداً على الأقل." });
      return;
    }

    setState({ tone: "idle", message: "جاري حفظ ترتيب الأولوية..." });
    const response = await fetch("/api/admin/warehouses/priorities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city_id: cityId, warehouse_ids: orderedWarehouseIds }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر حفظ الأولوية." });
      return;
    }

    setState({ tone: "success", message: "تم حفظ ترتيب أولوية المخازن." });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <select
        className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none"
        onChange={(event) => setCityId(event.target.value)}
        value={cityId}
      >
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name_ar}
          </option>
        ))}
      </select>

      <div className="space-y-2">
        {orderedWarehouseIds.map((warehouseId, index) => {
          const warehouse = warehouses.find((item) => item.id === warehouseId);

          if (!warehouse) {
            return null;
          }

          return (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3" key={warehouseId}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
                  {index + 1}
                </span>
                <p className="text-sm font-black text-slate-900">{warehouse.name}</p>
              </div>
              <div className="flex gap-1">
                <button className="h-8 rounded-full bg-white px-3 text-xs font-black text-slate-600 ring-1 ring-slate-100 disabled:opacity-40" disabled={index === 0} onClick={() => moveWarehouse(warehouseId, -1)} type="button">
                  أعلى
                </button>
                <button className="h-8 rounded-full bg-white px-3 text-xs font-black text-slate-600 ring-1 ring-slate-100 disabled:opacity-40" disabled={index === orderedWarehouseIds.length - 1} onClick={() => moveWarehouse(warehouseId, 1)} type="button">
                  أسفل
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-black text-white disabled:bg-slate-200"
        disabled={isPending}
        onClick={() => void submit()}
        type="button"
      >
        {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
        حفظ الأولوية
      </button>
      <FieldMessage state={state} />
    </div>
  );
}

function ProductEditDrawer({
  categories,
  onClose,
  onSaved,
  product,
}: {
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: () => void;
  product: ProductGroup;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [state, setState] = useState<ActionState>({ tone: "idle", message: "عدّل بيانات المنتج أو خياراته من هنا." });

  async function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSaving(true);
    const response = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name_ar: String(form.get("name_ar") || ""),
        name_en: String(form.get("name_en") || ""),
        category_id: String(form.get("category_id") || "") || null,
        cost_price: Number(form.get("cost_price") || 0),
        customer_price: Number(form.get("customer_price") || 0),
        marketer_price: Number(form.get("marketer_price") || 0),
        marketer_commission: Number(form.get("marketer_commission") || 0),
        low_stock_threshold: Number(form.get("low_stock_threshold") || 0),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setIsSaving(false);

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر تحديث المنتج." });
      return;
    }

    setState({ tone: "success", message: "تم تحديث بيانات المنتج." });
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-sm lg:items-center">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[1.7rem] bg-white p-5 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black text-emerald-700">تعديل المنتج</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">{product.nameAr}</h3>
            <p className="mt-1 text-sm font-bold text-slate-500">لا يمكن حذف خيار عليه مخزون أو كمية محجوزة.</p>
          </div>
          <button className="h-10 rounded-full bg-slate-50 px-4 text-sm font-black text-slate-600 ring-1 ring-slate-100" onClick={onClose} type="button">
            إغلاق
          </button>
        </div>

        <form className="mt-5 grid gap-3 rounded-[1.4rem] bg-slate-50 p-4 md:grid-cols-3" onSubmit={submitProduct}>
          <input className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold outline-none" defaultValue={product.nameAr} name="name_ar" placeholder="اسم عربي" />
          <input className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold outline-none" defaultValue={product.nameEn} name="name_en" placeholder="اسم إنجليزي" />
          <select className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold outline-none" defaultValue={product.categoryId || ""} name="category_id">
            <option value="">بدون قسم</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name_ar}</option>)}
          </select>
          <input className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold outline-none" defaultValue={product.costPrice} name="cost_price" placeholder="التكلفة" step="0.01" type="number" />
          <input className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold outline-none" defaultValue={product.customerPrice} name="customer_price" placeholder="سعر الزبون" step="0.01" type="number" />
          <input className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold outline-none" defaultValue={product.marketerPrice} name="marketer_price" placeholder="سعر المسوق" step="0.01" type="number" />
          <input className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold outline-none" defaultValue={product.marketerCommission} name="marketer_commission" placeholder="عمولة المسوق" step="0.01" type="number" />
          <input className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold outline-none" defaultValue={product.lowStockThreshold} name="low_stock_threshold" placeholder="حد التنبيه" type="number" />
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-black text-white disabled:bg-slate-200" disabled={isSaving} type="submit">
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            حفظ المنتج
          </button>
        </form>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {product.variants.map((variant) => (
            <VariantEditRow key={variant.id} onSaved={onSaved} variant={variant} />
          ))}
        </div>

        <div className="mt-4">
          <FieldMessage state={state} />
        </div>
      </div>
    </div>
  );
}

function VariantEditRow({ onSaved, variant }: { onSaved: () => void; variant: AdminProductVariant }) {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<ActionState>({ tone: "idle", message: "يمكن تعديل الخيار أو تعطيله." });
  const stock = totalStockForVariant(variant);
  const hasStock = stock.available + stock.reserved > 0;

  async function patchVariant(payload: Record<string, unknown>, success: string) {
    setIsSaving(true);
    const response = await fetch(`/api/admin/product-variants/${variant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setIsSaving(false);

    if (!response.ok || data.error) {
      setMessage({ tone: "error", message: data.error || "تعذر تحديث الخيار." });
      return;
    }

    setMessage({ tone: "success", message: success });
    onSaved();
  }

  async function deleteVariant() {
    setIsSaving(true);
    const response = await fetch(`/api/admin/product-variants/${variant.id}`, { method: "DELETE" });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setIsSaving(false);

    if (!response.ok || data.error) {
      setMessage({ tone: "error", message: data.error || "تعذر حذف الخيار." });
      return;
    }

    setMessage({ tone: "success", message: "تم حذف الخيار." });
    onSaved();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await patchVariant(
      {
        color: String(form.get("color") || ""),
        size: String(form.get("size") || ""),
        type: String(form.get("type") || ""),
        extra_price: Number(form.get("extra_price") || 0),
      },
      "تم تحديث الخيار.",
    );
  }

  return (
    <div className={`rounded-[1.35rem] border p-4 ${hasStock ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-slate-50"}`}>
      <form className="grid gap-2 sm:grid-cols-2" onSubmit={submit}>
        <input className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold outline-none" defaultValue={variant.color || ""} name="color" placeholder="اللون" />
        <input className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold outline-none" defaultValue={variant.size || ""} name="size" placeholder="المقاس" />
        <input className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold outline-none" defaultValue={variant.type || ""} name="type" placeholder="النوع" />
        <input className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold outline-none" defaultValue={variant.extra_price || 0} name="extra_price" placeholder="فرق السعر" step="0.01" type="number" />
        <button className="h-10 rounded-full bg-emerald-600 px-4 text-sm font-black text-white disabled:bg-slate-200" disabled={isSaving} type="submit">حفظ الخيار</button>
        <button
          className="h-10 rounded-full bg-slate-900 px-4 text-sm font-black text-white disabled:bg-slate-200"
          disabled={isSaving}
          onClick={() => void patchVariant({ is_active: !variant.is_active }, variant.is_active ? "تم تعطيل الخيار من البيع." : "تم تنشيط الخيار.")}
          type="button"
        >
          {variant.is_active ? "تعطيل البيع" : "تنشيط"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">متوفر {formatNumber(stock.available)}</span>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-amber-700 ring-1 ring-amber-100">محجوز {formatNumber(stock.reserved)}</span>
        </div>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-rose-50 px-3 text-xs font-black text-rose-700 ring-1 ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving || hasStock}
          onClick={() => void deleteVariant()}
          type="button"
        >
          <Trash2 size={14} />
          حذف
        </button>
      </div>

      {hasStock ? <p className="mt-2 text-xs font-bold leading-5 text-amber-700">لا يمكن حذف هذا اللون/المقاس لأن عليه مخزون أو كمية محجوزة.</p> : null}
      <div className="mt-2">
        <FieldMessage state={message} />
      </div>
    </div>
  );
}

function CategoryButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black ring-1 transition ${
        active ? "bg-emerald-600 text-white ring-emerald-600" : "bg-slate-50 text-slate-600 ring-slate-100 hover:bg-emerald-50 hover:text-emerald-700"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function WarehouseSelectField({
  disabled,
  onChange,
  value,
  warehouses,
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
  warehouses: AdminWarehouse[];
}) {
  return (
    <select
      className="h-12 w-full rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 outline-none disabled:bg-slate-100"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      <option value="">اختر المخزن</option>
      {warehouses.map((warehouse) => (
        <option key={warehouse.id} value={warehouse.id}>
          {warehouse.name}
        </option>
      ))}
    </select>
  );
}

function QuantityStepper({
  disabled,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="inline-grid h-10 grid-cols-[34px_46px_34px] overflow-hidden rounded-full border border-slate-200 bg-white">
      <button className="bg-slate-50 text-sm font-black text-slate-600 disabled:text-slate-300" disabled={disabled} onClick={() => onChange(value - 1)} type="button">-</button>
      <span className="flex items-center justify-center text-sm font-black text-slate-900">{formatNumber(value)}</span>
      <button className="bg-slate-50 text-sm font-black text-slate-600 disabled:text-slate-300" disabled={disabled} onClick={() => onChange(value + 1)} type="button">+</button>
    </div>
  );
}

function MetricMini({ label, tone, value }: { label: string; tone: "emerald" | "amber"; value: string }) {
  return (
    <div className={`rounded-2xl px-3 py-2 ${tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      <span className="block text-xs font-black">{label}</span>
      <strong className="mt-1 block text-base font-black">{value}</strong>
    </div>
  );
}

function FieldMessage({ state }: { state: ActionState }) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 text-xs font-black leading-5 ${
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

function groupProducts(variants: AdminProductVariant[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();

  variants.forEach((variant) => {
    const product = variant.products;
    const productId = product?.id || variant.product_id;
    const current = map.get(productId);

    if (current) {
      current.variants.push(variant);
      return;
    }

    map.set(productId, {
      id: productId,
      categoryId: product?.category_id || null,
      nameAr: product?.name_ar || "منتج",
      nameEn: product?.name_en || product?.name_ar || "",
      images: product?.images || [],
      categoryName: product?.categories?.name_ar || "",
      costPrice: Number(product?.cost_price || 0),
      customerPrice: Number(product?.customer_price || 0),
      marketerPrice: Number(product?.marketer_price || 0),
      marketerCommission: Number(product?.marketer_commission || 0),
      lowStockThreshold: Number(product?.low_stock_threshold || 0),
      isActive: Boolean(product?.is_active ?? true),
      variants: [variant],
    });
  });

  return Array.from(map.values()).sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));
}

function uniqueValues(values: Array<string | null>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ar"));
}

function stockForVariant(variant: AdminProductVariant, warehouseId: string) {
  const inventory = (variant.warehouse_inventory || []).find((row) => row.warehouse_id === warehouseId);

  return {
    available: Number(inventory?.quantity_available || 0),
    reserved: Number(inventory?.quantity_reserved || 0),
  };
}

function totalStockForVariant(variant: AdminProductVariant) {
  return (variant.warehouse_inventory || []).reduce(
    (totals, row) => ({
      available: totals.available + Number(row.quantity_available || 0),
      reserved: totals.reserved + Number(row.quantity_reserved || 0),
    }),
    { available: 0, reserved: 0 },
  );
}

function warehouseName(warehouses: AdminWarehouse[], warehouseId: string) {
  return warehouses.find((warehouse) => warehouse.id === warehouseId)?.name || "";
}

function variantShortLabel(variant: AdminProductVariant) {
  return [variant.color, variant.size, variant.type].filter(Boolean).join(" · ") || "خيار أساسي";
}
