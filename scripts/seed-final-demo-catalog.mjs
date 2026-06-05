import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.DEMO_BASE_URL || "https://store-teal-six.vercel.app";
const adminPhone = process.env.DEMO_ADMIN_PHONE || "+218910000002";
const adminPassword = process.env.DEMO_ADMIN_PASSWORD;

if (!adminPassword) {
  throw new Error("Set DEMO_ADMIN_PASSWORD before running this seed script.");
}

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [
        line.slice(0, index).trim(),
        line.slice(index + 1).trim().replace(/^"|"$/g, ""),
      ];
    }),
);

const catalog = [
  {
    kind: "fashion",
    name_ar: "DEMO أزياء لطيفة",
    name_en: "DEMO Soft Fashion",
    sort_order: 110,
    theme: "clay",
    products: [
      ["DEMO بلوزة قطن هادئة", "بلوزة ناعمة للاستخدام اليومي بألوان مريحة.", 68, "كريمي", "M", "قطن"],
      ["DEMO تيشيرت يومي ناعم", "تيشيرت عملي وخفيف بتفاصيل بسيطة.", 42, "أبيض", "L", "قطن"],
      ["DEMO بنطال واسع مريح", "بنطال واسع مناسب للحركة اليومية.", 89, "رمادي", "M", "واسع"],
      ["DEMO جاكيت خفيف", "جاكيت لطيف للطلعات السريعة والجو المعتدل.", 135, "زيتوني", "L", "خفيف"],
      ["DEMO فستان صباحي", "فستان هادئ بتصميم بسيط ومريح.", 118, "وردي", "M", "ناعم"],
      ["DEMO وشاح حريري", "وشاح خفيف يكمل الإطلالة بلطف.", 36, "عسلي", "واحد", "حرير"],
    ],
  },
  {
    kind: "bag",
    name_ar: "DEMO حقائب وإكسسوارات",
    name_en: "DEMO Bags and Accessories",
    sort_order: 120,
    theme: "linen",
    products: [
      ["DEMO حقيبة كتف كريمية", "حقيبة كتف خفيفة بحجم مناسب لليوم كله.", 74, "كريمي", "متوسط", "كتف"],
      ["DEMO محفظة صغيرة", "محفظة عملية بلمسة ناعمة.", 31, "بني", "صغير", "جلد"],
      ["DEMO نظارة شمس ناعمة", "نظارة شمس بتصميم هادئ وسهل التنسيق.", 55, "عسلي", "واحد", "حماية"],
      ["DEMO حزام كلاسيك", "حزام بسيط للتنسيق اليومي.", 39, "أسود", "واحد", "كلاسيك"],
      ["DEMO حقيبة سفر خفيفة", "حقيبة خفيفة للمشاوير القصيرة.", 145, "رمادي", "كبير", "سفر"],
      ["DEMO طقم دبابيس لطيف", "إكسسوار صغير لإضافة لمسة جميلة.", 24, "ذهبي", "مجموعة", "دبابيس"],
    ],
  },
  {
    kind: "beauty",
    name_ar: "DEMO عناية وجمال",
    name_en: "DEMO Care and Beauty",
    sort_order: 130,
    theme: "rose",
    products: [
      ["DEMO مرطب يدين", "مرطب يومي بحجم مناسب للحقيبة.", 28, "وردي", "75ml", "كريم"],
      ["DEMO سيروم نضارة", "سيروم خفيف ضمن تجربة العناية اليومية.", 96, "شفاف", "30ml", "سيروم"],
      ["DEMO عطر وردي", "عطر ناعم ومناسب للهدايا.", 128, "وردي", "50ml", "عطر"],
      ["DEMO فرشاة شعر لطيفة", "فرشاة عملية بتصميم مريح.", 34, "خشبي", "واحد", "فرشاة"],
      ["DEMO مجموعة سفر عناية", "مجموعة صغيرة للرحلات والدوام.", 79, "نعناعي", "مجموعة", "سفر"],
      ["DEMO شمعة معطرة", "شمعة هادئة تمنح المكان دفئا.", 48, "فانيلا", "صغير", "شمعة"],
    ],
  },
  {
    kind: "gadget",
    name_ar: "DEMO أجهزة يومية",
    name_en: "DEMO Daily Tech",
    sort_order: 140,
    theme: "sky",
    products: [
      ["DEMO سماعات صغيرة", "سماعات بتصميم بسيط وصوت واضح.", 115, "أبيض", "واحد", "لاسلكي"],
      ["DEMO شاحن سريع", "شاحن صغير للاستخدام اليومي.", 46, "أبيض", "20W", "USB-C"],
      ["DEMO ساعة ذكية لطيفة", "ساعة خفيفة لمتابعة اليوم.", 165, "بيج", "واحد", "ذكية"],
      ["DEMO مصباح مكتب USB", "مصباح لطيف للقراءة والمكتب.", 64, "أبيض", "واحد", "USB"],
      ["DEMO حامل هاتف", "حامل عملي للمكتب والتصوير.", 33, "أسود", "واحد", "قابل للطي"],
      ["DEMO لوحة مفاتيح صغيرة", "لوحة صغيرة بتصميم هادئ.", 88, "كريمي", "صغير", "بلوتوث"],
    ],
  },
  {
    kind: "home",
    name_ar: "DEMO منزل دافئ",
    name_en: "DEMO Cozy Home",
    sort_order: 150,
    theme: "mint",
    products: [
      ["DEMO كوب سيراميك", "كوب لطيف للقهوة والشاي.", 32, "أخضر", "350ml", "سيراميك"],
      ["DEMO بطانية خفيفة", "بطانية ناعمة للبيت والمكتب.", 92, "رملي", "متوسط", "قطن"],
      ["DEMO وسادة زخرفية", "وسادة صغيرة تضيف دفئا للمكان.", 45, "زيتوني", "40cm", "ديكور"],
      ["DEMO منظم طاولة", "منظم بسيط للأدوات اليومية.", 58, "خشبي", "متوسط", "مكتب"],
      ["DEMO نبات مكتبي", "نبات صغير يعطي المكان حياة.", 37, "أخضر", "صغير", "ديكور"],
      ["DEMO صندوق تخزين", "صندوق مرتب للأغراض الصغيرة.", 52, "رمادي", "متوسط", "تخزين"],
    ],
  },
  {
    kind: "gift",
    name_ar: "DEMO هدايا موسمية",
    name_en: "DEMO Seasonal Gifts",
    sort_order: 160,
    theme: "lavender",
    products: [
      ["DEMO صندوق هدية", "صندوق هدية جاهز بتفاصيل أنيقة.", 69, "بنفسجي", "متوسط", "هدية"],
      ["DEMO دفتر ملاحظات", "دفتر يومي بتصميم لطيف.", 27, "كريمي", "A5", "دفتر"],
      ["DEMO قلم فاخر", "قلم بسيط كهدية عملية.", 38, "ذهبي", "واحد", "قلم"],
      ["DEMO باقة عناية صغيرة", "هدية عناية خفيفة ومناسبة.", 84, "وردي", "مجموعة", "عناية"],
      ["DEMO كرت تهنئة", "كرت صغير يكمل الهدية.", 12, "أبيض", "واحد", "كرت"],
      ["DEMO علبة شوكولاتة", "علبة لطيفة للمناسبات السريعة.", 57, "بني", "صغير", "شوكولاتة"],
    ],
  },
];

