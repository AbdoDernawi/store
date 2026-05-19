import { createUserRouteClient } from "@/lib/supabase/route";
import { periodRange, type AdminPeriod } from "@/lib/admin/format";

type SupabaseRouteClient = NonNullable<ReturnType<typeof createUserRouteClient>>;
type CountQuery = {
  eq: (column: string, value: unknown) => CountQuery;
  gt: (column: string, value: unknown) => CountQuery;
  lte: (column: string, value: unknown) => CountQuery;
  not: (column: string, operator: string, value: unknown) => CountQuery;
  then: PromiseLike<{ count: number | null }>["then"];
};

export type DashboardStats = {
  period: AdminPeriod;
  periodLabel: string;
  urgent: {
    pendingApprovals: number;
    bankTransfers: number;
    cancellationRequests: number;
    supplierDebtsDue: number;
  };
  finance: {
    cashBalance: number;
    bankBalance: number;
    ordersCount: number;
    sales: number;
    costOfGoods: number;
    commissions: number;
    expenses: number;
    netProfit: number;
  };
  chart: Array<{ label: string; sales: number; orders: number }>;
  deliveryCustody: Array<{
    id: string;
    deliveryId: string;
    deliveryName: string;
    amount: number;
    ordersCount: number;
    status: string;
  }>;
  topMarketers: Array<{
    id: string;
    name: string;
    orders: number;
    sales: number;
  }>;
};

export type AdminOrderListItem = {
  id: string;
  order_number: number | null;
  type: string;
  customer_name: string;
  customer_phone: string;
  city_id: string;
  zone_id: string;
  total: number;
  delivery_fee: number;
  payment_method: string;
  payment_status: string;
  status: string;
  marketer_id: string | null;
  delivery_id: string | null;
  created_at: string;
};

export type OrdersFilters = {
  q?: string;
  status?: string;
  city?: string;
  marketer?: string;
  from?: string;
  to?: string;
};

export type AdminOrderDetails = AdminOrderListItem & {
  customer_address: string;
  subtotal: number;
  discount_amount: number;
  transfer_image_url: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  invoice_type: string;
  virtual_store_id: string | null;
  items: Array<{
    id: string;
    product_id: string;
    product_variant_id: string;
    warehouse_id: string | null;
    quantity: number;
    unit_price: number;
    commission_per_unit: number;
    total_price: number;
    total_commission: number;
    products?: { name_ar?: string | null; name_en?: string | null } | null;
    product_variants?: { color?: string | null; size?: string | null; type?: string | null } | null;
    warehouses?: { name?: string | null } | null;
  }>;
  history: Array<{
    id: string;
    status: string;
    note: string | null;
    changed_by: string | null;
    created_at: string;
  }>;
  package: {
    id: string;
    package_number: number | null;
    qr_code_hash: string;
    assigned_to: string | null;
    assigned_at: string | null;
  } | null;
  chatId: string | null;
};

