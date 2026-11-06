import type { TamloisProduct } from "../types";

export const PRODUCT_FALLBACK_IMAGE = "/media/product-fallback.svg";
export const PAYSTACK_STOREFRONT_HOST = "paystack.shop";

export function parsePaystackProductUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.hostname !== PAYSTACK_STOREFRONT_HOST)
      return null;
    const storefrontSlug = url.pathname.split("/").filter(Boolean)[0] ?? "";
    const productSlug = url.searchParams.get("product")?.trim() ?? "";
    if (!storefrontSlug || !productSlug) return null;
    return { storefrontSlug, productSlug, url: url.toString() };
  } catch {
    return null;
  }
}

export const productTitle = (product: TamloisProduct) =>
  product.displayTitle?.trim() || product.sourceName;
export const productSummary = (product: TamloisProduct) =>
  product.displaySummary?.trim() || product.sourceDescription;
export const productImage = (product: TamloisProduct) =>
  product.displayImageUrl?.trim() ||
  product.sourceImageUrl?.trim() ||
  PRODUCT_FALLBACK_IMAGE;

export function isSafeProductImageUrl(value: string) {
  if (!value.trim()) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export function publicProducts(
  products: TamloisProduct[],
  featuredOnly = false,
) {
  return products
    .filter((product) => product.visible && (!featuredOnly || product.featured))
    .sort(
      (a, b) =>
        a.displayOrder - b.displayOrder ||
        productTitle(a).localeCompare(productTitle(b)),
    );
}

export function formatProductPrice(price: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}
