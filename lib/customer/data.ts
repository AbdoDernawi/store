import { createUserRouteClient } from "@/lib/supabase/route";
import type { AuthSession } from "@/types/auth";

export type CustomerCatalogVariant = {
  id: string;
  color: string | null;
  size: string | null;
  type: string | null;
  image_url: string | null;
  extra_price: number;
  available_quantity: number;
};

export type CustomerCatalogProduct = {
  id: string;
  category_id: string | null;
  category_name: string | null;
  name_ar: string;
  description_ar: string | null;
  images: Array<{ thumb?: string; medium?: string; large?: string }>;
  customer_price: number;
  available_quantity: number;
  variants: CustomerCatalogVariant[];
};

export type CustomerCategory = {
  id: string;
  name_ar: string;
  image_url: string | null;
};

export type CustomerCity = {
  id: string;
  name_ar: string;
};

export type CustomerZone = {
  id: string;
  city_id: string;
  name_ar: string;
  delivery_fee: number;
};

export type CustomerAddress = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  city_id: string;
  zone_id: string;
  address: string;
  is_default: boolean;
  city_name: string;
  zone_name: string;
  delivery_fee: number;
};

export type CustomerBanner = {
  id: string;
  image_url: string;
  link: string | null;
  sort_order: number;
};

export type CustomerOrderListItem = {
  id: string;
  order_number: number | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  city_name: string | null;
  zone_name: string | null;
  delivery_name: string | null;
  delivery_phone: string | null;
  delivery_fee: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  cancellation_requested_by: string | null;
  created_at: string;
  items_count: number;
};

export type CustomerOrderDetails = {
  order: CustomerOrderListItem & {
    city_id: string;
    zone_id: string;
    transfer_image_url: string | null;
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
    changed_by_name: string | null;
    created_at: string;
    note: string | null;
    status: string;
  }>;
};

export type CustomerInvoice = {
  id: string;
  invoice_number: number | null;
  invoice_type: string;
  has_return: boolean;
  subtotal: number;
  total: number;
  delivery_fee: number;
  payment_method: string;
  created_at: string;
  order: {
    order_number: number | null;
    customer_name: string;
    customer_phone: string;
  } | null;
};

export async function getCustomerHomeData(user: AuthSession) {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return {
      banners: [] as CustomerBanner[],
      categories: [] as CustomerCategory[],
      featuredProducts: [] as CustomerCatalogProduct[],
      inDelivery: 0,
      ordersCount: 0,
    };
  }

  const [banners, categories, catalog, ordersCount, inDelivery] = await Promise.all([
    supabase
      .from("banners")
      .select("id, image_url, link, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .limit(6),
    supabase
      .from("categories")
      .select("id, name_ar, image_url")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.rpc("get_customer_catalog"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", user.id),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", user.id)
      .eq("status", "out_for_delivery"),
  ]);

  return {
    banners: (banners.data || []) as CustomerBanner[],
    categories: (categories.data || []) as CustomerCategory[],
    featuredProducts: normalizeCatalog(catalog.data || []).slice(0, 6),
    inDelivery: inDelivery.count || 0,
    ordersCount: ordersCount.count || 0,
  };
}

export async function getCustomerProductsData() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return {
      addresses: [] as CustomerAddress[],
      categories: [] as CustomerCategory[],
      cities: [] as CustomerCity[],
      products: [] as CustomerCatalogProduct[],
      zones: [] as CustomerZone[],
    };
  }

  const [catalog, categories, cities, zones, addresses] = await Promise.all([
    supabase.rpc("get_customer_catalog"),
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
    getCustomerAddressesQuery(supabase),
  ]);

  return {
    addresses: normalizeAddresses(addresses.data || []),
    categories: (categories.data || []) as CustomerCategory[],
    cities: (cities.data || []) as CustomerCity[],
    products: normalizeCatalog(catalog.data || []),
    zones: normalizeZones(zones.data || []),
  };
}

export async function getCustomerLocationsAndAddresses() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return {
      addresses: [] as CustomerAddress[],
      cities: [] as CustomerCity[],
      zones: [] as CustomerZone[],
    };
  }

  const [cities, zones, addresses] = await Promise.all([
    supabase.from("cities").select("id, name_ar").eq("is_active", true).order("name_ar"),
    supabase
      .from("zones")
      .select("id, city_id, name_ar, delivery_fee")
      .eq("is_active", true)
      .order("name_ar"),
    getCustomerAddressesQuery(supabase),
  ]);

  return {
    addresses: normalizeAddresses(addresses.data || []),
    cities: (cities.data || []) as CustomerCity[],
    zones: normalizeZones(zones.data || []),
  };
}

export async function getCustomerOrders() {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { orders: [] as CustomerOrderListItem[] };
  }

  const { data, error } = await supabase.rpc("get_customer_orders");

  if (error || !data) {
    return { orders: [] as CustomerOrderListItem[] };
  }

  return { orders: normalizeOrderList(data) };
}

export async function getCustomerOrderDetails(id: string): Promise<CustomerOrderDetails | null> {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_customer_order_details", {
    p_order_id: id,
  });

  if (error || !data) {
    return null;
  }

  return normalizeOrderDetails(data);
}

