import { describe, expect, it } from "vitest";
import { formatProductPrice, isSafeProductImageUrl, parsePaystackProductUrl, productImage, publicProducts } from "../commerce/products";
import type { TamloisProduct } from "../types";
import { MockCommerceProvider, PaystackCommerceProvider } from "../commerce/provider";

const product = (overrides: Partial<TamloisProduct> = {}): TamloisProduct => ({
  id: "one", paystackProductId: "1", paystackProductCode: "PROD_1", paystackStorefrontSlug: "tamls",
  paystackProductUrl: "https://paystack.shop/tamls?product=one", sourceName: "One", sourceDescription: "One product",
  sourcePrice: 1000, currency: "NGN", sourceAvailable: true, imageAlt: "One", category: "Care", featured: true,
  visible: true, displayOrder: 1, syncStatus: "synced", createdAt: "2026-09-01", updatedAt: "2026-09-01", ...overrides,
});

describe("commerce product helpers", () => {
  it("validates supported Paystack URLs", () => {
    expect(parsePaystackProductUrl("https://paystack.shop/tamls?product=one")).toMatchObject({ storefrontSlug: "tamls", productSlug: "one" });
    expect(parsePaystackProductUrl("https://paystack.com/buy/one")).toBeNull();
  });
  it("filters visibility and featured state then orders products", () => {
    const result = publicProducts([product({ id: "later", displayOrder: 3 }), product({ id: "hidden", visible: false }), product({ id: "first", displayOrder: 0 })], true);
    expect(result.map((item) => item.id)).toEqual(["first", "later"]);
  });
  it("chooses override, Paystack and fallback images in order", () => {
    expect(productImage(product({ displayImageUrl: "https://example.com/override.webp", sourceImageUrl: "https://example.com/source.webp" }))).toContain("override");
    expect(productImage(product({ sourceImageUrl: "https://example.com/source.webp" }))).toContain("source");
    expect(productImage(product())).toBe("/media/product-fallback.svg");
  });
  it("accepts only empty or HTTPS image overrides", () => {
    expect(isSafeProductImageUrl("")).toBe(true);
    expect(isSafeProductImageUrl("https://example.com/image.webp")).toBe(true);
    expect(isSafeProductImageUrl("http://example.com/image.jpg")).toBe(false);
  });
  it("formats naira without treating values as kobo", () => {
    expect(formatProductPrice(12500)).toMatch(/12,500/);
  });
  it("exposes interchangeable demo and Paystack providers", () => {
    expect(new MockCommerceProvider().isDemo).toBe(true);
    expect(new PaystackCommerceProvider().isDemo).toBe(false);
  });
});
