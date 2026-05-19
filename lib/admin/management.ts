import { createUserRouteClient } from "@/lib/supabase/route";

type AdminSupabaseClient = NonNullable<ReturnType<typeof createUserRouteClient>>;

export type AdminCategory = {
  id: string;
  name_ar: string;
  name_en: string;
  image_url: string | null;
  is_active: boolean;
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
  products?: { name_ar?: string | null } | null;
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

export type AdminExpense = {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  created_at: string;
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
  total_amount: number;
  order_ids: string[] | null;
  status: string;
  created_at: string;
  users?: { full_name?: string | null } | null;
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

  const [cities, warehouses, inventory, priorities, variants] = await Promise.all([
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
      .select("id, product_id, color, size, type, image_url, extra_price, products(name_ar)")
      .eq("is_active", true)
      .limit(120),
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
    variants: (variants.data || []) as AdminProductVariant[],
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
      expenses: [] as AdminExpense[],
      wallets: [] as AdminWallet[],
      handovers: [] as AdminHandover[],
    };
  }

  const [treasury, expenses, wallets, handovers] = await Promise.all([
    supabase.from("treasury").select("id, type, balance, updated_at").order("type"),
    supabase.from("expenses").select("id, type, amount, note, created_at").order("created_at", { ascending: false }).limit(40),
    supabase.from("wallets").select("id, user_id, balance, users(full_name, phone)").order("balance", { ascending: false }).limit(30),
    supabase.from("delivery_handovers").select("id, delivery_id, total_amount, order_ids, status, created_at, users(full_name)").order("created_at", { ascending: false }).limit(30),
  ]);

  return {
    treasury: (treasury.data || []) as AdminTreasury[],
    expenses: (expenses.data || []) as AdminExpense[],
    wallets: (wallets.data || []) as AdminWallet[],
    handovers: (handovers.data || []) as AdminHandover[],
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
    priorities: [] as Array<{
      id: string;
      city_id: string;
      warehouse_id: string;
      priority_order: number;
    }>,
    variants: [] as AdminProductVariant[],
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
