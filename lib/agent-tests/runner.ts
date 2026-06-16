import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

type AgentTestMode = "dry_run" | "manual" | "scheduled";
type AgentEventStatus = "passed" | "warning" | "failed" | "info";

type AgentTestOptions = {
  baseUrl: string;
  label?: string;
  mode?: AgentTestMode;
  password?: string;
};

type AgentEventInput = {
  agentKey: string;
  role: string;
  scenario: string;
  step: string;
  status: AgentEventStatus;
  message: string;
  targetType?: string;
  targetId?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

type AgentTestSummary = {
  orders: string[];
  handovers: string[];
  packageId?: string;
  packageNumber?: number;
  passed: number;
  warnings: number;
  failed: number;
};

type FixtureVariant = {
  id: string;
  product_id: string;
  product_name: string;
  available: number;
  warehouse_id: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_variant_id: string;
  quantity: number;
  total_commission: number;
  warehouse_id: string | null;
};

type VariantFixtureRow = {
  id: string;
  product_id: string;
  products?: {
    name_ar?: string | null;
  } | null;
  warehouse_inventory?: Array<{
    quantity_available?: number | string | null;
    quantity_reserved?: number | string | null;
    warehouse_id?: string | null;
  }> | null;
};

const demoPhones = {
  admin: process.env.DEMO_ADMIN_PHONE || "+218910000002",
  customer: process.env.DEMO_CUSTOMER_PHONE || "+218910000005",
  delivery: process.env.DEMO_DELIVERY_PHONE || "+218910000004",
  marketer: process.env.DEMO_MARKETER_PHONE || "+218910000003",
};

export async function runAgentTestCycle(options: AgentTestOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const password =
    options.password ||
    process.env.DEMO_AGENT_PASSWORD ||
    process.env.DEMO_ADMIN_PASSWORD ||
    "Demo@123456";
  const mode = options.mode || "manual";
  const label = options.label || `AGENT_TEST cycle ${new Date().toISOString()}`;
  const supabase = createAdminClient();
  const summary: AgentTestSummary = {
    orders: [],
    handovers: [],
    passed: 0,
    warnings: 0,
    failed: 0,
  };

  const { data: run, error: runError } = await supabase
    .from("agent_test_runs")
    .insert({ base_url: baseUrl, label, mode, status: "running" })
    .select("id")
    .single();

  if (runError || !run?.id) {
    throw runError || new Error("Could not create agent test run.");
  }

  const runId = run.id as string;
  const events: AgentEventInput[] = [];

  async function record(event: AgentEventInput) {
    events.push(event);

    if (event.status === "passed") {
      summary.passed += 1;
    } else if (event.status === "warning") {
      summary.warnings += 1;
    } else if (event.status === "failed") {
      summary.failed += 1;
    }

    const { error } = await supabase.from("agent_test_events").insert({
      agent_key: event.agentKey,
      duration_ms: event.durationMs ?? null,
      message: event.message,
      metadata: event.metadata || {},
      role: event.role,
      run_id: runId,
      scenario: event.scenario,
      status: event.status,
      step: event.step,
      target_id: event.targetId || null,
      target_type: event.targetType || null,
    });

    if (error) {
      console.warn("Could not record agent test event", error.message);
    }
  }

  async function step<T>(
    event: Omit<AgentEventInput, "status" | "message" | "durationMs"> & {
      successMessage: string;
    },
    action: () => Promise<T>,
  ) {
    const startedAt = Date.now();

    try {
      const result = await action();
      await record({
        ...event,
        durationMs: Date.now() - startedAt,
        message: event.successMessage,
        status: "passed",
      });
      return result;
    } catch (error) {
      await record({
        ...event,
        durationMs: Date.now() - startedAt,
        message: errorToMessage(error),
        status: "failed",
      });
      throw error;
    }
  }

  try {
    const fixtures = await step(
      {
        agentKey: "auditor",
        role: "auditor",
        scenario: "setup",
        step: "load_fixtures",
        successMessage: "Loaded city, zone, and stocked product variants.",
      },
      () => loadFixtures(supabase),
    );

    const marketer = new AppSession(baseUrl);
    const admin = new AppSession(baseUrl);
    const delivery = new AppSession(baseUrl);

    await step(
      {
        agentKey: "marketer",
        role: "marketer",
        scenario: "auth",
        step: "login",
        successMessage: "Marketer logged in successfully.",
      },
      () => marketer.login(demoPhones.marketer, password),
    );
    await step(
      {
        agentKey: "admin",
        role: "admin",
        scenario: "auth",
        step: "login",
        successMessage: "Admin logged in successfully.",
      },
      () => admin.login(demoPhones.admin, password),
    );
    await step(
      {
        agentKey: "delivery",
        role: "delivery",
        scenario: "auth",
        step: "login",
        successMessage: "Delivery agent logged in successfully.",
      },
      () => delivery.login(demoPhones.delivery, password),
    );

    const fullOrder = await createAgentOrder({
      fixtures,
      itemPlan: [{ quantity: 1, variant: fixtures.variants[0] }],
      name: "full-delivery",
      session: marketer,
    });
    const partialOrder = await createAgentOrder({
      fixtures,
      itemPlan: [{ quantity: 2, variant: fixtures.variants[1] }],
      name: "partial-return",
      session: marketer,
    });
    const returnOrder = await createAgentOrder({
      fixtures,
      itemPlan: [{ quantity: 1, variant: fixtures.variants[2] }],
      name: "full-return",
      session: marketer,
    });
    const rejectedOrder = await createAgentOrder({
      fixtures,
      itemPlan: [{ quantity: 1, variant: fixtures.variants[0] }],
      name: "admin-reject",
      session: marketer,
    });

    summary.orders.push(fullOrder.id, partialOrder.id, returnOrder.id, rejectedOrder.id);
    await record({
      agentKey: "marketer",
      role: "marketer",
      scenario: "orders",
      step: "create_orders",
      status: "passed",
      message: "Created four AGENT_TEST orders for full delivery, partial return, full return, and rejection.",
      metadata: { orderIds: summary.orders },
    });

    for (const orderId of [fullOrder.id, partialOrder.id, returnOrder.id]) {
      await step(
        {
          agentKey: "admin",
          role: "admin",
          scenario: "orders",
          step: "approve_order",
          successMessage: "Order approved.",
          targetId: orderId,
          targetType: "order",
        },
        () => admin.postJson("/api/orders/approve", { order_id: orderId }),
      );
      await record({
        agentKey: "admin",
        role: "admin",
        scenario: "inventory",
        step: "reserve_stock",
        status: "info",
        message: "Stock reservation is performed by approve_order.",
        targetId: orderId,
        targetType: "order",
      });
    }

    await step(
      {
        agentKey: "admin",
        role: "admin",
        scenario: "orders",
        step: "reject_order",
        successMessage: "Order rejected successfully.",
        targetId: rejectedOrder.id,
        targetType: "order",
      },
      () => admin.postJson("/api/orders/reject", { order_id: rejectedOrder.id, reason: "AGENT_TEST rejection path" }),
    );

    const packageResponse = await step(
      {
        agentKey: "admin",
        role: "admin",
        scenario: "delivery",
        step: "create_package",
        successMessage: "Delivery package created.",
      },
      () => admin.postJson("/api/packages/create", { order_ids: [fullOrder.id, partialOrder.id, returnOrder.id] }),
    );
    const deliveryPackage = packageResponse.package as { id: string; package_number?: number; qr_code_hash: string };
    summary.packageId = deliveryPackage.id;
    summary.packageNumber = deliveryPackage.package_number;

    await step(
      {
        agentKey: "delivery",
        role: "delivery",
        scenario: "delivery",
        step: "scan_package",
        successMessage: "Package scanned and assigned to delivery agent.",
        targetId: deliveryPackage.id,
        targetType: "package",
      },
      () => delivery.postJson("/api/packages/scan", { qr_code_hash: deliveryPackage.qr_code_hash }),
    );

    const partialItems = await loadOrderItems(supabase, partialOrder.id);
    const returnItems = await loadOrderItems(supabase, returnOrder.id);
    const partialReturnItem = partialItems[0];

    await step(
      {
        agentKey: "delivery",
        role: "delivery",
        scenario: "delivery",
        step: "deliver_full",
        successMessage: "Full delivery completed.",
        targetId: fullOrder.id,
        targetType: "order",
      },
      () => delivery.postJson("/api/orders/deliver", { order_id: fullOrder.id, type: "full" }),
    );
    await step(
      {
        agentKey: "delivery",
        role: "delivery",
        scenario: "delivery",
        step: "deliver_partial_return",
        successMessage: "Partial return delivery result recorded.",
        targetId: partialOrder.id,
        targetType: "order",
      },
      () =>
        delivery.postJson("/api/orders/deliver", {
          items: [
            {
              order_item_id: partialReturnItem.id,
              original_warehouse_id: partialReturnItem.warehouse_id,
              product_variant_id: partialReturnItem.product_variant_id,
              quantity: 1,
            },
          ],
          order_id: partialOrder.id,
          reason: "AGENT_TEST partial return",
          type: "partial_return",
        }),
    );
    await step(
      {
        agentKey: "delivery",
        role: "delivery",
        scenario: "delivery",
        step: "deliver_full_return",
        successMessage: "Full return delivery result recorded.",
        targetId: returnOrder.id,
        targetType: "order",
      },
      () =>
        delivery.postJson("/api/orders/deliver", {
          order_id: returnOrder.id,
          reason: "AGENT_TEST full return",
          type: "full_return",
        }),
    );

    const cashHandover = await step(
      {
        agentKey: "delivery",
        role: "delivery",
        scenario: "handover",
        step: "create_cash_handover",
        successMessage: "Cash handover created for delivered and partial-return orders.",
      },
      () => delivery.postJson("/api/delivery/handovers", { order_ids: [fullOrder.id, partialOrder.id], type: "cash_partial" }),
    );
    const cashHandoverId = String((cashHandover.handover as { id: string }).id);
    summary.handovers.push(cashHandoverId);

    await step(
      {
        agentKey: "admin",
        role: "admin",
        scenario: "handover",
        step: "confirm_cash_handover",
        successMessage: "Admin confirmed cash handover.",
        targetId: cashHandoverId,
        targetType: "handover",
      },
      () => admin.postJson("/api/handovers/confirm", { handover_id: cashHandoverId }),
    );

    const partialReturnHandover = await step(
      {
        agentKey: "delivery",
        role: "delivery",
        scenario: "handover",
        step: "create_partial_return_handover",
        successMessage: "Partial returned item handover created.",
      },
      () =>
        delivery.postJson("/api/delivery/handovers", {
          items: [{ order_item_id: partialReturnItem.id, quantity: 1 }],
          type: "return_goods",
        }),
    );
    const partialReturnHandoverId = String((partialReturnHandover.handover as { id: string }).id);
    summary.handovers.push(partialReturnHandoverId);

    await step(
      {
        agentKey: "admin",
        role: "admin",
        scenario: "handover",
        step: "confirm_partial_return_handover",
        successMessage: "Admin confirmed partial returned item handover.",
        targetId: partialReturnHandoverId,
        targetType: "handover",
      },
      () => admin.postJson("/api/handovers/confirm", { handover_id: partialReturnHandoverId }),
    );

    const fullReturnHandover = await step(
      {
        agentKey: "delivery",
        role: "delivery",
        scenario: "handover",
        step: "create_full_return_handover",
        successMessage: "Full return goods handover created.",
      },
      () => delivery.postJson("/api/delivery/handovers", { order_ids: [returnOrder.id], type: "return_goods" }),
    );
    const fullReturnHandoverId = String((fullReturnHandover.handover as { id: string }).id);
    summary.handovers.push(fullReturnHandoverId);

    await step(
      {
        agentKey: "admin",
        role: "admin",
        scenario: "handover",
        step: "confirm_full_return_handover",
        successMessage: "Admin confirmed full return goods handover.",
        targetId: fullReturnHandoverId,
        targetType: "handover",
      },
      () => admin.postJson("/api/handovers/confirm", { handover_id: fullReturnHandoverId }),
    );

    await verifyOrderStates(supabase, record, {
      cashOrderIds: [fullOrder.id, partialOrder.id],
      expected: {
        [fullOrder.id]: "delivered",
        [partialOrder.id]: "partial_return",
        [rejectedOrder.id]: "rejected",
        [returnOrder.id]: "full_return",
      },
      handoverIds: summary.handovers,
      returnItemIds: [partialReturnItem.id, ...returnItems.map((item) => item.id)],
    });

    const status = summary.failed > 0 ? "failed" : summary.warnings > 0 ? "warning" : "passed";
    await supabase
      .from("agent_test_runs")
      .update({ finished_at: new Date().toISOString(), status, summary })
      .eq("id", runId);

    return { events, runId, status, summary };
  } catch (error) {
    const status = "failed";
    await supabase
      .from("agent_test_runs")
      .update({
        finished_at: new Date().toISOString(),
        status,
        summary: {
          ...summary,
          error: errorToMessage(error),
        },
      })
      .eq("id", runId);

    return {
      events,
      runId,
      status,
      summary: {
        ...summary,
        error: errorToMessage(error),
      },
    };
  }
}

async function loadFixtures(supabase: SupabaseClient) {
  const { data: city, error: cityError } = await supabase
    .from("cities")
    .select("id, name_ar")
    .eq("is_active", true)
    .order("name_ar", { ascending: true })
    .limit(1)
    .single();

  if (cityError || !city) {
    throw cityError ? new Error(errorToMessage(cityError)) : new Error("No active city found for agent tests.");
  }

  const { data: zone, error: zoneError } = await supabase
    .from("zones")
    .select("id, name_ar, delivery_fee")
    .eq("city_id", city.id)
    .eq("is_active", true)
    .order("delivery_fee", { ascending: true })
    .limit(1)
    .single();

  if (zoneError || !zone) {
    throw zoneError ? new Error(errorToMessage(zoneError)) : new Error("No active zone found for agent tests.");
  }

  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select(
      "id, product_id, products!inner(name_ar, is_active), warehouse_inventory(warehouse_id, quantity_available, quantity_reserved)",
    )
    .eq("is_active", true)
    .eq("products.is_active", true)
    .limit(80);

  if (variantsError) {
    throw new Error(errorToMessage(variantsError));
  }

  const stocked = ((variants || []) as VariantFixtureRow[])
    .map((variant) => {
      const inventoryRows = Array.isArray(variant.warehouse_inventory) ? variant.warehouse_inventory : [];
      const best = inventoryRows
        .map((row) => ({
          available: Number(row.quantity_available || 0) - Number(row.quantity_reserved || 0),
          warehouse_id: row.warehouse_id || null,
        }))
        .sort((a, b) => b.available - a.available)[0];

      return {
        available: best?.available || 0,
        id: String(variant.id),
        product_id: String(variant.product_id),
        product_name: String(variant.products?.name_ar || "Product"),
        warehouse_id: best?.warehouse_id || null,
      };
    })
    .filter((variant): variant is FixtureVariant => variant.available >= 4 && Boolean(variant.warehouse_id))
    .slice(0, 3);

  if (stocked.length < 3) {
    throw new Error("Agent tests need at least three active variants with available stock.");
  }

  return { city, variants: stocked, zone };
}

async function createAgentOrder(input: {
  fixtures: Awaited<ReturnType<typeof loadFixtures>>;
  itemPlan: Array<{ quantity: number; variant: FixtureVariant }>;
  name: string;
  session: AppSession;
}) {
  const response = await input.session.postJson("/api/orders/create", {
    city_id: input.fixtures.city.id,
    customer_address: `AGENT_TEST address ${input.name}`,
    customer_name: `AGENT_TEST ${input.name}`,
    customer_phone: `+21891${Math.floor(1000000 + Math.random() * 8999999)}`,
    items: input.itemPlan.map((item) => ({
      product_variant_id: item.variant.id,
      quantity: item.quantity,
    })),
    payment_method: "cash",
    zone_id: input.fixtures.zone.id,
  });

  const order = response.order as { id?: string };

  if (!order?.id) {
    throw new Error(`Order ${input.name} was created without an id.`);
  }

  return { id: order.id };
}

async function loadOrderItems(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select("id, order_id, product_variant_id, quantity, total_commission, warehouse_id")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(errorToMessage(error));
  }

  const rows = (data || []) as OrderItemRow[];

  if (!rows.length) {
    throw new Error(`Order ${orderId} has no order items.`);
  }

  return rows;
}

