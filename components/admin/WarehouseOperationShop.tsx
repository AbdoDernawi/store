"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Edit3,
  Filter,
  Loader2,
  Lock,
  PackagePlus,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import type { AdminCategory, AdminCity, AdminProductVariant, AdminWarehouse } from "@/lib/admin/management";
import { formatNumber } from "@/lib/admin/format";

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

type InventoryFilterRow = {
  key: string;
  product: ProductGroup;
  variant: AdminProductVariant;
  warehouseId: string;
  warehouseName: string;
  available: number;
  reserved: number;
  threshold: number;
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
  const [inventoryCategoryId, setInventoryCategoryId] = useState("all");
  const [inventoryColorFilter, setInventoryColorFilter] = useState("all");
  const [inventoryLowOnly, setInventoryLowOnly] = useState(false);
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [inventorySizeFilter, setInventorySizeFilter] = useState("all");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState("all");
  const [inventoryWarehouseId, setInventoryWarehouseId] = useState("all");
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
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
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

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
  const inventoryRows = useMemo(() => buildInventoryRows(products, inventoryWarehouseId), [products, inventoryWarehouseId]);
  const filteredInventoryRows = inventoryRows.filter((row) => {
    const search = inventoryQuery.trim().toLowerCase();
    const status = inventoryStatus(row.available, row.threshold);
    const variantLabel = variantShortLabel(row.variant).toLowerCase();
    const matchesSearch =
      !search ||
      row.product.nameAr.toLowerCase().includes(search) ||
      row.product.nameEn.toLowerCase().includes(search) ||
      row.warehouseName.toLowerCase().includes(search) ||
      variantLabel.includes(search);
    const matchesCategory = inventoryCategoryId === "all" || row.product.categoryId === inventoryCategoryId;
    const matchesColor = inventoryColorFilter === "all" || row.variant.color === inventoryColorFilter;
    const matchesSize = inventorySizeFilter === "all" || row.variant.size === inventorySizeFilter;
    const matchesStatus = inventoryStatusFilter === "all" || status === inventoryStatusFilter;
    const matchesLow = !inventoryLowOnly || status === "low";

    return matchesSearch && matchesCategory && matchesColor && matchesSize && matchesStatus && matchesLow;
  });

  function selectedVariantFor(product: ProductGroup) {
    const preferredId = selectedVariantByProduct[product.id];
    const preferred = product.variants.find((variant) => variant.id === preferredId);

    return preferred || product.variants[0];
  }

  function addToCart(product: ProductGroup) {
    const variant = selectedVariantFor(product);
    const stock = stockForVariant(variant, selectedWarehouseId);
    const quantity = 1;

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
      <section className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <PanelLabel index="2" title="فلترة المنتجات" />
          <button
            className="inline-flex h-9 w-fit items-center gap-2 rounded-[0.7rem] border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 transition hover:bg-white"
            onClick={() => {
              setInventoryCategoryId("all");
              setInventoryColorFilter("all");
              setInventoryLowOnly(false);
              setInventoryQuery("");
              setInventorySizeFilter("all");
              setInventoryStatusFilter("all");
              setInventoryWarehouseId("all");
            }}
            type="button"
          >
            <Filter size={14} />
            إعادة تعيين
          </button>
        </div>

        <div className="mt-4 rounded-[1rem] border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/[0.03]">
          <div className="grid gap-2 lg:grid-cols-[minmax(230px,1.2fr)_repeat(4,minmax(120px,0.72fr))]">
            <label className="flex h-11 items-center gap-2 rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-bold text-slate-500 shadow-sm shadow-slate-950/[0.02]">
              <Search size={16} />
              <input
                className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
                onChange={(event) => setInventoryQuery(event.target.value)}
                placeholder="ابحث عن منتج أو لون أو مخزن"
                value={inventoryQuery}
              />
            </label>
            <select className="h-11 rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none" onChange={(event) => setInventoryWarehouseId(event.target.value)} value={inventoryWarehouseId}>
              <option value="all">كل المخازن</option>
              {activeWarehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </select>
            <select className="h-11 rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none" onChange={(event) => setInventoryCategoryId(event.target.value)} value={inventoryCategoryId}>
              <option value="all">كل التصنيفات</option>
              {categories.filter((category) => category.is_active).map((category) => <option key={category.id} value={category.id}>{category.name_ar}</option>)}
            </select>
            <select className="h-11 rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none" onChange={(event) => setInventoryStatusFilter(event.target.value)} value={inventoryStatusFilter}>
              <option value="all">كل الحالات</option>
              <option value="ok">مستقر</option>
              <option value="low">منخفض</option>
              <option value="empty">غير متوفر</option>
            </select>
            <select className="h-11 rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none" onChange={(event) => setInventorySizeFilter(event.target.value)} value={inventorySizeFilter}>
              <option value="all">كل المقاسات</option>
              {sizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>

          <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="inline-flex w-fit items-center gap-2 text-xs font-black text-slate-600">
              <button
                aria-pressed={inventoryLowOnly}
                className={`relative h-6 w-11 rounded-full transition ${inventoryLowOnly ? "bg-emerald-600" : "bg-slate-300"}`}
                onClick={() => setInventoryLowOnly((current) => !current)}
                type="button"
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${inventoryLowOnly ? "right-6" : "right-1"}`} />
              </button>
              منخفض المخزون
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-500">الألوان</span>
              <ColorFilterDot active={inventoryColorFilter === "all"} label="كل" onClick={() => setInventoryColorFilter("all")} />
              {colorOptions.slice(0, 7).map((color) => (
                <ColorFilterDot active={inventoryColorFilter === color} color={color} key={color} label={color} onClick={() => setInventoryColorFilter(color)} />
              ))}
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-100">
                إجمالي {formatNumber(filteredInventoryRows.length)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-[1rem] border border-slate-200">
          <div className="hidden grid-cols-[minmax(250px,1.4fr)_0.7fr_0.45fr_0.5fr_0.5fr_0.55fr_42px] items-center gap-3 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-500 lg:grid">
            <span>المنتج / المتغير</span>
            <span>المخزن</span>
            <span>المقاس</span>
            <span>متوفر</span>
            <span>محجوز</span>
            <span>الحالة</span>
            <span />
          </div>
          <div className="divide-y divide-slate-100 bg-white">
            {filteredInventoryRows.slice(0, 40).map((row) => {
              const status = inventoryStatus(row.available, row.threshold);

              return (
                <article className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(250px,1.4fr)_0.7fr_0.45fr_0.5fr_0.5fr_0.55fr_42px] lg:items-center" key={row.key}>
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductThumb imageUrl={row.variant.image_url || productImage(row.product)} size="table" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{row.product.nameAr}</p>
                      <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
                        {[row.variant.color, row.variant.type, row.product.categoryName].filter(Boolean).join(" · ") || "خيار أساسي"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-black text-slate-700">{row.warehouseName}</p>
                  <p className="text-xs font-black text-slate-700">{row.variant.size || "-"}</p>
                  <p className="text-xs font-black text-emerald-700">{formatNumber(row.available)}</p>
                  <p className="text-xs font-black text-sky-700">{formatNumber(row.reserved)}</p>
                  <InventoryStatusBadge status={status} />
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-slate-50 text-slate-600 ring-1 ring-slate-100 transition hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => setEditingProductId(row.product.id)}
                    title="تعديل المنتج"
                    type="button"
                  >
                    <Edit3 size={15} />
                  </button>
                </article>
              );
            })}
            {!filteredInventoryRows.length ? <div className="p-5 text-sm font-bold text-slate-500">لا توجد منتجات مطابقة للفلاتر الحالية.</div> : null}
          </div>
        </div>
      </section>

      <section className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <PanelLabel index="3" title="سلة التحويل - تحويل متعدد" />
          <div className="grid gap-2 sm:grid-cols-3">
            {operationOptions.map((option) => (
              <button
                className={`rounded-[0.8rem] border px-3 py-2 text-right transition ${
                  operationType === option.value
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                }`}
                key={option.value}
                onClick={() => {
                  setOperationType(option.value);
                  setCart([]);
                }}
                type="button"
              >
                <span className="block text-xs font-black">{option.label}</span>
                <span className="mt-0.5 block truncate text-[10px] font-bold text-slate-500">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[300px_minmax(360px,1fr)_250px]">
          <aside className="rounded-[1rem] border border-slate-200 bg-white p-3 xl:order-3">
            <h3 className="text-sm font-black text-slate-950">اختر المنتجات</h3>
            <label className="mt-3 flex h-10 items-center gap-2 rounded-[0.75rem] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500">
              <Search size={15} />
              <input
                className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث عن منتج أو SKU"
                value={query}
              />
            </label>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              <CategoryButton active={activeCategoryId === "all"} label="الكل" onClick={() => setActiveCategoryId("all")} />
              {categories.filter((category) => category.is_active).map((category) => (
                <CategoryButton active={activeCategoryId === category.id} key={category.id} label={category.name_ar} onClick={() => setActiveCategoryId(category.id)} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <select className="h-9 rounded-[0.7rem] border border-slate-200 bg-slate-50 px-2 text-xs font-black text-slate-700 outline-none" onChange={(event) => setColorFilter(event.target.value)} value={colorFilter}>
                <option value="all">كل الألوان</option>
                {colorOptions.map((color) => <option key={color} value={color}>{color}</option>)}
              </select>
              <select className="h-9 rounded-[0.7rem] border border-slate-200 bg-slate-50 px-2 text-xs font-black text-slate-700 outline-none" onChange={(event) => setSizeFilter(event.target.value)} value={sizeFilter}>
                <option value="all">كل المقاسات</option>
                {sizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>

            <div className="mt-3 max-h-[530px] space-y-2 overflow-y-auto pl-1">
              {filteredProducts.map((product) => {
                const selectedVariant = selectedVariantFor(product);
                const stock = stockForVariant(selectedVariant, selectedWarehouseId);
                const cartItem = cart.find((item) => item.variantId === selectedVariant.id);

                return (
                  <article className="rounded-[0.95rem] border border-slate-200 bg-white p-2.5" key={product.id}>
                    <div className="flex items-start gap-2">
                      <button
                        aria-label={cartItem ? "موجود في السلة" : "إضافة للسلة"}
                        className={`mt-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-[0.25rem] ring-1 ${
                          cartItem ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-transparent ring-slate-300"
                        }`}
                        onClick={() => addToCart(product)}
                        type="button"
                      >
                        <CheckCircle2 size={11} />
                      </button>
                      <ProductThumb imageUrl={selectedVariant.image_url || productImage(product)} size="picker" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-slate-950">{product.nameAr}</p>
                        <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">{variantShortLabel(selectedVariant)}</p>
                        <p className="mt-1 text-[10px] font-black text-emerald-700">متوفر {formatNumber(stock.available)}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {product.variants.map((variant) => (
                        <button
                          className={`rounded-full px-2 py-1 text-[10px] font-black ring-1 ${
                            variant.id === selectedVariant.id ? "bg-emerald-600 text-white ring-emerald-600" : "bg-slate-50 text-slate-600 ring-slate-100"
                          }`}
                          key={variant.id}
                          onClick={() => setSelectedVariantByProduct((current) => ({ ...current, [product.id]: variant.id }))}
                          type="button"
                        >
                          {variantShortLabel(variant)}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
              {!filteredProducts.length ? <div className="rounded-[0.9rem] bg-slate-50 p-3 text-xs font-bold text-slate-500">لا توجد نتائج هنا.</div> : null}
            </div>
          </aside>

          <article className="rounded-[1rem] border border-slate-200 bg-slate-50/55 p-3 xl:order-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-950">سلة التحويل ({formatNumber(cart.length)})</h3>
                <p className="mt-0.5 text-xs font-bold text-slate-500">
                  {operationType === "transfer" ? `${selectedWarehouseName || "اختر المصدر"} ← ${targetWarehouseName || "اختر الوجهة"}` : selectedWarehouseName || "اختر المخزن"}
                </p>
              </div>
              {cart.length ? (
                <button className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700 ring-1 ring-rose-100" onClick={() => setCart([])} type="button">
                  تفريغ السلة
                </button>
              ) : null}
            </div>

            <div className="mt-3 max-h-[545px] space-y-2 overflow-y-auto pl-1">
              {cart.map((item) => {
                const variant = variants.find((entry) => entry.id === item.variantId);
                const product = products.find((entry) => entry.id === variant?.product_id);

                if (!variant || !product) {
                  return null;
                }

                return (
                  <div className="rounded-[0.95rem] border border-slate-200 bg-white p-3" key={item.variantId}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-100" onClick={() => setCart((current) => current.filter((entry) => entry.variantId !== item.variantId))} type="button">
                          <X size={13} />
                        </button>
                        <ProductThumb imageUrl={variant.image_url || productImage(product)} size="cart" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">{product.nameAr}</p>
                          <p className="mt-0.5 text-xs font-bold text-slate-500">{variantShortLabel(variant)}</p>
                          <p className="mt-1 text-[11px] font-black text-emerald-700">
                            {operationType === "transfer" ? `من: ${selectedWarehouseName || "المصدر"}` : `المخزن: ${selectedWarehouseName || "-"}`}
                          </p>
                        </div>
                      </div>
                      <QuantityStepper onChange={(next) => updateCartQuantity(item.variantId, next)} value={item.quantity} />
                    </div>
                  </div>
                );
              })}
              {!cart.length ? (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-[0.95rem] border border-dashed border-slate-200 bg-white p-5 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[0.95rem] bg-emerald-50 text-emerald-700">
                    <ShoppingCart size={22} />
                  </span>
                  <p className="mt-3 text-sm font-black text-slate-900">السلة فارغة</p>
                  <p className="mt-1 text-xs font-bold leading-6 text-slate-500">اختر مجموعة منتجات بكميات ومقاسات مختلفة كما في المتجر.</p>
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
              <span>إجمالي العناصر: {formatNumber(cart.length)}</span>
              <span>إجمالي الكمية: {formatNumber(cartQuantity)} قطعة</span>
            </div>
          </article>

          <aside className="rounded-[1rem] border border-slate-200 bg-white p-3 xl:order-1">
            <h3 className="text-sm font-black text-slate-950">{operationType === "transfer" ? "المخزن الوجهة" : "المخزن المتأثر"}</h3>
            <div className="mt-3 space-y-2">
              <div>
                <p className="mb-1 text-[11px] font-black text-slate-500">{operationType === "transfer" ? "اختر المخزن المصدر" : "اختر المخزن"}</p>
                <WarehouseSelectField value={sourceWarehouseId} warehouses={activeWarehouses} onChange={setSourceWarehouseId} />
              </div>
              <div className={operationType === "transfer" ? "" : "opacity-50"}>
                <p className="mb-1 text-[11px] font-black text-slate-500">اختر المخزن الوجهة</p>
                <WarehouseSelectField disabled={operationType !== "transfer"} value={targetWarehouseId} warehouses={activeWarehouses} onChange={setTargetWarehouseId} />
              </div>
              <textarea
                className="min-h-24 w-full resize-none rounded-[0.8rem] border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                onChange={(event) => setNote(event.target.value)}
                placeholder="ملاحظة اختيارية"
                value={note}
              />
            </div>

            <div className="mt-3 rounded-[0.95rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black text-slate-950">ملخص العملية</p>
              <div className="mt-2 space-y-2 text-xs font-bold text-slate-600">
                <SummaryLine label="من" value={selectedWarehouseName || "-"} />
                <SummaryLine label="إلى" value={operationType === "transfer" ? targetWarehouseName || "-" : "نفس المخزن"} />
                <SummaryLine label="إجمالي العناصر" value={formatNumber(cart.length)} />
                <SummaryLine label="إجمالي الكمية" value={`${formatNumber(cartQuantity)} قطعة`} />
              </div>
            </div>

            <button
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[0.8rem] bg-emerald-600 px-4 text-sm font-black text-white shadow-sm shadow-emerald-950/10 transition hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
              disabled={isPending}
              onClick={() => void submitCart()}
              type="button"
            >
              {isPending ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              {operationType === "transfer" ? "تأكيد التحويل" : "تنفيذ السلة"}
            </button>
            <div className="mt-2">
              <FieldMessage state={state} />
            </div>
          </aside>
        </div>
      </section>

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
      <div className="max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-[1.2rem] border border-slate-200 bg-[#fbfdfc] shadow-2xl shadow-slate-950/20">
        <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-100" onClick={onClose} type="button">
              <X size={15} />
            </button>
            <div>
              <p className="text-xs font-black text-emerald-700">4</p>
              <h3 className="text-lg font-black text-slate-950">تعديل المنتج</h3>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto text-xs font-black text-slate-500">
            <span className="rounded-full px-3 py-2">العام</span>
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700 ring-1 ring-emerald-100">الخيارات</span>
            <span className="rounded-full px-3 py-2">المخزون</span>
            <span className="rounded-full px-3 py-2">السعر</span>
            <span className="rounded-full px-3 py-2">SEO</span>
          </div>
        </header>

        <div className="grid max-h-[calc(94vh-72px)] overflow-y-auto lg:grid-cols-[minmax(0,1fr)_310px]">
          <section className="p-4">
            <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black text-emerald-700">الألوان والمقاسات</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">لا يمكن حذف خيار عليه مخزون أو كمية محجوزة في أي مخزن.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueValues(product.variants.map((variant) => variant.color)).map((color) => (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-100" key={color}>
                      <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swatchColor(color) }} />
                      {color}
                    </span>
                  ))}
                  {uniqueValues(product.variants.map((variant) => variant.size)).map((size) => (
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-100" key={size}>
                      {size}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 hidden grid-cols-[minmax(0,1fr)_110px_110px_120px] gap-2 rounded-[0.8rem] bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-500 md:grid">
                <span>الخيار</span>
                <span>متوفر</span>
                <span>محجوز</span>
                <span>التحكم</span>
              </div>
              <div className="mt-2 space-y-2">
                {product.variants.map((variant) => (
                  <VariantEditRow key={variant.id} onSaved={onSaved} variant={variant} />
                ))}
              </div>
            </div>
          </section>

          <aside className="border-t border-slate-200 bg-white p-4 lg:border-r lg:border-t-0">
            <div>
              <p className="text-xs font-black text-slate-500">معلومات المنتج</p>
              <div className="mt-3">
                <ProductThumb imageUrl={productImage(product)} size="preview" />
              </div>
            </div>

            <form className="mt-3 space-y-2" onSubmit={submitProduct}>
              <FieldShell label="اسم المنتج">
                <input className="h-10 w-full rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-bold outline-none" defaultValue={product.nameAr} name="name_ar" placeholder="اسم عربي" />
              </FieldShell>
              <FieldShell label="الاسم الإنجليزي">
                <input className="h-10 w-full rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-bold outline-none" defaultValue={product.nameEn} name="name_en" placeholder="اسم إنجليزي" />
              </FieldShell>
              <FieldShell label="التصنيف">
                <select className="h-10 w-full rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-bold outline-none" defaultValue={product.categoryId || ""} name="category_id">
                  <option value="">بدون قسم</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name_ar}</option>)}
                </select>
              </FieldShell>
              <div className="grid grid-cols-2 gap-2">
                <FieldShell label="التكلفة">
                  <input className="h-10 w-full rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-bold outline-none" defaultValue={product.costPrice} name="cost_price" step="0.01" type="number" />
                </FieldShell>
                <FieldShell label="سعر الزبون">
                  <input className="h-10 w-full rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-bold outline-none" defaultValue={product.customerPrice} name="customer_price" step="0.01" type="number" />
                </FieldShell>
                <FieldShell label="سعر المسوق">
                  <input className="h-10 w-full rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-bold outline-none" defaultValue={product.marketerPrice} name="marketer_price" step="0.01" type="number" />
                </FieldShell>
                <FieldShell label="العمولة">
                  <input className="h-10 w-full rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-bold outline-none" defaultValue={product.marketerCommission} name="marketer_commission" step="0.01" type="number" />
                </FieldShell>
              </div>
              <FieldShell label="حد التنبيه">
                <input className="h-10 w-full rounded-[0.75rem] border border-slate-200 bg-white px-3 text-sm font-bold outline-none" defaultValue={product.lowStockThreshold} name="low_stock_threshold" type="number" />
              </FieldShell>
              <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[0.8rem] bg-emerald-600 px-4 text-sm font-black text-white disabled:bg-slate-200" disabled={isSaving} type="submit">
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                حفظ المنتج
              </button>
            </form>
            <div className="mt-2">
              <FieldMessage state={state} />
            </div>
          </aside>
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
    <div className={`rounded-[0.9rem] border p-2.5 ${hasStock ? "border-amber-200 bg-amber-50/45" : "border-slate-200 bg-white"}`}>
      <form className="grid gap-2 md:grid-cols-[minmax(0,1fr)_110px_110px_120px] md:items-center" onSubmit={submit}>
        <div className="grid gap-1.5 sm:grid-cols-4">
          <input className="h-9 rounded-[0.65rem] border border-slate-200 bg-white px-2 text-xs font-bold outline-none" defaultValue={variant.color || ""} name="color" placeholder="اللون" />
          <input className="h-9 rounded-[0.65rem] border border-slate-200 bg-white px-2 text-xs font-bold outline-none" defaultValue={variant.size || ""} name="size" placeholder="المقاس" />
          <input className="h-9 rounded-[0.65rem] border border-slate-200 bg-white px-2 text-xs font-bold outline-none" defaultValue={variant.type || ""} name="type" placeholder="النوع" />
          <input className="h-9 rounded-[0.65rem] border border-slate-200 bg-white px-2 text-xs font-bold outline-none" defaultValue={variant.extra_price || 0} name="extra_price" placeholder="فرق السعر" step="0.01" type="number" />
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-center text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
          {formatNumber(stock.available)} متوفر
        </span>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-center text-[11px] font-black text-sky-700 ring-1 ring-sky-100">
          {formatNumber(stock.reserved)} محجوز
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          <button className="h-8 rounded-full bg-emerald-600 px-3 text-[11px] font-black text-white disabled:bg-slate-200" disabled={isSaving} type="submit">
            حفظ
          </button>
          <button
            className="h-8 rounded-full bg-white px-3 text-[11px] font-black text-slate-700 ring-1 ring-slate-200 disabled:bg-slate-100"
            disabled={isSaving}
            onClick={() => void patchVariant({ is_active: !variant.is_active }, variant.is_active ? "تم تعطيل الخيار من البيع." : "تم تنشيط الخيار.")}
            type="button"
          >
            {variant.is_active ? "تعطيل" : "تنشيط"}
          </button>
        </div>
      </form>

      <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        {hasStock ? (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700 ring-1 ring-rose-100">
            <Lock size={11} />
            لا يمكن حذف خيار عليه مخزون
          </span>
        ) : (
          <span className="text-[11px] font-bold text-slate-500">الخيار خال من المخزون ويمكن حذفه.</span>
        )}
        <button
          className="inline-flex h-8 w-fit items-center gap-1.5 rounded-full bg-rose-50 px-3 text-[11px] font-black text-rose-700 ring-1 ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving || hasStock}
          onClick={() => void deleteVariant()}
          type="button"
        >
          <Trash2 size={13} />
          حذف
        </button>
      </div>

      <div className="mt-2">
        <FieldMessage state={message} />
      </div>
    </div>
  );
}

function PanelLabel({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-sm font-black text-white">
        {index}
      </span>
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
    </div>
  );
}

function ColorFilterDot({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex h-7 min-w-7 items-center justify-center rounded-full p-1 ring-1 transition ${
        active ? "ring-emerald-500 ring-offset-2" : "ring-slate-200 hover:ring-emerald-200"
      }`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {color ? (
        <span className="h-full w-full rounded-full border border-white shadow-sm" style={{ backgroundColor: swatchColor(color) }} />
      ) : (
        <span className="px-1 text-[10px] font-black text-slate-600">كل</span>
      )}
    </button>
  );
}

function InventoryStatusBadge({ status }: { status: "ok" | "low" | "empty" }) {
  const labels = {
    empty: "غير متوفر",
    low: "منخفض",
    ok: "مستقر",
  };
  const tone =
    status === "empty"
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : status === "low"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-emerald-50 text-emerald-700 ring-emerald-100";

  return <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${tone}`}>{labels[status]}</span>;
}

function ProductThumb({
  imageUrl,
  size,
}: {
  imageUrl: string;
  size: "cart" | "picker" | "preview" | "table";
}) {
  const dimensions = {
    cart: "h-16 w-16 rounded-[0.85rem]",
    picker: "h-14 w-14 rounded-[0.8rem]",
    preview: "h-44 w-full rounded-[1rem] border border-slate-200",
    table: "h-12 w-12 rounded-[0.8rem]",
  };

  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-slate-100 text-emerald-600 ${dimensions[size]}`}>
      {imageUrl ? <Image alt="" className="object-cover" fill sizes="64px" src={imageUrl} /> : <PackagePlus size={size === "cart" ? 24 : 19} />}
    </span>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <strong className="text-slate-950">{value}</strong>
    </div>
  );
}

