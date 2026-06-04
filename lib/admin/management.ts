import { createUserRouteClient } from "@/lib/supabase/route";

type AdminSupabaseClient = NonNullable<ReturnType<typeof createUserRouteClient>>;

export type AdminCategory = {
  id: string;
  name_ar: string;
  name_en: string;
  image_url: string | null;
  sort_order?: number;
  is_active: boolean;
  products?: Array<{ id: string }> | null;
};

export type AdminProduct = {
  id: string;
  category_id: string | null;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  images: Array<{ thumb?: string; medium?: string; large?: string }>;
  cost_price: number;
  customer_price: number;
  marketer_price: number;
  marketer_commission: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  categories?: { name_ar?: string | null } | null;
  product_variants?: Array<{ id: string }>;
};

export type AdminProductVariant = {
  id: string;
  product_id: string;
  color: string | null;
  size: string | null;
  type: string | null;
  image_url: string | null;
  extra_price: number;
  is_active?: boolean;
  products?: {
    id?: string;
    category_id?: string | null;
    name_ar?: string | null;
    name_en?: string | null;
    images?: Array<{ thumb?: string; medium?: string; large?: string }>;
    cost_price?: number | string | null;
    customer_price?: number | string | null;
    marketer_price?: number | string | null;
    marketer_commission?: number | string | null;
    low_stock_threshold?: number | null;
    is_active?: boolean;
    categories?: { name_ar?: string | null } | null;
  } | null;
  warehouse_inventory?: Array<{
    warehouse_id: string;
    quantity_available: number | string;
    quantity_reserved: number | string;
    low_stock_threshold: number;
    warehouses?: { name?: string | null } | null;
  }>;
};

export type AdminCity = {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
};

export type AdminZone = {
  id: string;
  city_id: string;
  name_ar: string;
  name_en: string;
  delivery_fee: number;
  is_active: boolean;
};

export type AdminWarehouse = {
  id: string;
  name: string;
  city_id: string;
  address: string | null;
  is_active: boolean;
  cities?: { name_ar?: string | null } | null;
};

export type AdminInventoryRow = {
  id: string;
  warehouse_id: string;
  product_variant_id: string;
  quantity_available: number;
  quantity_reserved: number;
  low_stock_threshold: number;
  warehouses?: { name?: string | null } | null;
  product_variants?: {
    color?: string | null;
    size?: string | null;
    type?: string | null;
    products?: { name_ar?: string | null } | null;
  } | null;
};

export type AdminWarehouseMovement = {
  id: string;
  warehouse_id: string;
  type: string;
  quantity: number;
  note: string | null;
  created_at: string;
  warehouses?: { name?: string | null } | null;
  product_variants?: {
    color?: string | null;
    size?: string | null;
    type?: string | null;
    products?: { name_ar?: string | null } | null;
  } | null;
};

export type AdminSupplier = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  total_debt: number;
  is_active: boolean;
};

export type AdminPurchaseOrder = {
  id: string;
  supplier_id: string;
  warehouse_id: string;
  total_amount: number;
  paid_amount: number;
  debt_amount: number;
  due_date: string | null;
  payment_type: string;
  status: string;
  created_at: string;
  suppliers?: { name?: string | null } | null;
  warehouses?: { name?: string | null } | null;
};

export type AdminUser = {
  id: string;
  phone: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type AdminTreasury = {
  id: string;
  type: string;
  balance: number;
  updated_at: string;
};

export type AdminExpenseType = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type AdminPaymentMethod = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  sort_order: number;
  is_active: boolean;
  payment_method_treasuries?: Array<{ balance?: string | number | null; updated_at?: string | null }> | null;
};

export type AdminExpense = {
  id: string;
  type: string;
  expense_type_id: string | null;
  payment_method_id: string | null;
  amount: number;
  note: string | null;
  created_at: string;
  expense_types?: { name?: string | null } | null;
  payment_methods?: { name_ar?: string | null; code?: string | null } | null;
};

export type AdminWallet = {
  id: string;
  user_id: string;
  balance: number;
  users?: { full_name?: string | null; phone?: string | null } | null;
};

export type AdminHandover = {
  id: string;
  delivery_id: string;
  type?: string;
  total_amount: number;
  order_ids: string[] | null;
  status: string;
  created_at: string;
  users?: { full_name?: string | null } | null;
};

export type AdminDeliveryAgent = {
  id: string;
  phone: string;
  full_name: string;
  is_active: boolean;
  activeOrders: number;
  activeCashCustody: number;
  completedCashCustody: number;
  returnOrders: number;
  pendingHandovers: AdminHandover[];
  orders: Array<{
    id: string;
    order_number: number | null;
    customer_name: string;
    payment_method: string;
    status: string;
    total: number;
    delivery_fee: number;
    created_at: string;
  }>;
};

