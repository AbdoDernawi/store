import { createUserRouteClient } from "@/lib/supabase/route";
import type { AuthSession } from "@/types/auth";

type InvoiceSupabase = NonNullable<ReturnType<typeof createUserRouteClient>>;

export type InvoiceArchiveRecord = {
  id: string | null;
  invoice_number: number | null;
  order_id: string;
  invoice_type: string;
  virtual_store_id: string | null;
  has_return: boolean;
  return_id: string | null;
  subtotal: number;
  discount_amount: number;
  total: number;
  delivery_fee: number;
  payment_method: string;
  printed_at: string | null;
  printed_by: string | null;
  created_at: string;
};

export type InvoiceIdentity = {
  name: string;
  logoUrl: string | null;
  contactPhone: string | null;
  address: string | null;
  note: string | null;
  primaryColor: string;
  secondaryColor: string;
};

export type InvoiceDocument = {
  invoice: InvoiceArchiveRecord;
  identity: InvoiceIdentity;
  order: {
    id: string;
    order_number: number | null;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    created_at: string;
    payment_method: string;
    invoice_type: string;
    virtual_store_id: string | null;
  };
  items: Array<{
    id: string;
    productName: string;
    variantLabel: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  package: {
    id: string;
    package_number: number | null;
    qr_code_hash: string;
  } | null;
  returnInfo: {
    id: string;
    type: string;
    reason: string | null;
    status: string;
  } | null;
};

type InvoiceOrderRow = {
  id: string;
  order_number: number | string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  invoice_type: string;
  virtual_store_id: string | null;
  subtotal: number | string | null;
  discount_amount: number | string | null;
  total: number | string | null;
  delivery_fee: number | string | null;
  payment_method: string;
  created_at: string;
};

export async function findInvoiceRecord(supabase: InvoiceSupabase, invoiceId: string) {
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  return data ? normalizeInvoice(data as InvoiceArchiveRecord) : null;
}

export async function findInvoiceForOrder(supabase: InvoiceSupabase, orderId: string) {
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data ? normalizeInvoice(data as InvoiceArchiveRecord) : null;
}

export async function ensureInvoiceForOrder(
  supabase: InvoiceSupabase,
  user: AuthSession,
  orderId: string,
) {
  const existing = await findInvoiceForOrder(supabase, orderId);

  if (existing) {
    return existing;
  }

  const order = await getInvoiceOrder(supabase, orderId);

  if (!order) {
    return null;
  }

  if (!["super_admin", "admin"].includes(user.role)) {
    return invoiceFromOrder(order);
  }

  const { data } = await supabase
    .from("invoices")
    .insert(invoiceInsertPayload(order))
    .select("*")
    .single();

  return data ? normalizeInvoice(data as InvoiceArchiveRecord) : invoiceFromOrder(order);
}

export async function archiveInvoicesForOrders(
  supabase: InvoiceSupabase,
  orderIds: string[],
) {
  if (!orderIds.length) {
    return [];
  }

  const [{ data: orders }, { data: existing }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, customer_address, invoice_type, virtual_store_id, subtotal, discount_amount, total, delivery_fee, payment_method, created_at")
      .in("id", orderIds),
    supabase
      .from("invoices")
      .select("order_id")
      .in("order_id", orderIds),
  ]);
  const existingOrderIds = new Set((existing || []).map((invoice) => invoice.order_id));
  const payload = ((orders || []) as InvoiceOrderRow[])
    .filter((order) => !existingOrderIds.has(order.id))
    .map(invoiceInsertPayload);

  if (!payload.length) {
    return [];
  }

  const { data } = await supabase
    .from("invoices")
    .insert(payload)
    .select("*");

  return ((data || []) as InvoiceArchiveRecord[]).map(normalizeInvoice);
}

export async function loadInvoiceDocument(
  supabase: InvoiceSupabase,
  invoice: InvoiceArchiveRecord,
): Promise<InvoiceDocument | null> {
  const order = await getInvoiceOrder(supabase, invoice.order_id);

  if (!order) {
    return null;
  }

  const [items, packageResult, returnResult, identity] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, quantity, unit_price, total_price, products(name_ar), product_variants(color, size, type)")
      .eq("order_id", order.id)
      .order("id"),
    supabase
      .from("order_packages")
      .select("id, package_number, qr_code_hash")
      .contains("order_ids", [order.id])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("returns")
      .select("id, type, reason, status")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getInvoiceIdentity(supabase, order),
  ]);

  return {
    identity,
    invoice,
    items: (items.data || []).map((item) => {
      const product = firstRelation(item.products);
      const variant = firstRelation(item.product_variants);

      return {
        id: item.id,
        productName: product?.name_ar || "منتج",
        quantity: Number(item.quantity || 0),
        totalPrice: Number(item.total_price || 0),
        unitPrice: Number(item.unit_price || 0),
        variantLabel: [variant?.color, variant?.size, variant?.type].filter(Boolean).join(" / "),
      };
    }),
    order: {
      created_at: order.created_at,
      customer_address: order.customer_address || "",
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      id: order.id,
      invoice_type: order.invoice_type,
      order_number: order.order_number ? Number(order.order_number) : null,
      payment_method: order.payment_method,
      virtual_store_id: order.virtual_store_id,
    },
    package: packageResult.data
      ? {
          id: packageResult.data.id,
          package_number: packageResult.data.package_number ? Number(packageResult.data.package_number) : null,
          qr_code_hash: packageResult.data.qr_code_hash,
        }
      : null,
    returnInfo: returnResult.data
      ? {
          id: returnResult.data.id,
          reason: returnResult.data.reason,
          status: returnResult.data.status,
          type: returnResult.data.type,
        }
      : null,
  };
}

