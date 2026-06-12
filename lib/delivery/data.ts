import { createUserRouteClient } from "@/lib/supabase/route";
import type { AuthSession } from "@/types/auth";

export type DeliveryPackageSummary = {
  id: string;
  package_number: number | null;
  qr_code_hash: string;
  created_at: string;
  order_count: number;
  order_numbers: number[];
  cities: string[];
  cash_total: number;
};

export type DeliveryDashboardData = {
  custodyCount: number;
  cashWithMe: number;
  returnsCount: number;
  deliveredToday: number;
  unreadNotifications: number;
  availablePackages: DeliveryPackageSummary[];
};

export type DeliveryOrderListItem = {
  id: string;
  order_number: number | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  city_id: string;
  zone_id: string;
  city_name: string;
  zone_name: string;
  total: number;
  delivery_fee: number;
  payment_method: string;
  payment_status: string;
  status: string;
  store_name: string;
  store_phone: string | null;
  created_at: string;
};

export type DeliveryCustodyProductItem = {
  id: string;
  order_id: string;
  order_number: number | null;
  order_status: string;
  customer_name: string;
  city_name: string;
  zone_name: string;
  store_name: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_label: string;
  image_url: string | null;
  warehouse_id: string | null;
  quantity: number;
  custody_quantity: number;
  returnable_quantity: number;
  returnable: boolean;
};

export type DeliveryOrderDetails = {
  order: DeliveryOrderListItem & {
    subtotal: number;
    discount_amount: number;
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
    warehouse_id: string | null;
  }>;
  history: Array<{
    id: string;
    changed_by_name: string | null;
    created_at: string;
    note: string | null;
    status: string;
  }>;
  chat: {
    id: string;
    is_open: boolean;
  } | null;
  excuse: {
    id: string;
    status: string;
    reason: string;
    created_at: string;
  } | null;
};

export type DeliveryHandover = {
  id: string;
  type: string;
  order_ids: string[];
  total_amount: number;
  status: string;
  confirmed_at: string | null;
  created_at: string;
};

export type DeliveryReportData = {
  totalFinishedOrders: number;
  deliveredOrders: number;
  partialReturns: number;
  fullReturns: number;
  productsDelivered: number;
};

export type DeliveryNotification = {
  id: string;
  title: string;
  body: string;
  type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
};

const custodyStatuses = ["out_for_delivery"];
const handoverCashStatuses = ["delivered", "partial_return", "full_return"];
const handoverReturnStatuses = ["partial_return", "full_return", "cancelled"];
const finishedStatuses = ["delivered", "partial_return", "full_return"];

export async function getDeliveryDashboardData(): Promise<DeliveryDashboardData> {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return emptyDashboard();
  }

  const { data, error } = await supabase.rpc("get_delivery_dashboard");

  if (error || !data) {
    return emptyDashboard();
  }

  const row = data as {
    custody_count?: number | string | null;
    cash_with_me?: number | string | null;
    returns_count?: number | string | null;
    delivered_today?: number | string | null;
    notifications_unread?: number | string | null;
    available_packages?: unknown;
  };

  return {
    availablePackages: normalizePackages(row.available_packages),
    cashWithMe: Number(row.cash_with_me || 0),
    custodyCount: Number(row.custody_count || 0),
    deliveredToday: Number(row.delivered_today || 0),
    returnsCount: Number(row.returns_count || 0),
    unreadNotifications: Number(row.notifications_unread || 0),
  };
}