async function verifyOrderStates(
  supabase: SupabaseClient,
  record: (event: AgentEventInput) => Promise<void>,
  input: {
    cashOrderIds: string[];
    expected: Record<string, string>;
    handoverIds: string[];
    returnItemIds: string[];
  },
) {
  const orderIds = Object.keys(input.expected);
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, status, payment_status")
    .in("id", orderIds);

  if (ordersError) {
    throw new Error(errorToMessage(ordersError));
  }

  for (const [orderId, expectedStatus] of Object.entries(input.expected)) {
    const order = orders?.find((row) => row.id === orderId);
    const passed = order?.status === expectedStatus;
    await record({
      agentKey: "auditor",
      role: "auditor",
      scenario: "verification",
      step: "order_status",
      status: passed ? "passed" : "failed",
      message: passed ? `Order reached ${expectedStatus}.` : `Expected ${expectedStatus}, got ${order?.status || "missing"}.`,
      targetId: orderId,
      targetType: "order",
      metadata: { expectedStatus, paymentStatus: order?.payment_status },
    });
  }

  const { data: handovers, error: handoversError } = await supabase
    .from("delivery_handovers")
    .select("id, status, type, total_amount")
    .in("id", input.handoverIds);

  if (handoversError) {
    throw new Error(errorToMessage(handoversError));
  }

  for (const handoverId of input.handoverIds) {
    const handover = handovers?.find((row) => row.id === handoverId);
    await record({
      agentKey: "auditor",
      role: "auditor",
      scenario: "verification",
      step: "handover_status",
      status: handover?.status === "confirmed" ? "passed" : "failed",
      message:
        handover?.status === "confirmed"
          ? "Handover is confirmed."
          : `Expected confirmed handover, got ${handover?.status || "missing"}.`,
      targetId: handoverId,
      targetType: "handover",
      metadata: { totalAmount: handover?.total_amount, type: handover?.type },
    });
  }

  const { data: walletTransactions, error: walletError } = await supabase
    .from("wallet_transactions")
    .select("id, amount, source_id")
    .eq("source_type", "order_commission")
    .in("source_id", input.cashOrderIds);

  if (walletError) {
    throw new Error(errorToMessage(walletError));
  }

  await record({
    agentKey: "auditor",
    role: "auditor",
    scenario: "verification",
    step: "wallet_commissions",
    status: walletTransactions?.length ? "passed" : "failed",
    message: walletTransactions?.length
      ? "Commission transactions were created for delivered cash orders."
      : "No commission transactions were found for delivered cash orders.",
    metadata: {
      orderIds: input.cashOrderIds,
      totalCommission: (walletTransactions || []).reduce((sum, row) => sum + Number(row.amount || 0), 0),
      transactions: walletTransactions?.length || 0,
    },
  });

  const { data: handoverItems, error: handoverItemsError } = await supabase
    .from("delivery_handover_items")
    .select("id, order_item_id, quantity")
    .in("order_item_id", input.returnItemIds);

  if (handoverItemsError) {
    throw new Error(errorToMessage(handoverItemsError));
  }

  await record({
    agentKey: "auditor",
    role: "auditor",
    scenario: "verification",
    step: "return_goods_items",
    status: handoverItems?.length ? "passed" : "warning",
    message: handoverItems?.length
      ? "Returned goods were attached to handover item rows."
      : "No handover item rows were found for returned goods.",
    metadata: { handoverItems: handoverItems?.length || 0 },
  });
}

