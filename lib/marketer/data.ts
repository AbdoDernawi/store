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
  ordered_quantity: number;
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

export type MarketerOrderListItem = MarketerOrderSummary & {
  customer_phone: string;
  city_id: string;
  zone_id: string;
  city_name: string;
  zone_name: string;
  payment_method: string;
  payment_status: string;
  delivery_id: string | null;
  cancellation_requested_by: string | null;
};

export type MarketerOrderDetails = {
  order: MarketerOrderListItem & {
    customer_address: string;
    delivery_name: string | null;
    delivery_phone: string | null;
    discount_amount: number;
    invoice_type: string;
    subtotal: number;
    transfer_image_url: string | null;
    virtual_store_id: string | null;
    cancellation_reason: string | null;
  };
  items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    total_price: number;
    unit_price: number;
    variant_id: string;
    variant_label: string;
  }>;
  history: Array<{
    id: string;
    changed_by: string | null;
    changed_by_name: string | null;
    created_at: string;
    note: string | null;
    status: string;
  }>;
  chat: {
    id: string;
    is_open: boolean;
  } | null;
};

export type MarketerWalletData = {
  balance: number;
  transactions: Array<{
    id: string;
    amount: number;
    created_at: string;
    flow: string;
    note: string | null;
    source_id: string | null;
    source_type: string;
  }>;
};

export type MarketerVirtualStore = {
  id: string;
  store_name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  contact_phone: string | null;
  address: string | null;
  invoice_note: string | null;
};

export type MarketerNotification = {
  id: string;
  title: string;
  body: string;
  type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
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

export async function getMarketerLocations() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return {
      cities: [] as MarketerCity[],
      zones: [] as MarketerZone[],
    };
  }

  const [cities, zones] = await Promise.all([
    supabase.from("cities").select("id, name_ar").eq("is_active", true).order("name_ar"),
    supabase
      .from("zones")
      .select("id, city_id, name_ar, delivery_fee")
      .eq("is_active", true)
      .order("name_ar"),
  ]);

  return {
    cities: (cities.data || []) as MarketerCity[],
    zones: normalizeZones(zones.data || []),
  };
}

export async function getMarketerOrders(user: AuthSession, status?: string) {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { orders: [] as MarketerOrderListItem[] };
  }

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, city_id, zone_id, total, delivery_fee, payment_method, payment_status, status, delivery_id, cancellation_requested_by, created_at",
    )
    .eq("marketer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(80);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const [ordersResult, citiesResult, zonesResult] = await Promise.all([
    query,
    supabase.from("cities").select("id, name_ar"),
    supabase.from("zones").select("id, name_ar"),
  ]);
  const cityNames = new Map((citiesResult.data || []).map((city) => [city.id, city.name_ar]));
  const zoneNames = new Map((zonesResult.data || []).map((zone) => [zone.id, zone.name_ar]));

  return {
    orders: normalizeOrderList(ordersResult.data || [], cityNames, zoneNames),
  };
}

export async function getMarketerOrderDetails(id: string): Promise<MarketerOrderDetails | null> {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_marketer_order_details", {
    p_order_id: id,
  });

  if (error || !data) {
    return null;
  }

  return normalizeOrderDetails(data);
}

export async function getMarketerWalletData(user: AuthSession): Promise<MarketerWalletData> {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { balance: 0, transactions: [] };
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("id, balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!wallet) {
    return { balance: 0, transactions: [] };
  }

  const { data: transactions } = await supabase
    .from("wallet_transactions")
    .select("id, flow, amount, source_type, source_id, note, created_at")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(80);

  return {
    balance: Number(wallet.balance || 0),
    transactions: (transactions || []).map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount || 0),
    })),
  };
}

export async function getMarketerVirtualStore(user: AuthSession): Promise<MarketerVirtualStore | null> {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("virtual_stores")
    .select("id, store_name, logo_url, primary_color, secondary_color, contact_phone, address, invoice_note")
    .eq("marketer_id", user.id)
    .maybeSingle();

  return (data as MarketerVirtualStore | null) || null;
}

export async function getMarketerNotifications(user: AuthSession) {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { notifications: [] as MarketerNotification[] };
  }

  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, type, reference_id, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(80);

  return { notifications: (data || []) as MarketerNotification[] };
}

function normalizeCatalog(rows: unknown[]): MarketerCatalogProduct[] {
  return rows.map((row) => {
    const product = row as Omit<MarketerCatalogProduct, "images" | "marketer_price" | "variants"> & {
      images?: unknown;
      marketer_price?: string | number | null;
      ordered_quantity?: string | number | null;
      variants?: unknown;
    };

    return {
      ...product,
      images: Array.isArray(product.images) ? product.images : [],
      marketer_price: Number(product.marketer_price || 0),
      ordered_quantity: Number(product.ordered_quantity || 0),
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

function normalizeOrderList(
  rows: unknown[],
  cityNames: Map<string, string>,
  zoneNames: Map<string, string>,
): MarketerOrderListItem[] {
  return rows.map((row) => {
    const order = row as MarketerOrderListItem & {
      delivery_fee?: string | number | null;
      total?: string | number | null;
    };

    return {
      ...order,
      city_name: cityNames.get(order.city_id) || "-",
      delivery_fee: Number(order.delivery_fee || 0),
      total: Number(order.total || 0),
      zone_name: zoneNames.get(order.zone_id) || "-",
    };
  });
}

function normalizeOrderDetails(value: unknown): MarketerOrderDetails {
  const details = value as MarketerOrderDetails;

  return {
    ...details,
    items: (details.items || []).map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      total_price: Number(item.total_price || 0),
      unit_price: Number(item.unit_price || 0),
    })),
    order: {
      ...details.order,
      delivery_fee: Number(details.order.delivery_fee || 0),
      discount_amount: Number(details.order.discount_amount || 0),
      subtotal: Number(details.order.subtotal || 0),
      total: Number(details.order.total || 0),
    },
  };
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