export async function getDashboardStats(periodParam?: string): Promise<DashboardStats> {
  const supabase = createUserRouteClient();
  const range = periodRange(periodParam);

  if (!supabase) {
    return emptyDashboard(range.period, range.label);
  }

  const [
    pendingApprovals,
    bankTransfers,
    cancellationRequests,
    supplierDebtsDue,
    treasury,
    periodOrders,
    expenses,
    orderItems,
    handovers,
  ] = await Promise.all([
    countRows(supabase, "orders", (query) => query.eq("status", "pending_approval")),
    countRows(supabase, "orders", (query) =>
      query.eq("payment_method", "bank_transfer").eq("payment_status", "pending"),
    ),
    countRows(supabase, "orders", (query) => query.not("cancellation_requested_by", "is", null)),
    countRows(supabase, "purchase_orders", (query) =>
      query.gt("debt_amount", 0).lte("due_date", daysFromNow(7)),
    ),
    supabase.from("treasury").select("type, balance"),
    supabase
      .from("orders")
      .select("id, total, marketer_id, created_at, status")
      .gte("created_at", range.start.toISOString()),
    supabase
      .from("expenses")
      .select("amount, created_at")
      .gte("created_at", range.start.toISOString()),
    supabase
      .from("order_items")
      .select("order_id, quantity, total_commission, products(cost_price)"),
    supabase
      .from("delivery_handovers")
      .select("id, delivery_id, total_amount, order_ids, status")
      .eq("status", "pending")
      .limit(6),
  ]);

  const ordersData = (periodOrders.data || []) as Array<{
    id: string;
    total: string | number | null;
    marketer_id: string | null;
    created_at: string;
    status: string;
  }>;
  const expenseAmount = (expenses.data || []).reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  );
  const itemRows = (orderItems.data || []) as Array<{
    order_id: string;
    quantity: number;
    total_commission: string | number | null;
    products?: { cost_price?: string | number | null } | Array<{ cost_price?: string | number | null }>;
  }>;
  const periodOrderIds = new Set(ordersData.map((order) => order.id));
  const periodItems = itemRows.filter((item) => periodOrderIds.has(item.order_id));
  const costOfGoods = periodItems.reduce((sum, item) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;

    return sum + Number(product?.cost_price || 0) * Number(item.quantity || 0);
  }, 0);
  const commissions = periodItems.reduce(
    (sum, item) => sum + Number(item.total_commission || 0),
    0,
  );
  const sales = ordersData.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const topMarketers = await buildTopMarketers(supabase, ordersData);
  const deliveryCustody = await buildDeliveryCustody(supabase, handovers.data || []);
  const chart = buildSalesChart(ordersData, range.period);
  const cashBalance = Number(
    treasury.data?.find((row) => row.type === "cash")?.balance || 0,
  );
  const bankBalance = Number(
    treasury.data?.find((row) => row.type === "bank_transfer")?.balance || 0,
  );

  return {
    period: range.period,
    periodLabel: range.label,
    urgent: {
      pendingApprovals,
      bankTransfers,
      cancellationRequests,
      supplierDebtsDue,
    },
    finance: {
      cashBalance,
      bankBalance,
      ordersCount: ordersData.length,
      sales,
      costOfGoods,
      commissions,
      expenses: expenseAmount,
      netProfit: sales - costOfGoods - commissions - expenseAmount,
    },
    chart,
    deliveryCustody,
    topMarketers,
  };
}