class AppSession {
  private cookieHeader = "";

  constructor(private readonly baseUrl: string) {}

  async login(phone: string, password: string) {
    await this.postJson("/api/auth/login", { password, phone });
  }

  async postJson(path: string, body: Record<string, unknown>) {
    const response = await this.fetch(path, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(`${path} failed with ${response.status}: ${JSON.stringify(data)}`);
    }

    return data as Record<string, unknown>;
  }

  private async fetch(path: string, options: RequestInit) {
    const headers = new Headers(options.headers || {});

    if (this.cookieHeader) {
      headers.set("cookie", this.cookieHeader);
    }

    const response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    this.captureCookies(response);

    return response;
  }

  private captureCookies(response: Response) {
    const values =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : splitSetCookie(response.headers.get("set-cookie"));
    const jar = new Map(
      this.cookieHeader
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const index = part.indexOf("=");
          return [part.slice(0, index), part.slice(index + 1)];
        }),
    );

    for (const entry of values) {
      const pair = entry.split(";")[0];
      const index = pair.indexOf("=");

      if (index > 0) {
        jar.set(pair.slice(0, index), pair.slice(index + 1));
      }
    }

    this.cookieHeader = Array.from(jar.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }
}

async function readResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function splitSetCookie(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(/,(?=\s*[^;,\s]+=)/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function errorToMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error) {
    const maybeError = error as { details?: unknown; hint?: unknown; message?: unknown };
    const parts = [maybeError.message, maybeError.details, maybeError.hint]
      .filter(Boolean)
      .map((part) => String(part));

    if (parts.length) {
      return parts.join(" ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}