const requestedProductNames = catalog.flatMap((category) => category.products.map((product) => product[0]));
const requestedCategoryNames = catalog.map((category) => category.name_ar);
const corruptLikeBrokenPowerShell = (value) => value.replace(/[^\x00-\x7F]/g, "?");

const authClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
  email: phoneAliasEmail(adminPhone),
  password: adminPassword,
});

if (authError || !authData.session) {
  throw authError || new Error("Could not sign in to Supabase.");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } },
});

let cookieHeader = "";

await appFetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: adminPhone, password: adminPassword }),
}).then(async (response) => {
  if (!response.ok) {
    throw new Error(`App login failed: ${response.status} ${JSON.stringify(await jsonOrText(response))}`);
  }
});

const summary = {
  categoriesCreated: 0,
  categoriesCorrected: 0,
  productsCreated: 0,
  productsCorrected: 0,
  productsRefreshed: 0,
  variantsCreated: 0,
  variantsUpdated: 0,
  inventoryAdjusted: 0,
};

const categoryMap = await ensureCategories();
const productMap = await ensureProducts(categoryMap);
await ensureInventory(productMap);

const finalRows = await selectDemoRows();
const categoryCounts = new Map(requestedCategoryNames.map((name) => [name, 0]));

for (const product of finalRows.products) {
  const category = finalRows.categories.find((item) => item.id === product.category_id);
  if (categoryCounts.has(category?.name_ar)) {
    categoryCounts.set(category.name_ar, (categoryCounts.get(category.name_ar) || 0) + 1);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      summary,
      categories: Array.from(categoryCounts.entries()).map(([name, count]) => ({ name, products: count })),
      productsRequested: requestedProductNames.length,
      productsPresent: finalRows.products.filter((product) => requestedProductNames.includes(product.name_ar)).length,
      productsWithStock: finalRows.products.filter((product) => totalProductStock(product) > 0).length,
      productsWithImages: finalRows.products.filter((product) => productHasImage(product)).length,
    },
    null,
    2,
  ),
);

