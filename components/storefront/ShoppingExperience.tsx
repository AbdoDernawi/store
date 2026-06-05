"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Heart,
  ImagePlus,
  Loader2,
  MapPin,
  Minus,
  PackageSearch,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { formatMoney } from "@/lib/admin/format";

export type StorefrontImage = {
  large?: string;
  medium?: string;
  thumb?: string;
};

export type StorefrontVariant = {
  availableQuantity?: number | null;
  color: string | null;
  extraPrice: number;
  id: string;
  imageUrl: string | null;
  size: string | null;
  type: string | null;
};

export type StorefrontProduct = {
  availableQuantity?: number | null;
  basePrice: number;
  categoryId: string | null;
  categoryName: string | null;
  description: string | null;
  id: string;
  images: StorefrontImage[];
  name: string;
  orderedQuantity: number;
  variants: StorefrontVariant[];
};

export type StorefrontCategory = {
  id: string;
  imageUrl: string | null;
  name: string;
};

export type StorefrontCity = {
  id: string;
  name: string;
};

export type StorefrontZone = {
  cityId: string;
  deliveryFee: number;
  id: string;
  name: string;
};

export type StorefrontRecipient = {
  address: string;
  cityId: string;
  helper: string | null;
  id: string;
  label: string;
  name: string;
  phone: string;
  zoneId: string;
};

type CartItem = {
  availableQuantity: number | null;
  imageUrl: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  variantId: string;
  variantLabel: string;
};

type RecipientForm = {
  address: string;
  cityId: string;
  name: string;
  phone: string;
  zoneId: string;
};

type ActionState = {
  message: string;
  tone: "error" | "idle" | "success";
};

type ShoppingExperienceProps = {
  categories: StorefrontCategory[];
  cities: StorefrontCity[];
  initialCategory?: string;
  mode: "customer" | "marketer";
  products: StorefrontProduct[];
  recipients: StorefrontRecipient[];
  zones: StorefrontZone[];
};

const inputClass =
  "h-12 w-full rounded-[1rem] border border-[#e7ddd2] bg-[#fcfbf8] px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#b58a63] focus:bg-white focus:ring-4 focus:ring-[#eadccf]";
const textareaClass =
  "min-h-28 w-full rounded-[1rem] border border-[#e7ddd2] bg-[#fcfbf8] px-4 py-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#b58a63] focus:bg-white focus:ring-4 focus:ring-[#eadccf]";