export async function getDeliveryCustody(user: AuthSession) {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { items: [] as DeliveryCustodyProductItem[], orders: [] as DeliveryOrderListItem[] };
  }

  const { data: custodyData, error: custodyError } = await supabase.rpc("get_delivery_custody");

  if (!custodyError && custodyData) {
    return normalizeCustodyData(custodyData);
  }

  const [ordersResult, citiesResult, zonesResult] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_phone, customer_address, city_id, zone_id, total, delivery_fee, payment_method, payment_status, status, created_at",
      )
      .eq("delivery_id", user.id)
      .in("status", custodyStatuses)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase.from("cities").select("id, name_ar"),
    supabase.from("zones").select("id, name_ar"),
  ]);

  const cityNames = new Map((citiesResult.data || []).map((city) => [city.id, city.name_ar]));
  const zoneNames = new Map((zonesResult.data || []).map((zone) => [zone.id, zone.name_ar]));

  return {
    items: [] as DeliveryCustodyProductItem[],
    orders: normalizeOrderList(ordersResult.data || [], cityNames, zoneNames),
  };
}

export async function getDeliveryOrderDetails(id: string): Promise<DeliveryOrderDetails | null> {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_delivery_order_details", {
    p_order_id: id,
  });

  if (error || !data) {
    return null;
  }

  return normalizeOrderDetails(data);
}

export async function getDeliveryHandoverData(user: AuthSession) {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return {
      cashOrders: [] as DeliveryOrderListItem[],
      handovers: [] as DeliveryHandover[],
      returnOrders: [] as DeliveryOrderListItem[],
    };
  }

  const [cashOrders, returnOrders, handovers, citiesResult, zonesResult] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_phone, customer_address, city_id, zone_id, total, delivery_fee, payment_method, payment_status, status, created_at",
      )
      .eq("delivery_id", user.id)
      .eq("payment_method", "cash")
      .eq("payment_status", "pending")
      .in("status", handoverCashStatuses)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_phone, customer_address, city_id, zone_id, total, delivery_fee, payment_method, payment_status, status, created_at",
      )
      .eq("delivery_id", user.id)
      .in("status", handoverReturnStatuses)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("delivery_handovers")
      .select("id, type, order_ids, total_amount, status, confirmed_at, created_at")
      .eq("delivery_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("cities").select("id, name_ar"),
    supabase.from("zones").select("id, name_ar"),
  ]);

  const cityNames = new Map((citiesResult.data || []).map((city) => [city.id, city.name_ar]));
  const zoneNames = new Map((zonesResult.data || []).map((zone) => [zone.id, zone.name_ar]));

  return {
    cashOrders: normalizeOrderList(cashOrders.data || [], cityNames, zoneNames),
    handovers: normalizeHandovers(handovers.data || []),
    returnOrders: normalizeOrderList(returnOrders.data || [], cityNames, zoneNames),
  };
}

export async function getDeliveryReportData(user: AuthSession): Promise<DeliveryReportData> {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return emptyReport();
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status")
    .eq("delivery_id", user.id)
    .in("status", finishedStatuses)
    .limit(500);

  const finishedOrders = orders || [];
  const orderIds = finishedOrders.map((order) => order.id);
  let productsDelivered = 0;

  if (orderIds.length) {
    const { data: items } = await supabase
      .from("order_items")
      .select("quantity")
      .in("order_id", orderIds)
      .limit(1000);

    productsDelivered = (items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  return {
    deliveredOrders: finishedOrders.filter((order) => order.status === "delivered").length,
    fullReturns: finishedOrders.filter((order) => order.status === "full_return").length,
    partialReturns: finishedOrders.filter((order) => order.status === "partial_return").length,
    productsDelivered,
    totalFinishedOrders: finishedOrders.length,
  };
}

export async function getDeliveryNotifications(user: AuthSession) {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { notifications: [] as DeliveryNotification[] };
  }

  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, type, reference_id, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(80);

  return { notifications: (data || []) as DeliveryNotification[] };
}

function normalizePackages(value: unknown): DeliveryPackageSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const row = item as DeliveryPackageSummary & {
      cash_total?: number | string | null;
      order_count?: number | string | null;
      order_numbers?: unknown;
      cities?: unknown;
    };

    return {
      cash_total: Number(row.cash_total || 0),
      cities: Array.isArray(row.cities) ? row.cities.map(String) : [],
      created_at: row.created_at,
      id: row.id,
      order_count: Number(row.order_count || 0),
      order_numbers: Array.isArray(row.order_numbers)
        ? row.order_numbers.map((number) => Number(number || 0)).filter(Boolean)
        : [],
      package_number: row.package_number ? Number(row.package_number) : null,
      qr_code_hash: row.qr_code_hash,
    };
  });
}