async function ensureCategories() {
  const rows = await selectDemoRows();
  const used = new Set();
  const map = new Map();

  for (const category of catalog) {
    let row = rows.categories.find((item) => item.name_ar === category.name_ar);

    if (!row) {
      row = rows.categories.find(
        (item) =>
          item.name_ar === corruptLikeBrokenPowerShell(category.name_ar) &&
          item.name_ar.includes("?") &&
          !used.has(item.id),
      );
    }

    if (row) {
      used.add(row.id);
      if (row.name_ar !== category.name_ar || !row.image_url || row.sort_order !== category.sort_order) {
        const image = row.image_url ? null : await uploadImage(`category-${category.sort_order}`, category.name_ar, category.theme, category.kind);
        await patchJson(`/api/admin/categories/${row.id}`, {
          image_url: image?.thumb || row.image_url || null,
          is_active: true,
          name_ar: category.name_ar,
          name_en: category.name_en,
          sort_order: category.sort_order,
        });
        summary.categoriesCorrected += 1;
      }
      map.set(category.name_ar, row.id);
      continue;
    }

    const image = await uploadImage(`category-${category.sort_order}`, category.name_ar, category.theme, category.kind);
    const created = await postJson("/api/admin/categories", {
      image_url: image.thumb || image.medium || image.large,
      name_ar: category.name_ar,
      name_en: category.name_en,
      sort_order: category.sort_order,
    });
    summary.categoriesCreated += 1;
    map.set(category.name_ar, created.categoryId);
  }

  return map;
}

async function ensureProducts(categoryMap) {
  let rows = await selectDemoRows();
  const usedCorruptRows = new Set();
  const map = new Map();

  for (const category of catalog) {
    let position = 0;

    for (const product of category.products) {
      position += 1;
      const [nameAr, descriptionAr, customerPrice, color, size, type] = product;
      const categoryId = categoryMap.get(category.name_ar);
      const prices = productPrices(customerPrice);
      let row = rows.products.find((item) => item.name_ar === nameAr);
      let image = null;

      if (!row) {
        row = rows.products.find(
          (item) =>
            item.name_ar === corruptLikeBrokenPowerShell(nameAr) &&
            item.name_ar.includes("?") &&
            !usedCorruptRows.has(item.id),
        );
      }

      if (row) {
        usedCorruptRows.add(row.id);
        const needsImage = !productHasImage(row) || row.name_ar.includes("?");

        if (needsImage) {
          image = await uploadImage(`product-${category.sort_order}-${position}`, nameAr, category.theme, category.kind);
        }

        await updateProduct(row.id, {
          category_id: categoryId,
          description_ar: descriptionAr,
          description_en: descriptionAr,
          images: image ? [{ thumb: image.thumb, medium: image.medium, large: image.large }] : row.images || [],
          is_active: true,
          low_stock_threshold: 5,
          name_ar: nameAr,
          name_en: nameAr.replace(/^DEMO\s*/, "DEMO "),
          ...prices,
        });

        const variant = row.product_variants?.[0] || null;
        if (variant) {
          await updateVariant(variant.id, {
            color,
            extra_price: 0,
            image_url: image?.large || variant.image_url || null,
            is_active: true,
            size,
            type,
          });
          summary.variantsUpdated += 1;
        } else {
          await createVariant(row.id, { color, image_url: image?.large || null, size, type });
          summary.variantsCreated += 1;
        }

        if (row.name_ar.includes("?")) {
          summary.productsCorrected += 1;
        } else {
          summary.productsRefreshed += 1;
        }

        map.set(nameAr, row.id);
        continue;
      }

      image = await uploadImage(`product-${category.sort_order}-${position}`, nameAr, category.theme, category.kind);
      const created = await postJson("/api/admin/products", {
        category_id: categoryId,
        cost_price: prices.cost_price,
        customer_price: prices.customer_price,
        description_ar: descriptionAr,
        description_en: descriptionAr,
        images: [{ thumb: image.thumb, medium: image.medium, large: image.large }],
        low_stock_threshold: 5,
        marketer_commission: prices.marketer_commission,
        marketer_price: prices.marketer_price,
        name_ar: nameAr,
        name_en: nameAr.replace(/^DEMO\s*/, "DEMO "),
        variants: [{ color, extra_price: 0, image_url: image.large, size, type }],
      });
      summary.productsCreated += 1;
      map.set(nameAr, created.product_id);
    }

    rows = await selectDemoRows();
  }

  return map;
}

