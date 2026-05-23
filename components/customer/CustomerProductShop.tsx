import {
  ShoppingExperience,
  type StorefrontProduct,
} from "@/components/storefront/ShoppingExperience";
import type {
  CustomerAddress,
  CustomerCatalogProduct,
  CustomerCategory,
  CustomerCity,
  CustomerZone,
} from "@/lib/customer/data";

export function CustomerProductShop({
  addresses,
  categories,
  cities,
  initialCategory = "all",
  products,
  zones,
}: {
  addresses: CustomerAddress[];
  categories: CustomerCategory[];
  cities: CustomerCity[];
  initialCategory?: string;
  products: CustomerCatalogProduct[];
  zones: CustomerZone[];
}) {
  return (
    <ShoppingExperience
      categories={categories.map((category) => ({
        id: category.id,
        imageUrl: category.image_url,
        name: category.name_ar,
      }))}
      cities={cities.map((city) => ({ id: city.id, name: city.name_ar }))}
      initialCategory={initialCategory}
      mode="customer"
      products={products.map(toStorefrontProduct)}
      recipients={addresses.map((address) => ({
        address: address.address,
        cityId: address.city_id,
        helper: address.zone_name,
        id: address.id,
        label: address.label,
        name: address.recipient_name,
        phone: address.phone,
        zoneId: address.zone_id,
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

function toStorefrontProduct(product: CustomerCatalogProduct): StorefrontProduct {
  return {
    availableQuantity: product.available_quantity,
    basePrice: product.customer_price,
    categoryId: product.category_id,
    categoryName: product.category_name,
    description: product.description_ar,
    id: product.id,
    images: product.images,
    name: product.name_ar,
    orderedQuantity: product.ordered_quantity,
    variants: product.variants.map((variant) => ({
      availableQuantity: variant.available_quantity,
      color: variant.color,
      extraPrice: variant.extra_price,
      id: variant.id,
      imageUrl: variant.image_url,
      size: variant.size,
      type: variant.type,
    })),
  };
}