export type AdminInvoice = {
  id: string;
  invoice_number: number | null;
  order_id: string;
  invoice_type: string;
  has_return: boolean;
  subtotal: number;
  discount_amount: number;
  total: number;
  delivery_fee: number;
  payment_method: string;
  printed_at: string | null;
  created_at: string;
  orders?: { customer_name?: string | null; customer_phone?: string | null } | null;
};

export type AdminBanner = {
  id: string;
  image_url: string;
  link: string | null;
  sort_order: number;
  is_active: boolean;
};

export type AdminCustomStatus = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
};

export async function getAdminProducts(search?: string) {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { products: [] as AdminProduct[], categories: [] as AdminCategory[] };
  }

  let query = supabase
    .from("products")
    .select(
      "id, category_id, name_ar, name_en, description_ar, description_en, images, cost_price, customer_price, marketer_price, marketer_commission, low_stock_threshold, is_active, created_at, categories(name_ar), product_variants(id)",
    )
    .order("created_at", { ascending: false })
    .limit(60);

  if (search?.trim()) {
    const value = search.trim();
    query = query.or(`name_ar.ilike.%${value}%,name_en.ilike.%${value}%`);
  }

  const [{ data: products }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("id, name_ar, name_en, image_url, is_active").order("sort_order"),
  ]);

  return {
    products: normalizeProducts(products || []),
    categories: (categories || []) as AdminCategory[],
  };
}

export async function getAdminWarehouses() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return emptyWarehouseData();
  }

  const [cities, warehouses, inventory, priorities, variants, categories, movements] = await Promise.all([
    supabase.from("cities").select("id, name_ar, name_en, is_active").order("name_ar"),
    supabase.from("warehouses").select("id, name, city_id, address, is_active, cities(name_ar)").order("name"),
    supabase
      .from("warehouse_inventory")
      .select(
        "id, warehouse_id, product_variant_id, quantity_available, quantity_reserved, low_stock_threshold, warehouses(name), product_variants(color, size, type, products(name_ar))",
      )
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase.from("warehouse_priorities").select("id, city_id, warehouse_id, priority_order").order("priority_order"),
    supabase
      .from("product_variants")
      .select(
        "id, product_id, color, size, type, image_url, extra_price, is_active, products(id, category_id, name_ar, name_en, images, cost_price, customer_price, marketer_price, marketer_commission, low_stock_threshold, is_active, categories(name_ar)), warehouse_inventory(warehouse_id, quantity_available, quantity_reserved, low_stock_threshold, warehouses(name))",
      )
      .eq("is_active", true)
      .limit(240),
    supabase.from("categories").select("id, name_ar, name_en, image_url, sort_order, is_active").order("sort_order"),
    supabase
      .from("warehouse_movements")
      .select("id, warehouse_id, type, quantity, note, created_at, warehouses(name), product_variants(color, size, type, products(name_ar))")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return {
    cities: (cities.data || []) as AdminCity[],
    warehouses: (warehouses.data || []) as AdminWarehouse[],
    inventory: (inventory.data || []) as AdminInventoryRow[],
    priorities: (priorities.data || []) as Array<{
      id: string;
      city_id: string;
      warehouse_id: string;
      priority_order: number;
    }>,
    variants: normalizeWarehouseVariants(variants.data || []),
    categories: (categories.data || []) as AdminCategory[],
    movements: (movements.data || []).map((movement) => ({
      ...(movement as AdminWarehouseMovement),
      quantity: Number((movement as AdminWarehouseMovement).quantity || 0),
    })),
  };
}

export async function getAdminSuppliers() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return {
      suppliers: [] as AdminSupplier[],
      purchaseOrders: [] as AdminPurchaseOrder[],
      warehouses: [] as AdminWarehouse[],
      variants: [] as AdminProductVariant[],
    };
  }

  const [suppliers, purchaseOrders, warehouses, variants] = await Promise.all([
    supabase.from("suppliers").select("id, name, phone, notes, total_debt, is_active").order("name"),
    supabase
      .from("purchase_orders")
      .select("id, supplier_id, warehouse_id, total_amount, paid_amount, debt_amount, due_date, payment_type, status, created_at, suppliers(name), warehouses(name)")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("warehouses").select("id, name, city_id, address, is_active").eq("is_active", true).order("name"),
    supabase
      .from("product_variants")
      .select("id, product_id, color, size, type, image_url, extra_price, products(name_ar)")
      .eq("is_active", true)
      .limit(120),
  ]);

  return {
    suppliers: (suppliers.data || []) as AdminSupplier[],
    purchaseOrders: (purchaseOrders.data || []) as AdminPurchaseOrder[],
    warehouses: (warehouses.data || []) as AdminWarehouse[],
    variants: (variants.data || []) as AdminProductVariant[],
  };
}

