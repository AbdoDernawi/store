import {
  ShoppingExperience,
  type StorefrontProduct,
} from "@/components/storefront/ShoppingExperience";
import type {
  MarketerCatalogProduct,
  MarketerCategory,
  MarketerCity,
  MarketerCustomer,
  MarketerZone,
} from "@/lib/marketer/data";

export function MarketerProductShop({
  categories,
  cities,
  customers,
  products,
  zones,
}: {
  categories: MarketerCategory[];
  cities: MarketerCity[];
  customers: MarketerCustomer[];
  products: MarketerCatalogProduct[];
  zones: MarketerZone[];
}) {
  return (
    <ShoppingExperience
      categories={categories.map((category) => ({
        id: category.id,
        imageUrl: category.image_url,
        name: category.name_ar,
      }))}
      cities={cities.map((city) => ({ id: city.id, name: city.name_ar }))}
      mode="marketer"
      products={products.map(toStorefrontProduct)}
      recipients={customers.map((customer) => ({
        address: customer.customer_address || "",
        cityId: customer.city_id || "",
        helper: customer.last_ordered_at,
        id: customer.id,
        label: customer.customer_name,
        name: customer.customer_name,
        phone: customer.customer_phone,
        zoneId: customer.zone_id || "",
      }))}
      zones={zones.map((zone) => ({
        cityId: zone.city_id,
        deliveryFee: zone.delivery_fee,
        id: zone.id,
        name: zone.name_ar,
      }))}
    />
  );
}

function toStorefrontProduct(product: MarketerCatalogProduct): StorefrontProduct {
  return {
    availableQuantity: product.available_quantity,
    basePrice: product.marketer_price,
    categoryId: product.category_id,
    categoryName: product.category_name,
    cityQuantities: product.city_quantities,
    description: product.description_ar,
    id: product.id,
    images: product.images,
    name: product.name_ar,
    orderedQuantity: product.ordered_quantity,
    variants: product.variants.map((variant) => ({
      availableQuantity: variant.available_quantity,
      cityQuantities: variant.city_quantities,
      color: variant.color,
      extraPrice: variant.extra_price,
      id: variant.id,
      imageUrl: variant.image_url,
      size: variant.size,
      type: variant.type,
    })),
  };
}