export async function markInvoicePrinted(
  supabase: InvoiceSupabase,
  invoice: InvoiceArchiveRecord,
  user: AuthSession,
) {
  if (!invoice.id || invoice.printed_at || !["super_admin", "admin"].includes(user.role)) {
    return invoice;
  }

  const printedAt = new Date().toISOString();
  const { data } = await supabase
    .from("invoices")
    .update({
      printed_at: printedAt,
      printed_by: user.id,
    })
    .eq("id", invoice.id)
    .select("*")
    .single();

  return data ? normalizeInvoice(data as InvoiceArchiveRecord) : { ...invoice, printed_at: printedAt, printed_by: user.id };
}

async function getInvoiceOrder(supabase: InvoiceSupabase, orderId: string) {
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, customer_address, invoice_type, virtual_store_id, subtotal, discount_amount, total, delivery_fee, payment_method, created_at")
    .eq("id", orderId)
    .maybeSingle();

  return data ? (data as InvoiceOrderRow) : null;
}

async function getInvoiceIdentity(supabase: InvoiceSupabase, order: InvoiceOrderRow) {
  if (order.invoice_type !== "virtual" || !order.virtual_store_id) {
    return originalStoreIdentity();
  }

  const { data } = await supabase
    .from("virtual_stores")
    .select("store_name, logo_url, primary_color, secondary_color, contact_phone, address, invoice_note")
    .eq("id", order.virtual_store_id)
    .maybeSingle();

  return {
    address: data?.address || null,
    contactPhone: data?.contact_phone || null,
    logoUrl: data?.logo_url || null,
    name: data?.store_name || "متجر افتراضي",
    note: data?.invoice_note || null,
    primaryColor: data?.primary_color || "#059669",
    secondaryColor: data?.secondary_color || "#ecfdf5",
  };
}

function originalStoreIdentity(): InvoiceIdentity {
  return {
    address: process.env.STORE_ADDRESS || null,
    contactPhone: process.env.STORE_CONTACT_PHONE || null,
    logoUrl: process.env.STORE_LOGO_URL || null,
    name: process.env.STORE_NAME || "إدارة المتجر",
    note: process.env.STORE_INVOICE_NOTE || null,
    primaryColor: process.env.STORE_PRIMARY_COLOR || "#059669",
    secondaryColor: process.env.STORE_SECONDARY_COLOR || "#ecfdf5",
  };
}

function invoiceInsertPayload(order: InvoiceOrderRow) {
  return {
    delivery_fee: Number(order.delivery_fee || 0),
    discount_amount: Number(order.discount_amount || 0),
    invoice_type: order.invoice_type,
    order_id: order.id,
    payment_method: order.payment_method,
    subtotal: Number(order.subtotal || 0),
    total: Number(order.total || 0),
    virtual_store_id: order.virtual_store_id,
  };
}

function invoiceFromOrder(order: InvoiceOrderRow): InvoiceArchiveRecord {
  return {
    created_at: order.created_at,
    delivery_fee: Number(order.delivery_fee || 0),
    discount_amount: Number(order.discount_amount || 0),
    has_return: false,
    id: null,
    invoice_number: null,
    invoice_type: order.invoice_type,
    order_id: order.id,
    payment_method: order.payment_method,
    printed_at: null,
    printed_by: null,
    return_id: null,
    subtotal: Number(order.subtotal || 0),
    total: Number(order.total || 0),
    virtual_store_id: order.virtual_store_id,
  };
}

function normalizeInvoice(invoice: InvoiceArchiveRecord) {
  return {
    ...invoice,
    delivery_fee: Number(invoice.delivery_fee || 0),
    discount_amount: Number(invoice.discount_amount || 0),
    invoice_number: invoice.invoice_number ? Number(invoice.invoice_number) : null,
    subtotal: Number(invoice.subtotal || 0),
    total: Number(invoice.total || 0),
  };
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
