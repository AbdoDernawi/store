"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  ImagePlus,
  Loader2,
  MapPin,
  Minus,
  PackageSearch,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { formatMoney } from "@/lib/admin/format";
import type {
  CustomerAddress,
  CustomerCatalogProduct,
  CustomerCatalogVariant,
  CustomerCategory,
  CustomerCity,
  CustomerZone,
} from "@/lib/customer/data";

type CartItem = {
  availableQuantity: number;
  imageUrl: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  variantId: string;
  variantLabel: string;
};

type AddressForm = {
  address: string;
  cityId: string;
  name: string;
  phone: string;
  zoneId: string;
};

type ActionState = {
  tone: "idle" | "success" | "error";
  message: string;
};

const inputClass =
  "h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50";
const textareaClass =
  "min-h-24 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50";

export function CustomerProductShop({
  addresses,
  categories,
  cities,
  initialCategory = "all",
  products,
  zones,
}: {
  addresses: CustomerAddress[];
  categories: CustomerCategory[];
  cities: CustomerCity[];
  initialCategory?: string;
  products: CustomerCatalogProduct[];
  zones: CustomerZone[];
}) {
  const router = useRouter();
  const firstAvailable = products.find((product) => product.available_quantity > 0) || products[0] || null;
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [addressMode, setAddressMode] = useState(addresses[0]?.id || "new");
  const [address, setAddress] = useState<AddressForm>(() => addressFromSaved(addresses[0]));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer">("cash");
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(firstAvailable?.id || null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(firstAvailable?.variants[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<ActionState>({
    tone: "idle",
    message: "اختر منتجاً متوفراً ثم أكمل الطلب.",
  });
  const [submitting, setSubmitting] = useState(false);
  const [transferImageUrl, setTransferImageUrl] = useState("");
  const [uploadingTransfer, setUploadingTransfer] = useState(false);

  const zonesByCity = useMemo(() => {
    return zones.reduce((map, zone) => {
      const current = map.get(zone.city_id) || [];
      current.push(zone);
      map.set(zone.city_id, current);
      return map;
    }, new Map<string, CustomerZone[]>());
  }, [zones]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = activeCategory === "all" || product.category_id === activeCategory;
      const matchesSearch = !normalizedSearch || product.name_ar.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, search]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) || null;
  const selectedVariant =
    selectedProduct?.variants.find((variant) => variant.id === selectedVariantId) ||
    selectedProduct?.variants[0] ||
    null;
  const cityZones = address.cityId ? zonesByCity.get(address.cityId) || [] : [];
  const selectedZone = zones.find((zone) => zone.id === address.zoneId) || null;
  const deliveryFee = selectedZone?.delivery_fee || 0;
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  function openProduct(product: CustomerCatalogProduct) {
    setSelectedProductId(product.id);
    setSelectedVariantId(product.variants[0]?.id || "");
    setQuantity(1);
  }

  function selectSavedAddress(value: string) {
    setAddressMode(value);
    const saved = addresses.find((item) => item.id === value);

    if (saved) {
      setAddress(addressFromSaved(saved));
    } else {
      setAddress({ address: "", cityId: "", name: "", phone: "", zoneId: "" });
    }
  }

  function addSelectedToCart() {
    if (!selectedProduct || !selectedVariant) {
      setState({ tone: "error", message: "اختر منتجاً أولاً." });
      return;
    }

    if (selectedVariant.available_quantity <= 0) {
      setState({ tone: "error", message: "غير متوفر حالياً." });
      return;
    }

    const safeQuantity = Math.min(quantity, selectedVariant.available_quantity);
    const imageUrl = imageForProduct(selectedProduct, selectedVariant);
    const unitPrice = selectedProduct.customer_price + selectedVariant.extra_price;

    setCart((current) => {
      const existing = current.find((item) => item.variantId === selectedVariant.id);

      if (existing) {
        return current.map((item) =>
          item.variantId === selectedVariant.id
            ? { ...item, quantity: Math.min(item.quantity + safeQuantity, item.availableQuantity) }
            : item,
        );
      }

      return [
        ...current,
        {
          availableQuantity: selectedVariant.available_quantity,
          imageUrl,
          productName: selectedProduct.name_ar,
          quantity: safeQuantity,
          unitPrice,
          variantId: selectedVariant.id,
          variantLabel: createCustomerVariantLabel(selectedVariant),
        },
      ];
    });
    setState({ tone: "success", message: "تمت إضافة المنتج للسلة." });
  }

  function updateCartQuantity(variantId: string, nextQuantity: number) {
    if (nextQuantity <= 0) {
      setCart((current) => current.filter((item) => item.variantId !== variantId));
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: Math.min(nextQuantity, item.availableQuantity) }
          : item,
      ),
    );
  }

  async function uploadTransferImage(file: File) {
    setUploadingTransfer(true);
    setState({ tone: "idle", message: "جاري رفع صورة التحويل..." });
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/uploads/transfer", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      transfer_image_url?: string;
    };
    setUploadingTransfer(false);

    if (!response.ok || data.error || !data.transfer_image_url) {
      setState({ tone: "error", message: data.error || "تعذر رفع صورة التحويل." });
      return;
    }

    setTransferImageUrl(data.transfer_image_url);
    setState({ tone: "success", message: "تم رفع صورة التحويل." });
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cart.length) {
      setState({ tone: "error", message: "السلة فارغة." });
      return;
    }

    if (!address.name.trim() || !address.phone.trim() || !address.address.trim()) {
      setState({ tone: "error", message: "أكمل الاسم والهاتف والعنوان." });
      return;
    }

    if (!address.cityId || !address.zoneId) {
      setState({ tone: "error", message: "اختر المدينة والمنطقة." });
      return;
    }

    if (paymentMethod === "bank_transfer" && !transferImageUrl) {
      setState({ tone: "error", message: "أرفق صورة التحويل أولاً." });
      return;
    }

    setSubmitting(true);
    setState({ tone: "idle", message: "جاري إنشاء الطلب..." });

    const response = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city_id: address.cityId,
        customer_address: address.address,
        customer_name: address.name,
        customer_phone: address.phone,
        items: cart.map((item) => ({
          product_variant_id: item.variantId,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
        transfer_image_url: transferImageUrl || null,
        zone_id: address.zoneId,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      order?: { order_number?: number | null };
    };

    setSubmitting(false);

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر إنشاء الطلب." });
      return;
    }

    setCart([]);
    setTransferImageUrl("");
    setPaymentMethod("cash");
    setState({
      tone: "success",
      message: data.order?.order_number
        ? `تم إنشاء الطلب #${data.order.order_number}.`
        : "تم إنشاء الطلب بنجاح.",
    });
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث عن منتج"
              value={search}
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <CategoryButton active={activeCategory === "all"} label="الكل" onClick={() => setActiveCategory("all")} />
            {categories.map((category) => (
              <CategoryButton
                active={activeCategory === category.id}
                key={category.id}
                label={category.name_ar}
                onClick={() => setActiveCategory(category.id)}
              />
            ))}
          </div>
        </div>

        {selectedProduct ? (
          <ProductDetail
            onAdd={addSelectedToCart}
            product={selectedProduct}
            quantity={quantity}
            selectedVariant={selectedVariant}
            selectedVariantId={selectedVariantId}
            setQuantity={setQuantity}
            setSelectedVariantId={setSelectedVariantId}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {visibleProducts.length ? (
            visibleProducts.map((product) => (
              <button
                className="group overflow-hidden rounded-[1.15rem] border border-slate-200 bg-white text-right shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-950/10"
                key={product.id}
                onClick={() => openProduct(product)}
                type="button"
              >
                <ProductImage imageUrl={imageForProduct(product)} name={product.name_ar} />
                <div className="p-3">
                  <p className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-slate-950">
                    {product.name_ar}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                      {formatMoney(product.customer_price)}
                    </span>
                    <AvailabilityBadge available={product.available_quantity} />
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[1.1rem] bg-white p-5 text-sm font-bold text-slate-500 ring-1 ring-slate-200 sm:col-span-2">
              لا توجد منتجات مطابقة حالياً.
            </div>
          )}
        </div>
      </section>

      <form className="space-y-4" onSubmit={submitOrder}>
        <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <ShoppingBag size={18} />
            </span>
            <h3 className="text-base font-black text-slate-950">السلة</h3>
          </div>

          <div className="space-y-3">
            {cart.length ? (
              cart.map((item) => (
                <div className="rounded-[1.1rem] bg-slate-50 p-3 ring-1 ring-slate-100" key={item.variantId}>
                  <div className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[1rem] bg-white">
                      <ProductImage compact imageUrl={item.imageUrl} name={item.productName} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-black text-slate-950">{item.productName}</p>
                      <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">{item.variantLabel}</p>
                      <p className="mt-1 text-xs font-black text-emerald-700">{formatMoney(item.unitPrice)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      aria-label="حذف من السلة"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                      onClick={() => updateCartQuantity(item.variantId, 0)}
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                    <QuantityControl
                      max={item.availableQuantity}
                      quantity={item.quantity}
                      setQuantity={(next) => updateCartQuantity(item.variantId, next)}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] bg-slate-50 p-4 text-sm font-bold text-slate-500">
                السلة فارغة.
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 rounded-[1rem] bg-[#fff8ec] p-3 ring-1 ring-amber-100">
            <AmountLine label="المجموع" value={formatMoney(subtotal)} />
            <AmountLine label="سعر التوصيل" value={`${formatMoney(deliveryFee)} · يُحصَّل من مندوب التوصيل`} />
            <AmountLine label="الإجمالي" strong value={formatMoney(subtotal)} />
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-700">
              <MapPin size={18} />
            </span>
            <h3 className="text-base font-black text-slate-950">عنوان التوصيل</h3>
          </div>

          {addresses.length ? (
            <select className={`${inputClass} mb-3`} onChange={(event) => selectSavedAddress(event.target.value)} value={addressMode}>
              {addresses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} - {item.zone_name}
                </option>
              ))}
              <option value="new">عنوان جديد</option>
            </select>
          ) : null}

          <div className="space-y-3">
            <input
              className={inputClass}
              onChange={(event) => setAddress((current) => ({ ...current, name: event.target.value }))}
              placeholder="الاسم"
              value={address.name}
            />
            <input
              className={inputClass}
              inputMode="tel"
              onChange={(event) => setAddress((current) => ({ ...current, phone: event.target.value }))}
              placeholder="الهاتف"
              value={address.phone}
            />
            <textarea
              className={textareaClass}
              onChange={(event) => setAddress((current) => ({ ...current, address: event.target.value }))}
              placeholder="العنوان"
              value={address.address}
            />
            <select
              className={inputClass}
              onChange={(event) =>
                setAddress((current) => ({
                  ...current,
                  cityId: event.target.value,
                  zoneId: "",
                }))
              }
              value={address.cityId}
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
              disabled={!address.cityId}
              onChange={(event) => setAddress((current) => ({ ...current, zoneId: event.target.value }))}
              value={address.zoneId}
            >
              <option value="">المنطقة</option>
              {cityZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name_ar} - {formatMoney(zone.delivery_fee)}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-700">
              <CreditCard size={18} />
            </span>
            <h3 className="text-base font-black text-slate-950">طريقة الدفع</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <PaymentButton active={paymentMethod === "cash"} label="كاش" onClick={() => setPaymentMethod("cash")} />
            <PaymentButton active={paymentMethod === "bank_transfer"} label="تحويل" onClick={() => setPaymentMethod("bank_transfer")} />
          </div>

          {paymentMethod === "bank_transfer" ? (
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-[1rem] border border-dashed border-sky-200 bg-sky-50 px-4 py-4 text-sm font-black text-sky-700">
              {uploadingTransfer ? <Loader2 className="animate-spin" size={18} /> : <ImagePlus size={18} />}
              {transferImageUrl ? "صورة التحويل جاهزة" : "رفع صورة التحويل"}
              <input
                accept="image/*"
                className="hidden"
                disabled={uploadingTransfer}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadTransferImage(file);
                }}
                type="file"
              />
            </label>
          ) : null}
        </section>

        <Message state={state} />

        <button
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-black text-white shadow-sm shadow-emerald-950/10 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          disabled={submitting || uploadingTransfer || !cart.length}
          type="submit"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
          تأكيد الطلب
        </button>
      </form>
    </div>
  );
}

function ProductDetail({
  onAdd,
  product,
  quantity,
  selectedVariant,
  selectedVariantId,
  setQuantity,
  setSelectedVariantId,
}: {
  onAdd: () => void;
  product: CustomerCatalogProduct;
  quantity: number;
  selectedVariant: CustomerCatalogVariant | null;
  selectedVariantId: string;
  setQuantity: (quantity: number) => void;
  setSelectedVariantId: (id: string) => void;
}) {
  const imageUrl = imageForProduct(product, selectedVariant);
  const unitPrice = product.customer_price + Number(selectedVariant?.extra_price || 0);
  const available = Number(selectedVariant?.available_quantity || 0);

  return (
    <article className="rounded-[1.25rem] border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-950/5">
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="overflow-hidden rounded-[1.2rem] bg-slate-50">
          <ProductImage imageUrl={imageUrl} name={product.name_ar} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black text-emerald-700">{product.category_name || "منتج"}</p>
            <AvailabilityBadge available={available} />
          </div>
          <h3 className="mt-2 text-xl font-black leading-7 text-slate-950">{product.name_ar}</h3>
          {product.description_ar ? (
            <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-500">
              {product.description_ar}
            </p>
          ) : null}

          <p className="mt-3 text-2xl font-black text-emerald-700">{formatMoney(unitPrice)}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                className={`rounded-full px-3 py-2 text-xs font-black ring-1 transition ${
                  selectedVariantId === variant.id
                    ? "bg-sky-600 text-white ring-sky-600"
                    : "bg-slate-50 text-slate-600 ring-slate-100 hover:bg-sky-50 hover:text-sky-700"
                }`}
                key={variant.id}
                onClick={() => {
                  setSelectedVariantId(variant.id);
                  setQuantity(1);
                }}
                type="button"
              >
                {createCustomerVariantLabel(variant)}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <QuantityControl max={available || 1} quantity={quantity} setQuantity={setQuantity} />
            <button
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              disabled={!selectedVariant || available <= 0}
              onClick={onAdd}
              type="button"
            >
              <Plus size={17} />
              إضافة للسلة
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function CategoryButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ring-1 transition ${
        active
          ? "bg-emerald-600 text-white ring-emerald-600"
          : "bg-slate-50 text-slate-600 ring-slate-100 hover:bg-emerald-50 hover:text-emerald-700"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function AvailabilityBadge({ available }: { available: number }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${
        available > 0
          ? "bg-sky-50 text-sky-700 ring-sky-100"
          : "bg-slate-100 text-slate-500 ring-slate-200"
      }`}
    >
      {available > 0 ? "متوفر" : "غير متوفر"}
    </span>
  );
}

function ProductImage({
  compact = false,
  imageUrl,
  name,
}: {
  compact?: boolean;
  imageUrl: string | null;
  name: string;
}) {
  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-emerald-50 text-emerald-700 ${compact ? "h-full" : "aspect-[4/3]"}`}>
        <PackageSearch size={compact ? 20 : 34} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${compact ? "h-full w-full" : "aspect-[4/3] w-full"}`}>
      <Image alt={name} className="object-cover" fill sizes={compact ? "56px" : "(min-width: 640px) 50vw, 100vw"} src={imageUrl} />
    </div>
  );
}

function QuantityControl({
  max,
  quantity,
  setQuantity,
}: {
  max: number;
  quantity: number;
  setQuantity: (quantity: number) => void;
}) {
  return (
    <div className="inline-flex h-10 items-center rounded-full bg-white p-1 ring-1 ring-slate-200">
      <button
        aria-label="تقليل الكمية"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-700"
        onClick={() => setQuantity(Math.max(1, quantity - 1))}
        type="button"
      >
        <Minus size={15} />
      </button>
      <span className="min-w-10 text-center text-sm font-black text-slate-900">{quantity.toLocaleString("ar-LY")}</span>
      <button
        aria-label="زيادة الكمية"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
        onClick={() => setQuantity(Math.min(max, quantity + 1))}
        type="button"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

function PaymentButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`h-11 rounded-full text-sm font-black ring-1 transition ${
        active
          ? "bg-emerald-600 text-white ring-emerald-600"
          : "bg-slate-50 text-slate-600 ring-slate-100 hover:bg-emerald-50 hover:text-emerald-700"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function AmountLine({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? "text-sm font-black text-slate-950" : "text-xs font-bold text-slate-600"}>{label}</span>
      <span className={strong ? "text-base font-black text-emerald-700" : "text-sm font-black text-slate-800"}>{value}</span>
    </div>
  );
}

function Message({ state }: { state: ActionState }) {
  return (
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
  );
}

function imageForProduct(product: CustomerCatalogProduct, variant?: CustomerCatalogVariant | null) {
  return variant?.image_url || product.images[0]?.medium || product.images[0]?.large || product.images[0]?.thumb || null;
}

function createCustomerVariantLabel(variant: CustomerCatalogVariant) {
  return [variant.color, variant.size, variant.type].filter(Boolean).join(" / ") || "الخيار الأساسي";
}

function addressFromSaved(address?: CustomerAddress): AddressForm {
  if (!address) {
    return { address: "", cityId: "", name: "", phone: "", zoneId: "" };
  }

  return {
    address: address.address,
    cityId: address.city_id,
    name: address.recipient_name,
    phone: address.phone,
    zoneId: address.zone_id,
  };
}