export async function getAdminUsers() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { users: [] as AdminUser[] };
  }

  const { data } = await supabase
    .from("users")
    .select("id, phone, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return { users: (data || []) as AdminUser[] };
}

export async function getAdminFinance() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return {
      treasury: [] as AdminTreasury[],
      paymentMethods: [] as AdminPaymentMethod[],
      expenseTypes: [] as AdminExpenseType[],
      expenses: [] as AdminExpense[],
      wallets: [] as AdminWallet[],
      handovers: [] as AdminHandover[],
    };
  }

  const [treasury, paymentMethods, expenseTypes, expenses, wallets, handovers] = await Promise.all([
    supabase.from("treasury").select("id, type, balance, updated_at").order("type"),
    supabase
      .from("payment_methods")
      .select("id, code, name_ar, name_en, sort_order, is_active, payment_method_treasuries(balance, updated_at)")
      .order("sort_order"),
    supabase.from("expense_types").select("id, name, sort_order, is_active").order("sort_order"),
    supabase
      .from("expenses")
      .select("id, type, expense_type_id, payment_method_id, amount, note, created_at, expense_types(name), payment_methods(name_ar, code)")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("wallets").select("id, user_id, balance, users(full_name, phone)").order("balance", { ascending: false }).limit(30),
    supabase.from("delivery_handovers").select("id, delivery_id, type, total_amount, order_ids, status, created_at, users(full_name)").order("created_at", { ascending: false }).limit(30),
  ]);

  return {
    treasury: (treasury.data || []) as AdminTreasury[],
    paymentMethods: normalizePaymentMethods(paymentMethods.data || []),
    expenseTypes: (expenseTypes.data || []) as AdminExpenseType[],
    expenses: (expenses.data || []) as AdminExpense[],
    wallets: (wallets.data || []) as AdminWallet[],
    handovers: (handovers.data || []) as AdminHandover[],
  };
}

export async function getAdminCategories() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { categories: [] as AdminCategory[] };
  }

  const { data } = await supabase
    .from("categories")
    .select("id, name_ar, name_en, image_url, sort_order, is_active, products(id)")
    .order("sort_order");

  return { categories: (data || []) as AdminCategory[] };
}

export async function getAdminDeliveryAgents() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { agents: [] as AdminDeliveryAgent[] };
  }

  const [users, orders, handovers] = await Promise.all([
    supabase
      .from("users")
      .select("id, phone, full_name, is_active")
      .eq("role", "delivery")
      .order("full_name"),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, payment_method, status, total, delivery_fee, delivery_id, created_at")
      .not("delivery_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("delivery_handovers")
      .select("id, delivery_id, type, total_amount, order_ids, status, created_at, users(full_name)")
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const orderRows = (orders.data || []) as Array<{
    id: string;
    order_number: number | null;
    customer_name: string;
    payment_method: string;
    status: string;
    total: string | number;
    delivery_fee: string | number;
    delivery_id: string;
    created_at: string;
  }>;
  const handoverRows = (handovers.data || []) as AdminHandover[];

  return {
    agents: ((users.data || []) as Array<{
      id: string;
      phone: string;
      full_name: string;
      is_active: boolean;
    }>).map((user) => {
      const agentOrders = orderRows.filter((order) => order.delivery_id === user.id);
      const pendingHandovers = handoverRows.filter((handover) => handover.delivery_id === user.id && handover.status === "pending");

      return {
        ...user,
        activeCashCustody: sumOrders(agentOrders.filter((order) => order.status === "out_for_delivery" && order.payment_method === "cash")),
        activeOrders: agentOrders.filter((order) => order.status === "out_for_delivery").length,
        completedCashCustody: sumOrders(agentOrders.filter((order) => ["delivered", "partial_return", "full_return"].includes(order.status) && order.payment_method === "cash")),
        orders: agentOrders.slice(0, 8).map((order) => ({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          payment_method: order.payment_method,
          status: order.status,
          total: Number(order.total || 0),
          delivery_fee: Number(order.delivery_fee || 0),
          created_at: order.created_at,
        })),
        pendingHandovers,
        returnOrders: agentOrders.filter((order) => ["partial_return", "full_return"].includes(order.status)).length,
      };
    }),
  };
}

export async function getAdminSettings() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return {
      cities: [] as AdminCity[],
      zones: [] as AdminZone[],
      statuses: [] as AdminCustomStatus[],
      warehouses: [] as AdminWarehouse[],
      admins: [] as AdminUser[],
    };
  }

  const [cities, zones, statuses, warehouses, admins] = await Promise.all([
    supabase.from("cities").select("id, name_ar, name_en, is_active").order("name_ar"),
    supabase.from("zones").select("id, city_id, name_ar, name_en, delivery_fee, is_active").order("name_ar"),
    supabase.from("order_custom_statuses").select("id, name, color, sort_order").order("sort_order"),
    supabase.from("warehouses").select("id, name, city_id, address, is_active").order("name"),
    supabase.from("users").select("id, phone, full_name, role, is_active, created_at").in("role", ["super_admin", "admin"]),
  ]);

  return {
    cities: (cities.data || []) as AdminCity[],
    zones: (zones.data || []) as AdminZone[],
    statuses: (statuses.data || []) as AdminCustomStatus[],
    warehouses: (warehouses.data || []) as AdminWarehouse[],
    admins: (admins.data || []) as AdminUser[],
  };
}