export async function getAdminOrders(filters: OrdersFilters) {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return {
      orders: [] as AdminOrderListItem[],
      cities: new Map<string, string>(),
      zones: new Map<string, string>(),
    };
  }

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, type, customer_name, customer_phone, city_id, zone_id, total, delivery_fee, payment_method, payment_status, status, marketer_id, delivery_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(80);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.city) {
    query = query.eq("city_id", filters.city);
  }

  if (filters.marketer) {
    query = query.eq("marketer_id", filters.marketer);
  }

  if (filters.from) {
    query = query.gte("created_at", new Date(filters.from).toISOString());
  }

  if (filters.to) {
    const toDate = new Date(filters.to);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte("created_at", toDate.toISOString());
  }

  if (filters.q) {
    const q = filters.q.trim();
    query = query.or(`customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);
  }

  const [{ data: orders }, { data: cities }, { data: zones }] = await Promise.all([
    query,
    supabase.from("cities").select("id, name_ar").order("name_ar"),
    supabase.from("zones").select("id, name_ar"),
  ]);

  return {
    orders: (orders || []) as AdminOrderListItem[],
    cities: new Map((cities || []).map((city) => [city.id, city.name_ar])),
    zones: new Map((zones || []).map((zone) => [zone.id, zone.name_ar])),
  };
}

export async function getAdminOrderDetails(id: string): Promise<AdminOrderDetails | null> {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return null;
  }

  const [
    orderResult,
    itemsResult,
    historyResult,
    packageResult,
    chatResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("order_items")
      .select(
        "id, product_id, product_variant_id, warehouse_id, quantity, unit_price, commission_per_unit, total_price, total_commission, products(name_ar, name_en), product_variants(color, size, type), warehouses(name)",
      )
      .eq("order_id", id),
    supabase
      .from("order_status_history")
      .select("id, status, note, changed_by, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("order_packages")
      .select("id, package_number, qr_code_hash, assigned_to, assigned_at")
      .contains("order_ids", [id])
      .limit(1)
      .maybeSingle(),
    supabase
      .from("order_chats")
      .select("id")
      .eq("order_id", id)
      .maybeSingle(),
  ]);

  if (!orderResult.data) {
    return null;
  }

  return {
    ...(orderResult.data as AdminOrderDetails),
    items: (itemsResult.data || []) as AdminOrderDetails["items"],
    history: (historyResult.data || []) as AdminOrderDetails["history"],
    package: (packageResult.data as AdminOrderDetails["package"]) || null,
    chatId: chatResult.data?.id || null,
  };
}

async function countRows(
  supabase: SupabaseRouteClient,
  table: string,
  apply: (query: CountQuery) => CountQuery,
) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true }) as unknown as CountQuery;
  query = apply(query);
  const { count } = await query;

  return count || 0;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

function emptyDashboard(period: AdminPeriod, periodLabel: string): DashboardStats {
  return {
    period,
    periodLabel,
    urgent: {
      pendingApprovals: 0,
      bankTransfers: 0,
      cancellationRequests: 0,
      supplierDebtsDue: 0,
    },
    finance: {
      cashBalance: 0,
      bankBalance: 0,
      ordersCount: 0,
      sales: 0,
      costOfGoods: 0,
      commissions: 0,
      expenses: 0,
      netProfit: 0,
    },
    chart: [],
    deliveryCustody: [],
    topMarketers: [],
  };
}

function buildSalesChart(
  orders: Array<{ total: string | number | null; created_at: string }>,
  period: AdminPeriod,
) {
  const map = new Map<string, { label: string; sales: number; orders: number }>();

  orders.forEach((order) => {
    const date = new Date(order.created_at);
    const label =
      period === "day"
        ? `${date.getHours().toString().padStart(2, "0")}:00`
        : new Intl.DateTimeFormat("ar-LY", { day: "numeric", month: "short" }).format(date);
    const current = map.get(label) || { label, sales: 0, orders: 0 };

    current.sales += Number(order.total || 0);
    current.orders += 1;
    map.set(label, current);
  });

  return Array.from(map.values()).slice(-14);
}

async function buildTopMarketers(
  supabase: SupabaseRouteClient,
  orders: Array<{ marketer_id: string | null; total: string | number | null }>,
) {
  const grouped = new Map<string, { id: string; orders: number; sales: number }>();

  orders.forEach((order) => {
    if (!order.marketer_id) {
      return;
    }

    const current = grouped.get(order.marketer_id) || {
      id: order.marketer_id,
      orders: 0,
      sales: 0,
    };

    current.orders += 1;
    current.sales += Number(order.total || 0);
    grouped.set(order.marketer_id, current);
  });

  const rows = Array.from(grouped.values()).sort((a, b) => b.sales - a.sales).slice(0, 5);
  const ids = rows.map((row) => row.id);

  if (ids.length === 0) {
    return [];
  }

  const { data: users } = await supabase.from("users").select("id, full_name").in("id", ids);
  const names = new Map((users || []).map((user) => [user.id, user.full_name]));

  return rows.map((row) => ({
    ...row,
    name: names.get(row.id) || "مسوق",
  }));
}

async function buildDeliveryCustody(
  supabase: SupabaseRouteClient,
  handovers: Array<{
    id: string;
    delivery_id: string;
    total_amount: string | number | null;
    order_ids: string[] | null;
    status: string;
  }>,
) {
  const ids = Array.from(new Set(handovers.map((handover) => handover.delivery_id)));
  const { data: users } = ids.length
    ? await supabase.from("users").select("id, full_name").in("id", ids)
    : { data: [] };
  const names = new Map((users || []).map((user) => [user.id, user.full_name]));

  return handovers.map((handover) => ({
    id: handover.id,
    deliveryId: handover.delivery_id,
    deliveryName: names.get(handover.delivery_id) || "مندوب",
    amount: Number(handover.total_amount || 0),
    ordersCount: Array.isArray(handover.order_ids) ? handover.order_ids.length : 0,
    status: handover.status,
  }));
}