export function ShoppingExperience({
  categories,
  cities,
  initialCategory = "all",
  mode,
  products,
  recipients,
  zones,
}: ShoppingExperienceProps) {
  const router = useRouter();
  const firstProduct = products.find(productCanBeOrdered) || products[0] || null;
  const firstRecipient = mode === "customer" ? recipients[0] : null;
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "cash">("cash");
  const [quantity, setQuantity] = useState(1);
  const [recipientMode, setRecipientMode] = useState(firstRecipient?.id || "new");
  const [recipient, setRecipient] = useState<RecipientForm>(() => recipientFromSaved(firstRecipient));
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(firstProduct?.id || null);
  const [selectedVariantId, setSelectedVariantId] = useState(firstProduct?.variants[0]?.id || "");
  const [cartOpen, setCartOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [state, setState] = useState<ActionState>({
    message:
      mode === "customer"
        ? "اختر ما يعجبك ثم أكمل بيانات التوصيل."
        : "اختر المنتجات ثم أكمل بيانات الزبون.",
    tone: "idle",
  });
  const [submitting, setSubmitting] = useState(false);
  const [transferImageUrl, setTransferImageUrl] = useState("");
  const [uploadingTransfer, setUploadingTransfer] = useState(false);
  const favoriteStorageKey = `storefront-favorites:${mode}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(favoriteStorageKey);

      if (saved) {
        setFavoriteIds(JSON.parse(saved) as string[]);
      }
    } catch {
      setFavoriteIds([]);
    }
  }, [favoriteStorageKey]);

  const zonesByCity = useMemo(() => {
    return zones.reduce((map, zone) => {
      const current = map.get(zone.cityId) || [];
      current.push(zone);
      map.set(zone.cityId, current);
      return map;
    }, new Map<string, StorefrontZone[]>());
  }, [zones]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = activeCategory === "all" || product.categoryId === activeCategory;
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.categoryName?.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, search]);

  const latestProducts = filteredProducts.slice(0, 8);
  const popularProducts = useMemo(() => {
    return [...filteredProducts]
      .sort((left, right) => {
        if (left.orderedQuantity !== right.orderedQuantity) {
          return right.orderedQuantity - left.orderedQuantity;
        }

        return right.variants.length - left.variants.length;
      })
      .slice(0, 8);
  }, [filteredProducts]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) || null;
  const selectedVariant =
    selectedProduct?.variants.find((variant) => variant.id === selectedVariantId) ||
    selectedProduct?.variants[0] ||
    null;
  const cityZones = recipient.cityId ? zonesByCity.get(recipient.cityId) || [] : [];
  const selectedZone = zones.find((zone) => zone.id === recipient.zoneId) || null;
  const deliveryFee = selectedZone?.deliveryFee || 0;
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const orderTotal = subtotal + deliveryFee;
  const favoriteProducts = useMemo(
    () => products.filter((product) => favoriteIds.includes(product.id)),
    [favoriteIds, products],
  );
  const heroProduct = latestProducts[0] || firstProduct;

  function openProduct(product: StorefrontProduct) {
    setSelectedProductId(product.id);
    setSelectedVariantId(product.variants[0]?.id || "");
    setQuantity(1);
    setProductModalOpen(true);
  }

  function toggleFavorite(productId: string) {
    setFavoriteIds((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];

      try {
        window.localStorage.setItem(favoriteStorageKey, JSON.stringify(next));
      } catch {
        return next;
      }

      return next;
    });
  }

  function selectSavedRecipient(value: string) {
    setRecipientMode(value);
    const saved = recipients.find((item) => item.id === value);

    if (saved) {
      setRecipient(recipientFromSaved(saved));
      return;
    }

    setRecipient(emptyRecipient());
  }

  function applyRecipientMatch(value: string) {
    const normalized = value.trim();
    const match = recipients.find((item) => item.phone === normalized || item.name === normalized);

    if (!match) {
      return;
    }

    setRecipient(recipientFromSaved(match));
    setState({ message: "تمت تعبئة بيانات الزبون المحفوظة.", tone: "success" });
  }

  function addSelectedToCart() {
    if (!selectedProduct || !selectedVariant) {
      setState({ message: "اختر منتجًا وخيارًا أولًا.", tone: "error" });
      return;
    }

    const availableQuantity = getVariantLimit(selectedVariant);

    if (availableQuantity !== null && availableQuantity <= 0) {
      setState({ message: "هذا الخيار غير متوفر حاليًا.", tone: "error" });
      return;
    }

    const safeQuantity =
      availableQuantity === null ? quantity : Math.min(quantity, Math.max(availableQuantity, 1));
    const imageUrl = imageForProduct(selectedProduct, selectedVariant);
    const unitPrice = selectedProduct.basePrice + selectedVariant.extraPrice;

    setCart((current) => {
      const existing = current.find((item) => item.variantId === selectedVariant.id);

      if (existing) {
        const nextQuantity =
          availableQuantity === null
            ? existing.quantity + safeQuantity
            : Math.min(existing.quantity + safeQuantity, availableQuantity);

        return current.map((item) =>
          item.variantId === selectedVariant.id ? { ...item, quantity: nextQuantity } : item,
        );
      }

      return [
        ...current,
        {
          availableQuantity,
          imageUrl,
          productName: selectedProduct.name,
          quantity: safeQuantity,
          unitPrice,
          variantId: selectedVariant.id,
          variantLabel: createVariantLabel(selectedVariant),
        },
      ];
    });
    setState({ message: "تمت إضافة المنتج للسلة.", tone: "success" });
  }

  function addSelectedToCartAndOpenCart() {
    if (!selectedProduct || !selectedVariant) {
      addSelectedToCart();
      return;
    }

    const availableQuantity = getVariantLimit(selectedVariant);

    if (availableQuantity !== null && availableQuantity <= 0) {
      addSelectedToCart();
      return;
    }

    addSelectedToCart();
    setProductModalOpen(false);
    setCartOpen(true);
  }

  function updateCartQuantity(variantId: string, nextQuantity: number) {
    if (nextQuantity <= 0) {
      setCart((current) => current.filter((item) => item.variantId !== variantId));
      return;
    }

    setCart((current) =>
      current.map((item) => {
        if (item.variantId !== variantId) {
          return item;
        }

        return {
          ...item,
          quantity:
            item.availableQuantity === null
              ? nextQuantity
              : Math.min(nextQuantity, item.availableQuantity),
        };
      }),
    );
  }

  async function uploadTransferImage(file: File) {
    setUploadingTransfer(true);
    setState({ message: "جاري رفع صورة التحويل...", tone: "idle" });
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/uploads/transfer", {
      body: formData,
      method: "POST",
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      transfer_image_url?: string;
    };
    setUploadingTransfer(false);

    if (!response.ok || data.error || !data.transfer_image_url) {
      setState({ message: data.error || "تعذر رفع صورة التحويل.", tone: "error" });
      return;
    }

    setTransferImageUrl(data.transfer_image_url);
    setState({ message: "صورة التحويل جاهزة.", tone: "success" });
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cart.length) {
      setState({ message: "السلة فارغة.", tone: "error" });
      return;
    }

    if (!recipient.name.trim() || !recipient.phone.trim() || !recipient.address.trim()) {
      setState({
        message:
          mode === "customer"
            ? "أكمل الاسم والهاتف والعنوان."
            : "أكمل اسم الزبون والهاتف والعنوان.",
        tone: "error",
      });
      return;
    }

    if (!recipient.cityId || !recipient.zoneId) {
      setState({ message: "اختر المدينة والمنطقة.", tone: "error" });
      return;
    }

    if (paymentMethod === "bank_transfer" && !transferImageUrl) {
      setState({ message: "أرفق صورة التحويل أولًا.", tone: "error" });
      return;
    }

    setSubmitting(true);
    setState({ message: "جاري إنشاء الطلب...", tone: "idle" });

    const response = await fetch("/api/orders/create", {
      body: JSON.stringify({
        city_id: recipient.cityId,
        customer_address: recipient.address,
        customer_name: recipient.name,
        customer_phone: recipient.phone,
        items: cart.map((item) => ({
          product_variant_id: item.variantId,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
        transfer_image_url: transferImageUrl || null,
        zone_id: recipient.zoneId,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      order?: { order_number?: number | null };
    };

    setSubmitting(false);

    if (!response.ok || data.error) {
      setState({ message: data.error || "تعذر إنشاء الطلب.", tone: "error" });
      return;
    }

    setCart([]);
    setPaymentMethod("cash");
    setTransferImageUrl("");

    if (mode === "marketer") {
      setRecipient(emptyRecipient());
    }

    setState({
      message: data.order?.order_number
        ? `تم إنشاء الطلب #${data.order.order_number}.`
        : "تم إنشاء الطلب بنجاح.",
      tone: "success",
    });
    router.refresh();
  }

  return (
    <div className="space-y-5" dir="rtl">
      <StorefrontHero
        cartItems={cart.length}
        favoriteCount={favoriteIds.length}
        heroProduct={heroProduct}
        mode={mode}
        onOpenCart={() => setCartOpen(true)}
        onOpenFavorites={() => setFavoritesOpen(true)}
        onOpenProduct={openProduct}
        search={search}
        setSearch={setSearch}
      />

      <CategoryStrip
        activeCategory={activeCategory}
        categories={categories}
        onSelect={setActiveCategory}
      />

      <div className="grid gap-5">
        <section className="min-w-0 space-y-5">
          <ProductShelf
            emptyMessage="لا توجد منتجات مطابقة الآن."
            favoriteIds={favoriteIds}
            onFavorite={toggleFavorite}
            onOpen={openProduct}
            products={latestProducts}
            title="أحدث المنتجات"
          />
          <ProductShelf
            emptyMessage="ستظهر المنتجات الأكثر طلبًا هنا بعد توفر بياناتها."
            favoriteIds={favoriteIds}
            onFavorite={toggleFavorite}
            onOpen={openProduct}
            products={popularProducts}
            title="الأكثر طلبًا"
          />
        </section>
      </div>

      <form
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start"
        onSubmit={submitOrder}
      >
        <CartPanel
          cart={cart}
          deliveryFee={deliveryFee}
          subtotal={subtotal}
          updateCartQuantity={updateCartQuantity}
        />

        <div className="space-y-4 xl:sticky xl:top-5">
          <RecipientPanel
            cities={cities}
            mode={mode}
            onMatch={applyRecipientMatch}
            recipient={recipient}
            recipientMode={recipientMode}
            recipients={recipients}
            selectSavedRecipient={selectSavedRecipient}
            setRecipient={setRecipient}
            zones={cityZones}
          />
          <PaymentPanel
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            transferImageUrl={transferImageUrl}
            uploadingTransfer={uploadingTransfer}
            uploadTransferImage={uploadTransferImage}
          />
          <Message state={state} />
          <button
            className="flex h-[3.25rem] min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-[#8b6548] px-5 text-sm font-black text-white shadow-[0_16px_35px_rgba(93,63,42,0.2)] transition hover:bg-[#745238] disabled:cursor-not-allowed disabled:bg-[#e9e2d9] disabled:text-[#9f9489]"
            disabled={submitting || uploadingTransfer || !cart.length}
            type="submit"
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            تأكيد الطلب
          </button>
        </div>
      </form>

      <FloatingCartButton
        count={cart.length}
        onClick={() => setCartOpen(true)}
        total={orderTotal}
      />

      <StorefrontModal
        onClose={() => setProductModalOpen(false)}
        open={productModalOpen && Boolean(selectedProduct)}
      >
        {selectedProduct ? (
          <ProductDetail
            favorite={favoriteIds.includes(selectedProduct.id)}
            onAdd={addSelectedToCartAndOpenCart}
            onFavorite={() => toggleFavorite(selectedProduct.id)}
            onSelectVariant={setSelectedVariantId}
            product={selectedProduct}
            quantity={quantity}
            selectedVariant={selectedVariant}
            setQuantity={setQuantity}
          />
        ) : null}
      </StorefrontModal>

      <StorefrontModal
        maxWidth="max-w-[760px]"
        onClose={() => setCartOpen(false)}
        open={cartOpen}
        title="السلة"
      >
        <CartPanel
          cart={cart}
          deliveryFee={deliveryFee}
          subtotal={subtotal}
          updateCartQuantity={updateCartQuantity}
        />
      </StorefrontModal>

      <StorefrontModal
        maxWidth="max-w-[760px]"
        onClose={() => setFavoritesOpen(false)}
        open={favoritesOpen}
        title="المفضلة"
      >
        <FavoritesPanel
          favoriteIds={favoriteIds}
          onFavorite={toggleFavorite}
          onOpen={(product) => {
            setFavoritesOpen(false);
            openProduct(product);
          }}
          products={favoriteProducts}
        />
      </StorefrontModal>
    </div>
  );
}