function FieldShell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function CategoryButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-black ring-1 transition ${
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

function buildInventoryRows(products: ProductGroup[], warehouseId: string): InventoryFilterRow[] {
  return products.flatMap((product) =>
    product.variants.flatMap((variant) => {
      const inventory = (variant.warehouse_inventory || []).filter((row) => warehouseId === "all" || row.warehouse_id === warehouseId);

      if (!inventory.length && warehouseId !== "all") {
        return [];
      }

      if (!inventory.length) {
        return [
          {
            available: 0,
            key: `${product.id}-${variant.id}-unassigned`,
            product,
            reserved: 0,
            threshold: product.lowStockThreshold,
            variant,
            warehouseId: "",
            warehouseName: "غير موزع",
          },
        ];
      }

      return inventory.map((row) => ({
        available: Number(row.quantity_available || 0),
        key: `${product.id}-${variant.id}-${row.warehouse_id}`,
        product,
        reserved: Number(row.quantity_reserved || 0),
        threshold: Number(row.low_stock_threshold || product.lowStockThreshold || 0),
        variant,
        warehouseId: row.warehouse_id,
        warehouseName: row.warehouses?.name || "مخزن",
      }));
    }),
  );
}

function inventoryStatus(available: number, threshold: number): "ok" | "low" | "empty" {
  if (available <= 0) {
    return "empty";
  }

  return available <= threshold ? "low" : "ok";
}

function productImage(product: ProductGroup) {
  return product.images[0]?.medium || product.images[0]?.thumb || product.images[0]?.large || "";
}

function swatchColor(color: string) {
  const normalized = color.trim().toLowerCase();
  const presets: Record<string, string> = {
    أسود: "#111827",
    أبيض: "#f8fafc",
    اخضر: "#16a34a",
    أخضر: "#16a34a",
    ازرق: "#2563eb",
    أزرق: "#2563eb",
    بني: "#9a6a43",
    رمادي: "#94a3b8",
    وردي: "#ec4899",
    black: "#111827",
    blue: "#2563eb",
    brown: "#9a6a43",
    gray: "#94a3b8",
    green: "#16a34a",
    grey: "#94a3b8",
    pink: "#ec4899",
    white: "#f8fafc",
  };

  return presets[normalized] || color;
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