export async function getCustomerInvoices(search?: string, dateFrom?: string, dateTo?: string) {
  const supabase = createUserRouteClient();

  if (!supabase) {
    return { invoices: [] as CustomerInvoice[] };
  }

  let queryBuilder = supabase
    .from("invoices")
    .select("id, invoice_number, invoice_type, has_return, subtotal, total, delivery_fee, payment_method, created_at, orders(order_number, customer_name, customer_phone)")
    .order("created_at", { ascending: false });

  if (dateFrom) {
    queryBuilder = queryBuilder.gte("created_at", `${dateFrom}T00:00:00`);
  }

  if (dateTo) {
    queryBuilder = queryBuilder.lte("created_at", `${dateTo}T23:59:59`);
  }

  const { data } = await queryBuilder.limit(100);

  const query = String(search || "").trim().toLowerCase();
  const invoices = normalizeInvoices(data || []);

  if (!query) {
    return { invoices };
  }

  return {
    invoices: invoices.filter((invoice) =>
      [
        invoice.invoice_number,
        invoice.order?.order_number,
        invoice.order?.customer_name,
        invoice.order?.customer_phone,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    ),
  };
}

function getCustomerAddressesQuery(
  supabase: NonNullable<ReturnType<typeof createUserRouteClient>>,
) {
  return supabase
    .from("customer_addresses")
    .select("id, label, recipient_name, phone, city_id, zone_id, address, is_default, cities(name_ar), zones(name_ar, delivery_fee)")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
}

function normalizeCatalog(rows: unknown[]): CustomerCatalogProduct[] {
  return rows.map((row) => {
    const product = row as Omit<CustomerCatalogProduct, "images" | "customer_price" | "available_quantity" | "variants"> & {
      available_quantity?: string | number | null;
      customer_price?: string | number | null;
      images?: unknown;
      variants?: unknown;
    };

    return {
      ...product,
      available_quantity: Number(product.available_quantity || 0),
      customer_price: Number(product.customer_price || 0),
      images: Array.isArray(product.images) ? product.images : [],
      variants: normalizeVariants(product.variants),
    };
  });
}

function normalizeVariants(value: unknown): CustomerCatalogVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((variant) => {
    const row = variant as CustomerCatalogVariant & {
      available_quantity?: string | number | null;
      extra_price?: string | number | null;
    };

    return {
      available_quantity: Number(row.available_quantity || 0),
      color: row.color || null,
      extra_price: Number(row.extra_price || 0),
      id: row.id,
      image_url: row.image_url || null,
      size: row.size || null,
      type: row.type || null,
    };
  });
}

function normalizeZones(rows: unknown[]): CustomerZone[] {
  return rows.map((row) => {
    const zone = row as CustomerZone & { delivery_fee?: string | number | null };

    return {
      ...zone,
      delivery_fee: Number(zone.delivery_fee || 0),
    };
  });
}

function normalizeAddresses(rows: unknown[]): CustomerAddress[] {
  return rows.map((row) => {
    const address = row as CustomerAddress & {
      cities?: { name_ar?: string | null } | Array<{ name_ar?: string | null }>;
      zones?: { delivery_fee?: string | number | null; name_ar?: string | null } | Array<{ delivery_fee?: string | number | null; name_ar?: string | null }>;
    };
    const city = Array.isArray(address.cities) ? address.cities[0] : address.cities;
    const zone = Array.isArray(address.zones) ? address.zones[0] : address.zones;

    return {
      address: address.address,
      city_id: address.city_id,
      city_name: city?.name_ar || "-",
      delivery_fee: Number(zone?.delivery_fee || 0),
      id: address.id,
      is_default: Boolean(address.is_default),
      label: address.label,
      phone: address.phone,
      recipient_name: address.recipient_name,
      zone_id: address.zone_id,
      zone_name: zone?.name_ar || "-",
    };
  });
}

function normalizeOrderList(value: unknown): CustomerOrderListItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((row) => {
    const order = row as CustomerOrderListItem & {
      delivery_fee?: string | number | null;
      discount_amount?: string | number | null;
      items_count?: string | number | null;
      subtotal?: string | number | null;
      total?: string | number | null;
    };

    return {
      ...order,
      delivery_fee: Number(order.delivery_fee || 0),
      discount_amount: Number(order.discount_amount || 0),
      items_count: Number(order.items_count || 0),
      subtotal: Number(order.subtotal || 0),
      total: Number(order.total || 0),
    };
  });
}

function normalizeOrderDetails(value: unknown): CustomerOrderDetails {
  const details = value as CustomerOrderDetails;

  return {
    ...details,
    history: details.history || [],
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
      items_count: Number(details.order.items_count || 0),
      subtotal: Number(details.order.subtotal || 0),
      total: Number(details.order.total || 0),
    },
  };
}

function normalizeInvoices(rows: unknown[]): CustomerInvoice[] {
  return rows.map((row) => {
    const invoice = row as CustomerInvoice & {
      delivery_fee?: string | number | null;
      invoice_number?: string | number | null;
      orders?: CustomerInvoice["order"] | CustomerInvoice["order"][];
      subtotal?: string | number | null;
      total?: string | number | null;
    };
    const order = Array.isArray(invoice.orders) ? invoice.orders[0] : invoice.orders;

    return {
      created_at: invoice.created_at,
      delivery_fee: Number(invoice.delivery_fee || 0),
      has_return: Boolean(invoice.has_return),
      id: invoice.id,
      invoice_number: invoice.invoice_number ? Number(invoice.invoice_number) : null,
      invoice_type: invoice.invoice_type,
      order: order || null,
      payment_method: invoice.payment_method,
      subtotal: Number(invoice.subtotal || 0),
      total: Number(invoice.total || 0),
    };
  });
}

export function createCustomerVariantLabel(variant: CustomerCatalogVariant) {
  return [variant.color, variant.size, variant.type].filter(Boolean).join(" / ") || "الخيار الأساسي";
}
