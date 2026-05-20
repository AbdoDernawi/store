import { createUserRouteClient } from "@/lib/supabase/route";
import type { AuthSession } from "@/types/auth";

export type MarketerCatalogVariant = {
  id: string;
  color: string | null;
  size: string | null;
  type: string | null;
  image_url: string | null;
  extra_price: number;
};

export type MarketerCatalogProduct = {
  id: string;
  category_id: string | null;
  category_name: string | null;
  name_ar: string;
  description_ar: string | null;
  images: Array<{ thumb?: string; medium?: string; large?: string }>;
  marketer_price: number;
  variants: MarketerCatalogVariant[];
};

export type MarketerCategory = {
  id: string;
  name_ar: string;
  image_url: string | null;
};

export type MarketerCity = {
  id: string;
  name_ar: string;
};

export type MarketerZone = {
  id: string;
  city_id: string;
  name_ar: string;
  delivery_fee: number;
};

export type MarketerCustomer = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  city_id: string | null;
  zone_id: string | null;
  last_ordered_at: string | null;
};

export type MarketerOrderSummary = {
  id: string;
  order_number: number | null;
  customer_name: string;
  total: number;
  delivery_fee: number;
  status: string;
  created_at: string;
};

export type MarketerDashboardData = {
  walletBalance: number;
  pendingOrders: number;
  deliveredOrders: number;
  unreadNotifications: number;
  lastOrders: MarketerOrderSummary[];
};

const activeOrderStatuses = [
  "pending_approval",
  "approved",
  "preparing",
  "ready",
  "out_for_delivery",
  "partial_return",
];

export async function getMarketerDashboardData(user: AuthSession): Promise<MarketerDashboardData> {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return emptyDashboard();
  }

  const [wallet, pending, delivered, notifications, lastOrders] = await Promise.all([
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("marketer_id", user.id)
      .in("status", activeOrderStatuses),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("marketer_id", user.id)
      .eq("status", "delivered"),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, total, delivery_fee, status, created_at")
      .eq("marketer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    walletBalance: Number(wallet.data?.balance || 0),
    pendingOrders: pending.count || 0,
    deliveredOrders: delivered.count || 0,
    unreadNotifications: notifications.count || 0,
    lastOrders: normalizeOrders(lastOrders.data || []),
  };
}

export async function getMarketerProductsData() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return {
      categories: [] as MarketerCategory[],
      cities: [] as MarketerCity[],
      customers: [] as MarketerCustomer[],
      products: [] as MarketerCatalogProduct[],
      zones: [] as MarketerZone[],
    };
  }

  const [catalog, categories, cities, zones, customers] = await Promise.all([
    supabase.rpc("get_marketer_catalog"),
    supabase
      .from("categories")
      .select("id, name_ar, image_url")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("cities").select("id, name_ar").eq("is_active", true).order("name_ar"),
    supabase
      .from("zones")
      .select("id, city_id, name_ar, delivery_fee")
      .eq("is_active", true)
      .order("name_ar"),
    supabase
      .from("marketer_customers")
      .select("id, customer_name, customer_phone, customer_address, city_id, zone_id, last_ordered_at")
      .order("last_ordered_at", { ascending: false, nullsFirst: false })
      .limit(80),
  ]);

  return {
    categories: (categories.data || []) as MarketerCategory[],
    cities: (cities.data || []) as MarketerCity[],
    customers: (customers.data || []) as MarketerCustomer[],
    products: normalizeCatalog(catalog.data || []),
    zones: normalizeZones(zones.data || []),
  };
}

function normalizeCatalog(rows: unknown[]): MarketerCatalogProduct[] {
  return rows.map((row) => {
    const product = row as Omit<MarketerCatalogProduct, "images" | "marketer_price" | "variants"> & {
      images?: unknown;
      marketer_price?: string | number | null;
      variants?: unknown;
    };

    return {
      ...product,
      images: Array.isArray(product.images) ? product.images : [],
      marketer_price: Number(product.marketer_price || 0),
      variants: normalizeVariants(product.variants),
    };
  });
}

function normalizeVariants(value: unknown): MarketerCatalogVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((variant) => {
    const row = variant as MarketerCatalogVariant & { extra_price?: string | number | null };

    return {
      id: row.id,
      color: row.color || null,
      size: row.size || null,
      type: row.type || null,
      image_url: row.image_url || null,
      extra_price: Number(row.extra_price || 0),
    };
  });
}

function normalizeZones(rows: unknown[]): MarketerZone[] {
  return rows.map((row) => {
    const zone = row as MarketerZone & { delivery_fee?: string | number | null };

    return {
      ...zone,
      delivery_fee: Number(zone.delivery_fee || 0),
    };
  });
}

function normalizeOrders(rows: unknown[]): MarketerOrderSummary[] {
  return rows.map((row) => {
    const order = row as MarketerOrderSummary & {
      delivery_fee?: string | number | null;
      total?: string | number | null;
    };

    return {
      ...order,
      delivery_fee: Number(order.delivery_fee || 0),
      total: Number(order.total || 0),
    };
  });
}

function emptyDashboard(): MarketerDashboardData {
  return {
    deliveredOrders: 0,
    lastOrders: [],
    pendingOrders: 0,
    unreadNotifications: 0,
    walletBalance: 0,
  };
}

export function createVariantLabel(variant: MarketerCatalogVariant) {
  return [variant.color, variant.size, variant.type].filter(Boolean).join(" / ") || "الخيار الأساسي";
}