function normalizeOrderList(
  rows: unknown[],
  cityNames: Map<string, string>,
  zoneNames: Map<string, string>,
): DeliveryOrderListItem[] {
  return rows.map((row) => {
    const order = row as DeliveryOrderListItem & {
      delivery_fee?: string | number | null;
      total?: string | number | null;
    };

    return {
      ...order,
      city_name: cityNames.get(order.city_id) || "-",
      delivery_fee: Number(order.delivery_fee || 0),
      store_name: order.store_name || "متجر الشركة",
      store_phone: order.store_phone || null,
      total: Number(order.total || 0),
      zone_name: zoneNames.get(order.zone_id) || "-",
    };
  });
}

function normalizeCustodyData(value: unknown): {
  items: DeliveryCustodyProductItem[];
  orders: DeliveryOrderListItem[];
} {
  const data = value as {
    items?: unknown[];
    orders?: unknown[];
  };

  return {
    items: normalizeCustodyItems(Array.isArray(data.items) ? data.items : []),
    orders: normalizeRpcOrderList(Array.isArray(data.orders) ? data.orders : []),
  };
}

function normalizeRpcOrderList(rows: unknown[]): DeliveryOrderListItem[] {
  return rows.map((row) => {
    const order = row as DeliveryOrderListItem & {
      delivery_fee?: string | number | null;
      order_number?: string | number | null;
      total?: string | number | null;
    };

    return {
      ...order,
      delivery_fee: Number(order.delivery_fee || 0),
      order_number: order.order_number ? Number(order.order_number) : null,
      store_name: order.store_name || "متجر الشركة",
      store_phone: order.store_phone || null,
      total: Number(order.total || 0),
    };
  });
}

function normalizeCustodyItems(rows: unknown[]): DeliveryCustodyProductItem[] {
  return rows.map((row) => {
    const item = row as DeliveryCustodyProductItem & {
      custody_quantity?: string | number | null;
      order_number?: string | number | null;
      quantity?: string | number | null;
      returnable_quantity?: string | number | null;
    };

    return {
      ...item,
      custody_quantity: Number(item.custody_quantity || 0),
      order_number: item.order_number ? Number(item.order_number) : null,
      quantity: Number(item.quantity || 0),
      returnable: Boolean(item.returnable),
      returnable_quantity: Number(item.returnable_quantity || 0),
      store_name: item.store_name || "متجر الشركة",
    };
  });
}

function normalizeOrderDetails(value: unknown): DeliveryOrderDetails {
  const details = value as DeliveryOrderDetails;

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
      store_name: details.order.store_name || "متجر الشركة",
      store_phone: details.order.store_phone || null,
      total: Number(details.order.total || 0),
      subtotal: Number(details.order.subtotal || 0),
    },
  };
}

function normalizeHandovers(rows: unknown[]): DeliveryHandover[] {
  return rows.map((row) => {
    const handover = row as DeliveryHandover & {
      order_ids?: unknown;
      total_amount?: string | number | null;
    };

    return {
      ...handover,
      order_ids: Array.isArray(handover.order_ids) ? handover.order_ids.map(String) : [],
      total_amount: Number(handover.total_amount || 0),
    };
  });
}

function emptyDashboard(): DeliveryDashboardData {
  return {
    availablePackages: [],
    cashWithMe: 0,
    custodyCount: 0,
    deliveredToday: 0,
    returnsCount: 0,
    unreadNotifications: 0,
  };
}

function emptyReport(): DeliveryReportData {
  return {
    deliveredOrders: 0,
    fullReturns: 0,
    partialReturns: 0,
    productsDelivered: 0,
    totalFinishedOrders: 0,
  };
}