async function ensureInventory(productMap) {
  const productIds = Array.from(productMap.values());
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name_ar, product_variants(id, warehouse_inventory(quantity_available, quantity_reserved))")
    .in("id", productIds);

  if (productsError) {
    throw productsError;
  }

  const { data: warehouses, error: warehousesError } = await supabase
    .from("warehouses")
    .select("id, name")
    .eq("is_active", true)
    .order("name")
    .limit(1);

  if (warehousesError) {
    throw warehousesError;
  }

  const warehouse = warehouses?.[0];

  if (!warehouse) {
    throw new Error("No active warehouse was found.");
  }

  const items = [];

  for (const [index, product] of (products || []).entries()) {
    const variant = product.product_variants?.[0];

    if (!variant) {
      continue;
    }

    const available = (variant.warehouse_inventory || []).reduce(
      (sum, row) => sum + Number(row.quantity_available || 0),
      0,
    );

    if (available < 18) {
      items.push({ delta: 24 + (index % 6) * 4, product_variant_id: variant.id });
    }
  }

  if (!items.length) {
    return;
  }

  await postJson("/api/admin/warehouses/adjust-batch", {
    items,
    note: "DEMO final showcase catalog stock",
    warehouse_id: warehouse.id,
  });
  summary.inventoryAdjusted = items.length;
}

async function selectDemoRows() {
  const [{ data: categories, error: categoriesError }, { data: products, error: productsError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name_ar, name_en, image_url, sort_order, is_active")
        .ilike("name_ar", "DEMO%")
        .limit(500),
      supabase
        .from("products")
        .select(
          "id, category_id, name_ar, name_en, description_ar, images, is_active, created_at, product_variants(id, color, size, type, image_url, warehouse_inventory(quantity_available, quantity_reserved))",
        )
        .ilike("name_ar", "DEMO%")
        .order("created_at", { ascending: true })
        .limit(1000),
    ]);

  if (categoriesError) {
    throw categoriesError;
  }

  if (productsError) {
    throw productsError;
  }

  return { categories: categories || [], products: products || [] };
}

async function updateProduct(id, patch) {
  const { error } = await supabase.from("products").update(patch).eq("id", id);

  if (error) {
    throw error;
  }
}

async function updateVariant(id, patch) {
  const { error } = await supabase.from("product_variants").update(patch).eq("id", id);

  if (error) {
    throw error;
  }
}

async function createVariant(productId, values) {
  const { error } = await supabase.from("product_variants").insert({
    color: values.color,
    extra_price: 0,
    image_url: values.image_url,
    product_id: productId,
    size: values.size,
    type: values.type,
  });

  if (error) {
    throw error;
  }
}

function productPrices(customerPrice) {
  const customer = Number(customerPrice);
  const marketer = Math.max(1, customer - Math.max(5, Math.round(customer * 0.12)));

  return {
    cost_price: Math.round(customer * 0.55),
    customer_price: customer,
    marketer_commission: Math.max(3, customer - marketer),
    marketer_price: marketer,
  };
}

function productHasImage(product) {
  return Boolean(
    (Array.isArray(product.images) && product.images.some((image) => image?.large || image?.medium || image?.thumb)) ||
      product.product_variants?.some((variant) => variant.image_url),
  );
}

function totalProductStock(product) {
  return (product.product_variants || [])
    .flatMap((variant) => variant.warehouse_inventory || [])
    .reduce((sum, row) => sum + Number(row.quantity_available || 0), 0);
}

function phoneAliasEmail(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `${digits}@phone-login.local` : "";
}