export async function getAdminInvoices() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { invoices: [] as AdminInvoice[] };
  }

  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number, order_id, invoice_type, has_return, subtotal, discount_amount, total, delivery_fee, payment_method, printed_at, created_at, orders(customer_name, customer_phone)")
    .order("created_at", { ascending: false })
    .limit(80);

  return { invoices: (data || []) as AdminInvoice[] };
}

export async function getAdminContent() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { banners: [] as AdminBanner[] };
  }

  const { data } = await supabase
    .from("banners")
    .select("id, image_url, link, sort_order, is_active")
    .order("sort_order");

  return { banners: (data || []) as AdminBanner[] };
}

function emptyWarehouseData() {
  return {
    cities: [] as AdminCity[],
    warehouses: [] as AdminWarehouse[],
    inventory: [] as AdminInventoryRow[],
    categories: [] as AdminCategory[],
    priorities: [] as Array<{
      id: string;
      city_id: string;
      warehouse_id: string;
      priority_order: number;
    }>,
    variants: [] as AdminProductVariant[],
    movements: [] as AdminWarehouseMovement[],
  };
}

function normalizeProducts(rows: unknown[]) {
  return rows.map((row) => {
    const product = row as Omit<AdminProduct, "images"> & { images?: unknown };

    return {
      ...product,
      images: Array.isArray(product.images) ? product.images : [],
    };
  });
}

function normalizeWarehouseVariants(rows: unknown[]): AdminProductVariant[] {
  return rows.map((row) => {
    const variant = row as AdminProductVariant;
    const product = variant.products;

    return {
      ...variant,
      extra_price: Number(variant.extra_price || 0),
      products: product
        ? {
            ...product,
            images: Array.isArray(product.images) ? product.images : [],
            cost_price: Number(product.cost_price || 0),
            customer_price: Number(product.customer_price || 0),
            marketer_price: Number(product.marketer_price || 0),
            marketer_commission: Number(product.marketer_commission || 0),
          }
        : null,
      warehouse_inventory: (variant.warehouse_inventory || []).map((inventory) => ({
        ...inventory,
        quantity_available: Number(inventory.quantity_available || 0),
        quantity_reserved: Number(inventory.quantity_reserved || 0),
      })),
    };
  });
}

function normalizePaymentMethods(rows: unknown[]): AdminPaymentMethod[] {
  return rows.map((row) => {
    const method = row as AdminPaymentMethod & {
      payment_method_treasuries?:
        | Array<{ balance?: string | number | null; updated_at?: string | null }>
        | { balance?: string | number | null; updated_at?: string | null }
        | null;
    };
    const treasuries = Array.isArray(method.payment_method_treasuries)
      ? method.payment_method_treasuries
      : method.payment_method_treasuries
        ? [method.payment_method_treasuries]
        : [];

    return {
      ...method,
      payment_method_treasuries: treasuries.map((treasury) => ({
        ...treasury,
        balance: Number(treasury.balance || 0),
      })),
    };
  });
}

function sumOrders(rows: Array<{ total: string | number }>) {
  return rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
}

export function variantLabel(variant: AdminProductVariant) {
  const productName = variant.products?.name_ar || "منتج";
  const details = [variant.color, variant.size, variant.type].filter(Boolean).join(" / ");

  return details ? `${productName} - ${details}` : productName;
}

export function warehouseNameMap(warehouses: AdminWarehouse[]) {
  return new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));
}

export function cityNameMap(cities: AdminCity[]) {
  return new Map(cities.map((city) => [city.id, city.name_ar]));
}

export function groupedZonesByCity(zones: AdminZone[]) {
  return zones.reduce((map, zone) => {
    const current = map.get(zone.city_id) || [];
    current.push(zone);
    map.set(zone.city_id, current);
    return map;
  }, new Map<string, AdminZone[]>());
}

export function ensureAdminSupabase(): AdminSupabaseClient | null {
  return createUserRouteClient();
}
