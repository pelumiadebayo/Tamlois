export const DEFAULT_PAYSTACK_STOREFRONT_URL = "https://paystack.shop/tamls";
export const FEATURED_PRODUCT_STOREFRONT_URL =
  "https://paystack.shop/tamls?product=botanical-scalp-oil-hkxrdj";

const PAYSTACK_STOREFRONT_HOST = "paystack.shop";

export function resolveStorefrontUrl(value?: string): string | null {
  const candidate = value === undefined ? DEFAULT_PAYSTACK_STOREFRONT_URL : value.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.hostname !== PAYSTACK_STOREFRONT_HOST)
      return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export const commerceConfig = {
  provider: "paystack-storefront",
  storefrontUrl: resolveStorefrontUrl(
    import.meta.env.VITE_PAYSTACK_STOREFRONT_URL,
  ),
} as const;