async function uploadImage(key, title, theme, kind) {
  const svg = productSvg(title, theme, kind);
  const body = new FormData();
  body.set("image", new Blob([svg], { type: "image/svg+xml" }), `${key}.svg`);
  const response = await appFetch("/api/images/process", { body, method: "POST" });
  const data = await jsonOrText(response);

  if (!response.ok) {
    throw new Error(`Image upload failed for ${key}: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

function productSvg(title, theme, kind) {
  const palettes = {
    clay: ["#fbf4ea", "#ead4c3", "#9b6f50", "#f9efe4"],
    lavender: ["#f6f1fb", "#ded6ec", "#786a93", "#fffafd"],
    linen: ["#f8f2e9", "#e7dccb", "#8b735b", "#fffaf3"],
    mint: ["#eef8f2", "#d9ede4", "#60917f", "#f7fffb"],
    rose: ["#fff1ef", "#efd3d2", "#b87872", "#fff8f7"],
    sky: ["#eef7fb", "#d6e6ee", "#5d8195", "#fbfdff"],
  }[theme] || ["#f7f1ea", "#e5d9cb", "#8b6548", "#fffaf3"];
  const [bg1, bg2, accent, panel] = palettes;
  const shape = {
    bag: `<path d="M370 585 C405 400 795 400 830 585" fill="none" stroke="${accent}" stroke-width="58" stroke-linecap="round"/><path d="M320 570 L880 570 L820 1100 Q600 1165 380 1100 Z" fill="${accent}"/><path d="M405 675 Q600 740 795 675 L765 1015 Q600 1070 435 1015 Z" fill="${panel}" opacity="0.22"/><circle cx="480" cy="650" r="22" fill="${panel}"/><circle cx="720" cy="650" r="22" fill="${panel}"/>`,
    beauty: `<rect x="510" y="360" width="180" height="120" rx="32" fill="${accent}"/><rect x="440" y="480" width="320" height="92" rx="38" fill="${panel}" opacity="0.82"/><rect x="360" y="560" width="480" height="555" rx="125" fill="${panel}"/><circle cx="600" cy="780" r="105" fill="${accent}" opacity="0.28"/><path d="M455 965 Q600 1025 745 965" fill="none" stroke="${accent}" stroke-width="30" stroke-linecap="round"/>`,
    fashion: `<path d="M440 410 Q600 520 760 410 L850 585 L745 650 L725 1085 Q600 1165 475 1085 L455 650 L350 585 Z" fill="${accent}"/><path d="M500 465 Q600 535 700 465" fill="none" stroke="${panel}" stroke-width="34" stroke-linecap="round" opacity="0.72"/><path d="M490 750 H710" stroke="${panel}" stroke-width="28" stroke-linecap="round" opacity="0.38"/>`,
    gadget: `<rect x="360" y="505" width="480" height="560" rx="120" fill="${panel}"/><rect x="425" y="595" width="350" height="280" rx="70" fill="${accent}" opacity="0.25"/><circle cx="515" cy="710" r="55" fill="${accent}"/><circle cx="685" cy="710" r="55" fill="${accent}"/><rect x="520" y="915" width="160" height="22" rx="11" fill="${accent}" opacity="0.45"/>`,
    gift: `<rect x="345" y="620" width="510" height="480" rx="70" fill="${accent}"/><rect x="570" y="620" width="70" height="480" fill="${panel}" opacity="0.8"/><rect x="345" y="770" width="510" height="75" fill="${panel}" opacity="0.8"/><path d="M590 620 C470 555 500 455 600 520 C700 455 730 555 610 620" fill="none" stroke="${accent}" stroke-width="44" stroke-linecap="round"/>`,
    home: `<path d="M310 700 L600 460 L890 700 V1090 H310 Z" fill="${accent}"/><rect x="430" y="785" width="340" height="305" rx="42" fill="${panel}" opacity="0.82"/><path d="M260 720 L600 420 L940 720" fill="none" stroke="${panel}" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/><circle cx="600" cy="930" r="45" fill="${accent}" opacity="0.55"/>`,
  }[kind];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
      <filter id="shadow" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="40" stdDeviation="38" flood-color="#3d3026" flood-opacity="0.18"/></filter>
    </defs>
    <rect width="1200" height="1500" fill="url(#bg)"/>
    <circle cx="980" cy="260" r="260" fill="#fff" opacity="0.35"/>
    <circle cx="175" cy="1200" r="300" fill="#fff" opacity="0.24"/>
    <rect x="165" y="205" width="870" height="1040" rx="115" fill="#fff" opacity="0.36"/>
    <g filter="url(#shadow)">${shape}</g>
    <text x="600" y="1348" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="800" fill="${accent}" opacity="0.72">${escapeSvg(title.slice(0, 30))}</text>
  </svg>`;
}

function escapeSvg(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;",
  })[char]);
}

async function postJson(path, body) {
  const response = await appFetch(path, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const data = await jsonOrText(response);

  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function patchJson(path, body) {
  const response = await appFetch(path, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const data = await jsonOrText(response);

  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function appFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  captureCookies(response);

  return response;
}

async function jsonOrText(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function captureCookies(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : splitSetCookie(response.headers.get("set-cookie"));
  const jar = new Map(
    cookieHeader
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

  cookieHeader = Array.from(jar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function splitSetCookie(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/,(?=\s*[^;,\s]+=)/g)
    .map((item) => item.trim())
    .filter(Boolean);
}