function StorefrontHero({
  cartItems,
  favoriteCount,
  heroProduct,
  mode,
  onOpenCart,
  onOpenFavorites,
  onOpenProduct,
  search,
  setSearch,
}: {
  cartItems: number;
  favoriteCount: number;
  heroProduct: StorefrontProduct | null;
  mode: "customer" | "marketer";
  onOpenCart: () => void;
  onOpenFavorites: () => void;
  onOpenProduct: (product: StorefrontProduct) => void;
  search: string;
  setSearch: (value: string) => void;
}) {
  const imageUrl = heroProduct ? imageForProduct(heroProduct) : null;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#eee5db] bg-white p-3 shadow-[0_22px_70px_rgba(59,45,33,0.08)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#998d82]"
            size={18}
          />
          <input
            className="h-[3.25rem] min-h-[3.25rem] w-full rounded-[1.15rem] border border-[#ece2d6] bg-[#fcfbf8] pr-12 pl-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-[#a89d93] focus:border-[#b58a63] focus:bg-white focus:ring-4 focus:ring-[#eadccf]"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث عن منتج"
            value={search}
          />
        </label>

        <div className="flex gap-2">
          <StatusButton icon={Heart} label="المفضلة" value={favoriteCount} />
          <StatusButton icon={ShoppingBag} label="السلة" value={cartItems} />
          <span
            aria-label="الفلاتر"
            className="flex h-[3.25rem] min-h-[3.25rem] w-[3.25rem] min-w-[3.25rem] items-center justify-center rounded-[1.15rem] bg-[#8b6548] text-white shadow-sm"
            title="الفلاتر"
          >
            <SlidersHorizontal size={18} />
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
        <button
          className="h-11 rounded-full bg-[#f8f4ed] text-xs font-black text-[#8b6548] ring-1 ring-[#eadccf]"
          onClick={onOpenFavorites}
          type="button"
        >
          المفضلة ({favoriteCount.toLocaleString("ar-LY")})
        </button>
        <button
          className="h-11 rounded-full bg-[#8b6548] text-xs font-black text-white"
          onClick={onOpenCart}
          type="button"
        >
          السلة ({cartItems.toLocaleString("ar-LY")})
        </button>
      </div>

      <div className="relative mt-3 min-h-[215px] overflow-hidden rounded-[1.7rem] bg-[#f3eadf] ring-1 ring-[#eadccf]">
        <div className="absolute inset-y-0 left-0 w-[47%]">
          <ProductImage
            imageUrl={imageUrl}
            name={heroProduct?.name || "تشكيلة المتجر"}
            sizes="(min-width: 1024px) 24vw, 47vw"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(243,234,223,0.05)_0%,rgba(243,234,223,0.96)_47%,rgba(243,234,223,1)_100%)]" />
        <div className="relative z-10 flex min-h-[215px] max-w-[62%] flex-col justify-center px-5 py-6 sm:max-w-[56%] sm:px-7">
          <p className="inline-flex w-fit items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-[#8b6548] ring-1 ring-white">
            <Sparkles size={13} />
            {mode === "customer" ? "تشكيلة جديدة" : "كتالوج الزبائن"}
          </p>
          <h2 className="mt-3 text-balance text-2xl font-black leading-8 text-[#29252b] sm:text-3xl sm:leading-10">
            تسوق بسلاسة واكتشف ما يناسبك
          </h2>
          <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-[#6f665e]">
            {heroProduct?.name || "المنتجات الجاهزة للطلب تظهر هنا."}
          </p>
          {heroProduct ? (
            <button
              className="mt-4 inline-flex h-11 w-fit items-center justify-center rounded-full bg-[#8b6548] px-5 text-sm font-black text-white transition hover:bg-[#745238]"
              onClick={() => onOpenProduct(heroProduct)}
              type="button"
            >
              تسوق الآن
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StatusButton({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Heart;
  label: string;
  value: number;
}) {
  return (
    <span
      aria-label={label}
      className="relative flex h-[3.25rem] min-h-[3.25rem] w-[3.25rem] min-w-[3.25rem] items-center justify-center rounded-[1.15rem] bg-[#f7f2ea] text-[#65584d] ring-1 ring-[#eadccf]"
      title={label}
    >
      <Icon size={18} />
      {value ? (
        <strong className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#24252f] px-1 text-[10px] font-black text-white">
          {value.toLocaleString("ar-LY")}
        </strong>
      ) : null}
    </span>
  );
}

function FloatingCartButton({
  count,
  onClick,
  total,
}: {
  count: number;
  onClick: () => void;
  total: number;
}) {
  return (
    <button
      aria-label="فتح السلة"
      className="fixed bottom-24 left-4 z-40 flex min-h-[3.5rem] items-center gap-3 rounded-full bg-[#8b6548] px-4 text-white shadow-[0_18px_45px_rgba(78,55,37,0.28)] transition hover:-translate-y-0.5 hover:bg-[#745238]"
      onClick={onClick}
      type="button"
    >
      <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
        <ShoppingBag size={20} />
        {count ? (
          <strong className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#24252f] px-1 text-[10px] font-black">
            {count.toLocaleString("ar-LY")}
          </strong>
        ) : null}
      </span>
      <span className="text-right">
        <span className="block text-[11px] font-black text-white/75">السلة</span>
        <span className="block text-sm font-black">{formatMoney(total)}</span>
      </span>
    </button>
  );
}

function StorefrontModal({
  children,
  maxWidth = "max-w-[430px]",
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  maxWidth?: string;
  onClose: () => void;
  open: boolean;
  title?: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#241b14]/35 p-2 backdrop-blur-sm sm:items-center sm:p-5">
      <div
        className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-[2rem] bg-white p-2 shadow-[0_24px_80px_rgba(36,27,20,0.22)]`}
        dir="rtl"
      >
        <div className="mb-2 flex items-center justify-between gap-3 px-2 pt-1">
          {title ? <h3 className="text-base font-black text-[#29252b]">{title}</h3> : <span />}
          <button
            aria-label="إغلاق"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8f4ed] text-[#65584d] ring-1 ring-[#eadccf]"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FavoritesPanel({
  favoriteIds,
  onFavorite,
  onOpen,
  products,
}: {
  favoriteIds: string[];
  onFavorite: (id: string) => void;
  onOpen: (product: StorefrontProduct) => void;
  products: StorefrontProduct[];
}) {
  if (!products.length) {
    return (
      <div className="rounded-[1.5rem] bg-[#faf7f2] p-6 text-sm font-bold leading-6 text-[#7b7067] ring-1 ring-[#efe4d8]">
        لم تضف منتجات إلى المفضلة بعد. اضغط على القلب فوق أي منتج وسيظهر هنا بسرعة.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {products.map((product) => (
        <ProductCard
          favorite={favoriteIds.includes(product.id)}
          key={`favorite-${product.id}`}
          onFavorite={() => onFavorite(product.id)}
          onOpen={() => onOpen(product)}
          product={product}
        />
      ))}
    </div>
  );
}

function CategoryStrip({
  activeCategory,
  categories,
  onSelect,
}: {
  activeCategory: string;
  categories: StorefrontCategory[];
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-[1.7rem] border border-[#eee5db] bg-white p-4 shadow-sm shadow-[#4b3c2e]/5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-[#29252b]">الأقسام</h3>
        <span className="text-xs font-black text-[#8b6548]">كل ما يلزمك قريب</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        <CategoryButton
          active={activeCategory === "all"}
          label="الكل"
          onClick={() => onSelect("all")}
        />
        {categories.map((category) => (
          <CategoryButton
            active={activeCategory === category.id}
            imageUrl={category.imageUrl}
            key={category.id}
            label={category.name}
            onClick={() => onSelect(category.id)}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryButton({
  active,
  imageUrl,
  label,
  onClick,
}: {
  active: boolean;
  imageUrl?: string | null;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="group w-20 shrink-0 text-center" onClick={onClick} type="button">
      <span
        className={`relative mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ring-1 transition ${
          active
            ? "bg-[#8b6548] text-white ring-[#8b6548] shadow-[0_12px_25px_rgba(111,79,56,0.2)]"
            : "bg-[#f8f4ed] text-[#8b6548] ring-[#eadccf] group-hover:bg-[#efe2d4]"
        }`}
      >
        {imageUrl ? (
          <Image alt="" className="object-cover" fill sizes="64px" src={imageUrl} />
        ) : (
          <ShoppingBag size={22} />
        )}
      </span>
      <span className="mt-2 block truncate text-xs font-black text-[#534b45]">{label}</span>
    </button>
  );
}

function ProductShelf({
  emptyMessage,
  favoriteIds,
  onFavorite,
  onOpen,
  products,
  title,
}: {
  emptyMessage: string;
  favoriteIds: string[];
  onFavorite: (id: string) => void;
  onOpen: (product: StorefrontProduct) => void;
  products: StorefrontProduct[];
  title: string;
}) {
  return (
    <section className="rounded-[1.7rem] border border-[#eee5db] bg-white p-4 shadow-sm shadow-[#4b3c2e]/5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-[#29252b]">{title}</h3>
        <span className="rounded-full bg-[#f8f4ed] px-3 py-1 text-xs font-black text-[#8b6548] ring-1 ring-[#eadccf]">
          {products.length.toLocaleString("ar-LY")}
        </span>
      </div>

      {products.length ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {products.map((product) => (
            <ProductCard
              favorite={favoriteIds.includes(product.id)}
              key={`${title}-${product.id}`}
              onFavorite={() => onFavorite(product.id)}
              onOpen={() => onOpen(product)}
              product={product}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.2rem] bg-[#faf7f2] p-5 text-sm font-bold text-[#8a7d72] ring-1 ring-[#efe4d8]">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

function ProductCard({
  favorite,
  onFavorite,
  onOpen,
  product,
}: {
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
  product: StorefrontProduct;
}) {
  return (
    <article className="relative w-[188px] shrink-0 overflow-hidden rounded-[1.5rem] bg-[#fbfaf7] ring-1 ring-[#eadfd3] transition hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(71,54,39,0.1)] sm:w-[214px]">
      <button
        aria-label={favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        className={`absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur transition ${
          favorite ? "bg-[#8b6548] text-white" : "bg-white/90 text-[#8b6548]"
        }`}
        onClick={onFavorite}
        type="button"
      >
        <Heart className={favorite ? "fill-current" : ""} size={18} />
      </button>
      <button className="block w-full text-right" onClick={onOpen} type="button">
        <div className="overflow-hidden rounded-b-[1.5rem] bg-[#f5efe6]">
          <ProductImage
            imageUrl={imageForProduct(product)}
            name={product.name}
            sizes="(min-width: 640px) 214px, 188px"
          />
        </div>
        <div className="p-3">
          <p className="truncate text-xs font-black text-[#8b6548]">
            {product.categoryName || "منتج"}
          </p>
          <h4 className="mt-1 line-clamp-2 min-h-11 text-sm font-black leading-5 text-[#29252b]">
            {product.name}
          </h4>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-sm font-black text-[#29252b]">{formatMoney(product.basePrice)}</span>
            <ProductAvailability product={product} />
          </div>
        </div>
      </button>
    </article>
  );
}

function ProductDetail({
  favorite,
  onAdd,
  onFavorite,
  onSelectVariant,
  product,
  quantity,
  selectedVariant,
  setQuantity,
}: {
  favorite: boolean;
  onAdd: () => void;
  onFavorite: () => void;
  onSelectVariant: (id: string) => void;
  product: StorefrontProduct;
  quantity: number;
  selectedVariant: StorefrontVariant | null;
  setQuantity: (quantity: number) => void;
}) {
  const gallery = useMemo(() => galleryForProduct(product, selectedVariant), [product, selectedVariant]);
  const [activeImage, setActiveImage] = useState(gallery[0] || null);
  const sizeOptions = optionValues(product.variants, "size");
  const colorOptions = optionValues(product.variants, "color");
  const typeOptions = optionValues(product.variants, "type");
  const availableQuantity = selectedVariant ? getVariantLimit(selectedVariant) : null;
  const maximumQuantity = availableQuantity === null ? quantity + 20 : Math.max(availableQuantity, 1);
  const unitPrice = product.basePrice + Number(selectedVariant?.extraPrice || 0);

  useEffect(() => {
    setActiveImage(gallery[0] || null);
  }, [gallery]);

  function chooseOption(field: "color" | "size" | "type", value: string) {
    const nextVariant = pickVariant(product.variants, selectedVariant, field, value);

    if (nextVariant) {
      onSelectVariant(nextVariant.id);
      setQuantity(1);
    }
  }

  return (
    <article className="overflow-hidden rounded-[2rem] border border-[#eee5db] bg-white shadow-[0_24px_70px_rgba(59,45,33,0.1)]">
      <div className="relative bg-[#f5efe6]">
        <div className="relative aspect-[4/5]">
          <ProductImage
            imageUrl={activeImage}
            name={product.name}
            priority
            sizes="(min-width: 1280px) 390px, 100vw"
          />
        </div>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#4e463f] shadow-sm backdrop-blur">
            <ArrowLeft size={18} />
          </span>
          <button
            aria-label={favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
            className={`flex h-11 w-11 items-center justify-center rounded-full shadow-sm backdrop-blur ${
              favorite ? "bg-[#8b6548] text-white" : "bg-white/90 text-[#8b6548]"
            }`}
            onClick={onFavorite}
            type="button"
          >
            <Heart className={favorite ? "fill-current" : ""} size={19} />
          </button>
        </div>

        {gallery.length > 1 ? (
          <div className="absolute inset-x-4 bottom-4 flex gap-2 overflow-x-auto rounded-[1rem] bg-white/85 p-2 shadow-sm backdrop-blur">
            {gallery.map((imageUrl) => (
              <button
                aria-label="اختيار صورة المنتج"
                className={`relative h-14 w-12 shrink-0 overflow-hidden rounded-[0.8rem] ring-2 ${
                  activeImage === imageUrl ? "ring-[#8b6548]" : "ring-white"
                }`}
                key={imageUrl}
                onClick={() => setActiveImage(imageUrl)}
                type="button"
              >
                <Image alt="" className="object-cover" fill sizes="48px" src={imageUrl} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#9a8b7e]">
              {product.categoryName || "منتج"}
            </p>
            <h3 className="mt-1 text-2xl font-black leading-8 text-[#29252b]">{product.name}</h3>
          </div>
          <ProductAvailability product={product} variant={selectedVariant} />
        </div>

        {product.description ? (
          <p className="line-clamp-3 text-sm font-bold leading-6 text-[#746b63]">
            {product.description}
          </p>
        ) : null}

        {sizeOptions.length ? (
          <OptionGroup
            label="المقاس"
            onPick={(value) => chooseOption("size", value)}
            selectedValue={selectedVariant?.size || null}
            values={sizeOptions}
          />
        ) : null}
        {colorOptions.length ? (
          <OptionGroup
            label="اللون"
            onPick={(value) => chooseOption("color", value)}
            selectedValue={selectedVariant?.color || null}
            values={colorOptions}
          />
        ) : null}
        {typeOptions.length ? (
          <OptionGroup
            label="الخيار"
            onPick={(value) => chooseOption("type", value)}
            selectedValue={selectedVariant?.type || null}
            values={typeOptions}
          />
        ) : null}

        {!sizeOptions.length && !colorOptions.length && !typeOptions.length && selectedVariant ? (
          <p className="rounded-full bg-[#f8f4ed] px-4 py-2 text-xs font-black text-[#8b6548] ring-1 ring-[#eadccf]">
            {createVariantLabel(selectedVariant)}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-[#efe5da] pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#95887d]">السعر</p>
              <p className="text-2xl font-black text-[#29252b]">{formatMoney(unitPrice)}</p>
            </div>
            <QuantityControl
              max={maximumQuantity}
              quantity={quantity}
              setQuantity={setQuantity}
            />
          </div>
          <button
            className="inline-flex h-[3.25rem] min-h-[3.25rem] items-center justify-center gap-2 rounded-full bg-[#8b6548] px-5 text-sm font-black text-white transition hover:bg-[#745238] disabled:cursor-not-allowed disabled:bg-[#ebe3da] disabled:text-[#998d82]"
            disabled={!selectedVariant || (availableQuantity !== null && availableQuantity <= 0)}
            onClick={onAdd}
            type="button"
          >
            <ShoppingBag size={18} />
            إضافة للسلة
          </button>
        </div>
      </div>
    </article>
  );
}

function OptionGroup({
  label,
  onPick,
  selectedValue,
  values,
}: {
  label: string;
  onPick: (value: string) => void;
  selectedValue: string | null;
  values: string[];
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-[#534b45]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            className={`min-h-10 rounded-[0.9rem] px-3 text-xs font-black ring-1 transition ${
              selectedValue === value
                ? "bg-[#8b6548] text-white ring-[#8b6548]"
                : "bg-[#fbfaf7] text-[#534b45] ring-[#eadccf] hover:bg-[#f0e3d5]"
            }`}
            key={`${label}-${value}`}
            onClick={() => onPick(value)}
            type="button"
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

function CartPanel({
  cart,
  deliveryFee,
  subtotal,
  updateCartQuantity,
}: {
  cart: CartItem[];
  deliveryFee: number;
  subtotal: number;
  updateCartQuantity: (variantId: string, nextQuantity: number) => void;
}) {
  return (
    <section className="rounded-[1.9rem] border border-[#eee5db] bg-white p-4 shadow-sm shadow-[#4b3c2e]/5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5e9db] text-[#8b6548]">
            <ShoppingBag size={20} />
          </span>
          <div>
            <p className="text-xs font-black text-[#9a8b7e]">سلتك</p>
            <h3 className="text-lg font-black text-[#29252b]">جاهزة للمراجعة</h3>
          </div>
        </div>
        <span className="rounded-full bg-[#24252f] px-3 py-1 text-xs font-black text-white">
          {cart.length.toLocaleString("ar-LY")}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {cart.length ? (
          cart.map((item) => (
            <article
              className="rounded-[1.35rem] bg-[#fbfaf7] p-3 ring-1 ring-[#eee3d8]"
              key={item.variantId}
            >
              <div className="flex gap-3">
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-[1rem] bg-[#f4ede4]">
                  <ProductImage compact imageUrl={item.imageUrl} name={item.productName} sizes="64px" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="line-clamp-2 text-sm font-black leading-5 text-[#29252b]">
                    {item.productName}
                  </h4>
                  <p className="mt-1 line-clamp-1 text-xs font-bold text-[#8a7d72]">
                    {item.variantLabel}
                  </p>
                  <p className="mt-2 text-sm font-black text-[#8b6548]">{formatMoney(item.unitPrice)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  aria-label="حذف من السلة"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff0ee] text-rose-700 ring-1 ring-rose-100"
                  onClick={() => updateCartQuantity(item.variantId, 0)}
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
                <QuantityControl
                  max={item.availableQuantity === null ? item.quantity + 20 : Math.max(item.availableQuantity, 1)}
                  quantity={item.quantity}
                  setQuantity={(next) => updateCartQuantity(item.variantId, next)}
                />
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[1.3rem] bg-[#faf7f2] p-5 text-sm font-bold text-[#8a7d72] ring-1 ring-[#efe4d8] md:col-span-2">
            أضف منتجًا لتظهر تفاصيل السلة هنا.
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2 rounded-[1.35rem] bg-[#f6eee4] p-4 ring-1 ring-[#eadccf] sm:grid-cols-3">
        <AmountLine label="المنتجات" value={formatMoney(subtotal)} />
        <AmountLine label="التوصيل" value={formatMoney(deliveryFee)} />
        <AmountLine label="إجمالي الطلب" strong value={formatMoney(subtotal)} />
      </div>
    </section>
  );
}

function RecipientPanel({
  cities,
  mode,
  onMatch,
  recipient,
  recipientMode,
  recipients,
  selectSavedRecipient,
  setRecipient,
  zones,
}: {
  cities: StorefrontCity[];
  mode: "customer" | "marketer";
  onMatch: (value: string) => void;
  recipient: RecipientForm;
  recipientMode: string;
  recipients: StorefrontRecipient[];
  selectSavedRecipient: (value: string) => void;
  setRecipient: React.Dispatch<React.SetStateAction<RecipientForm>>;
  zones: StorefrontZone[];
}) {
  return (
    <section className="rounded-[1.7rem] border border-[#eee5db] bg-white p-4 shadow-sm shadow-[#4b3c2e]/5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5e9db] text-[#8b6548]">
          {mode === "customer" ? <MapPin size={18} /> : <UserRound size={18} />}
        </span>
        <div>
          <p className="text-xs font-black text-[#9a8b7e]">
            {mode === "customer" ? "التوصيل" : "بيانات الطلب"}
          </p>
          <h3 className="text-base font-black text-[#29252b]">
            {mode === "customer" ? "عنوانك" : "بيانات الزبون"}
          </h3>
        </div>
      </div>

      {mode === "customer" && recipients.length ? (
        <select
          className={`${inputClass} mb-3`}
          onChange={(event) => selectSavedRecipient(event.target.value)}
          value={recipientMode}
        >
          {recipients.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} {item.helper ? `- ${item.helper}` : ""}
            </option>
          ))}
          <option value="new">عنوان جديد</option>
        </select>
      ) : null}

      {mode === "marketer" && recipients.length ? (
        <datalist id="storefront-recipients">
          {recipients.map((item) => (
            <option key={item.id} value={item.phone}>
              {item.name}
            </option>
          ))}
        </datalist>
      ) : null}

      <div className="space-y-3">
        {mode === "marketer" ? (
          <input
            className={inputClass}
            list="storefront-recipients"
            onBlur={(event) => onMatch(event.target.value)}
            onChange={(event) => {
              setRecipient((current) => ({ ...current, phone: event.target.value }));
              onMatch(event.target.value);
            }}
            placeholder="هاتف الزبون"
            value={recipient.phone}
          />
        ) : null}
        <input
          className={inputClass}
          onBlur={(event) => {
            if (mode === "marketer") {
              onMatch(event.target.value);
            }
          }}
          onChange={(event) => setRecipient((current) => ({ ...current, name: event.target.value }))}
          placeholder={mode === "customer" ? "الاسم" : "اسم الزبون"}
          value={recipient.name}
        />
        {mode === "customer" ? (
          <input
            className={inputClass}
            inputMode="tel"
            onChange={(event) => setRecipient((current) => ({ ...current, phone: event.target.value }))}
            placeholder="الهاتف"
            value={recipient.phone}
          />
        ) : null}
        <textarea
          className={textareaClass}
          onChange={(event) => setRecipient((current) => ({ ...current, address: event.target.value }))}
          placeholder="عنوان التوصيل"
          value={recipient.address}
        />
        <select
          className={inputClass}
          onChange={(event) =>
            setRecipient((current) => ({
              ...current,
              cityId: event.target.value,
              zoneId: "",
            }))
          }
          value={recipient.cityId}
        >
          <option value="">المدينة</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          disabled={!recipient.cityId}
          onChange={(event) => setRecipient((current) => ({ ...current, zoneId: event.target.value }))}
          value={recipient.zoneId}
        >
          <option value="">المنطقة</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name} - {formatMoney(zone.deliveryFee)}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

function PaymentPanel({
  paymentMethod,
  setPaymentMethod,
  transferImageUrl,
  uploadingTransfer,
  uploadTransferImage,
}: {
  paymentMethod: "bank_transfer" | "cash";
  setPaymentMethod: (method: "bank_transfer" | "cash") => void;
  transferImageUrl: string;
  uploadingTransfer: boolean;
  uploadTransferImage: (file: File) => Promise<void>;
}) {
  return (
    <section className="rounded-[1.7rem] border border-[#eee5db] bg-white p-4 shadow-sm shadow-[#4b3c2e]/5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf0f5] text-sky-700">
          <CreditCard size={18} />
        </span>
        <div>
          <p className="text-xs font-black text-[#9a8b7e]">الدفع</p>
          <h3 className="text-base font-black text-[#29252b]">طريقة الدفع</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PaymentButton
          active={paymentMethod === "cash"}
          label="كاش"
          onClick={() => setPaymentMethod("cash")}
        />
        <PaymentButton
          active={paymentMethod === "bank_transfer"}
          label="تحويل"
          onClick={() => setPaymentMethod("bank_transfer")}
        />
      </div>

      {paymentMethod === "bank_transfer" ? (
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-[1.1rem] border border-dashed border-sky-200 bg-sky-50 px-4 py-4 text-sm font-black text-sky-700">
          {uploadingTransfer ? <Loader2 className="animate-spin" size={18} /> : <ImagePlus size={18} />}
          {transferImageUrl ? "صورة التحويل جاهزة" : "رفع صورة التحويل"}
          <input
            accept="image/*"
            className="hidden"
            disabled={uploadingTransfer}
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void uploadTransferImage(file);
              }
            }}
            type="file"
          />
        </label>
      ) : null}
    </section>
  );
}

function EmptyProductUnused() {
  void EmptyProductUnused;
  return (
    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[2rem] border border-[#eee5db] bg-white p-6 text-center shadow-sm shadow-[#4b3c2e]/5">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5e9db] text-[#8b6548]">
        <PackageSearch size={28} />
      </span>
      <h3 className="mt-4 text-lg font-black text-[#29252b]">اختر منتجًا</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-[#8a7d72]">
        تفاصيل الصور والخيارات تظهر هنا.
      </p>
    </section>
  );
}

void EmptyProductUnused;

function ProductAvailability({
  product,
  variant,
}: {
  product: StorefrontProduct;
  variant?: StorefrontVariant | null;
}) {
  const quantity =
    variant && getVariantLimit(variant) !== null
      ? getVariantLimit(variant)
      : product.availableQuantity ?? null;

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${
        quantity === null || quantity > 0
          ? "bg-[#eef7f0] text-emerald-700 ring-emerald-100"
          : "bg-slate-100 text-slate-500 ring-slate-200"
      }`}
    >
      {quantity === null || quantity > 0 ? "متاح" : "غير متوفر"}
    </span>
  );
}

function ProductImage({
  compact = false,
  imageUrl,
  name,
  priority = false,
  sizes,
}: {
  compact?: boolean;
  imageUrl: string | null;
  name: string;
  priority?: boolean;
  sizes: string;
}) {
  if (!imageUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-[#f5e9db] text-[#8b6548] ${
          compact ? "h-full w-full" : "aspect-[4/5] w-full"
        }`}
      >
        <PackageSearch size={compact ? 20 : 34} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${compact ? "h-full w-full" : "aspect-[4/5] w-full"}`}>
      <Image alt={name} className="object-cover" fill priority={priority} sizes={sizes} src={imageUrl} />
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
    <div className="inline-flex h-11 items-center rounded-full bg-white p-1 ring-1 ring-[#e8ddd1]">
      <button
        aria-label="تقليل الكمية"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f2ea] text-[#65584d]"
        onClick={() => setQuantity(Math.max(1, quantity - 1))}
        type="button"
      >
        <Minus size={15} />
      </button>
      <span className="min-w-10 text-center text-sm font-black text-[#29252b]">
        {quantity.toLocaleString("ar-LY")}
      </span>
      <button
        aria-label="زيادة الكمية"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eadccf] text-[#8b6548]"
        onClick={() => setQuantity(Math.min(max, quantity + 1))}
        type="button"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

function PaymentButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-12 rounded-full text-sm font-black ring-1 transition ${
        active
          ? "bg-[#8b6548] text-white ring-[#8b6548]"
          : "bg-[#fbfaf7] text-[#65584d] ring-[#eadccf] hover:bg-[#f0e3d5]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function AmountLine({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] bg-white/70 px-3 py-2">
      <p className="text-xs font-black text-[#95887d]">{label}</p>
      <p className={strong ? "mt-1 text-lg font-black text-[#29252b]" : "mt-1 text-sm font-black text-[#534b45]"}>
        {value}
      </p>
    </div>
  );
}

function Message({ state }: { state: ActionState }) {
  return (
    <div
      className={`rounded-[1.2rem] px-4 py-3 text-sm font-black ring-1 ${
        state.tone === "success"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : state.tone === "error"
            ? "bg-rose-50 text-rose-700 ring-rose-100"
            : "bg-[#faf7f2] text-[#8a7d72] ring-[#efe4d8]"
      }`}
    >
      {state.message}
    </div>
  );
}

function createVariantLabel(variant: StorefrontVariant) {
  return [variant.color, variant.size, variant.type].filter(Boolean).join(" / ") || "الخيار الأساسي";
}

function emptyRecipient(): RecipientForm {
  return { address: "", cityId: "", name: "", phone: "", zoneId: "" };
}

function galleryForProduct(
  product: StorefrontProduct,
  variant?: StorefrontVariant | null,
) {
  return uniqueImages([
    variant?.imageUrl || null,
    ...product.images.flatMap((image) => [image.large || null, image.medium || null, image.thumb || null]),
    ...product.variants.map((item) => item.imageUrl),
  ]);
}

function getVariantLimit(variant: StorefrontVariant) {
  return typeof variant.availableQuantity === "number" ? variant.availableQuantity : null;
}

function imageForProduct(product: StorefrontProduct, variant?: StorefrontVariant | null) {
  return galleryForProduct(product, variant)[0] || null;
}

function optionValues(variants: StorefrontVariant[], field: "color" | "size" | "type") {
  const values = variants
    .map((variant) => variant[field])
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(values));
}

function pickVariant(
  variants: StorefrontVariant[],
  current: StorefrontVariant | null,
  field: "color" | "size" | "type",
  value: string,
) {
  const otherFields = (["color", "size", "type"] as const).filter((item) => item !== field);
  const matchedCurrent = variants.find((variant) => {
    return (
      variant[field] === value &&
      otherFields.every((item) => !current?.[item] || variant[item] === current[item])
    );
  });

  return matchedCurrent || variants.find((variant) => variant[field] === value) || null;
}

function productCanBeOrdered(product: StorefrontProduct) {
  if (typeof product.availableQuantity === "number") {
    return product.availableQuantity > 0;
  }

  return product.variants.length > 0;
}

function recipientFromSaved(recipient?: StorefrontRecipient | null): RecipientForm {
  if (!recipient) {
    return emptyRecipient();
  }

  return {
    address: recipient.address,
    cityId: recipient.cityId,
    name: recipient.name,
    phone: recipient.phone,
    zoneId: recipient.zoneId,
  };
}

function uniqueImages(images: Array<string | null | undefined>) {
  return images.filter((image, index, all): image is string => Boolean(image) && all.indexOf(image) === index);
}
