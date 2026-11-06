import { describe, expect, it } from "vitest";
import {
  extractPaystackImage,
  mergeProductCache,
  isAuthorizedProductAdmin,
  missingPaystackProductIds,
  normalizePaystackProduct,
  parsePaystackProductUrl,
  paystackProductDocumentId,
  PaystackCommerceError,
  PaystackCommerceService,
} from "./paystackCommerce.js";
import type { Firestore } from "firebase-admin/firestore";
import { vi } from "vitest";

const source = {
  id: 41,
  product_code: "PROD_demo",
  name: "Botanical scalp oil",
  description: "A lightweight oil.",
  price: 1_250_000,
  currency: "NGN",
  quantity: 3,
  active: true,
  in_stock: true,
  slug: "botanical-scalp-oil-demo",
};

describe("Paystack commerce normalization", () => {
  it("allows only the configured authenticated owner", () => {
    expect(isAuthorizedProductAdmin(undefined, "owner")).toBe(false);
    expect(isAuthorizedProductAdmin("ordinary", "owner")).toBe(false);
    expect(isAuthorizedProductAdmin("owner", "owner")).toBe(true);
  });
  it("validates and extracts Tamlois Storefront product links", () => {
    expect(parsePaystackProductUrl("https://paystack.shop/tamls?product=botanical-scalp-oil-demo", "tamls")).toEqual({ storefrontSlug: "tamls", productSlug: "botanical-scalp-oil-demo" });
    expect(() => parsePaystackProductUrl("https://example.com/tamls?product=x", "tamls")).toThrow(PaystackCommerceError);
    expect(() => parsePaystackProductUrl("https://paystack.shop/not-tamlois?product=x", "tamls")).toThrow(/Only products/);
  });

  it("normalizes documented product fields and converts kobo to naira", () => {
    expect(normalizePaystackProduct(source, "tamls")).toMatchObject({
      paystackProductId: "41", paystackProductCode: "PROD_demo",
      sourceName: "Botanical scalp oil", sourcePrice: 12500,
      currency: "NGN", sourceQuantity: 3, sourceAvailable: true,
      paystackProductUrl: "https://paystack.shop/tamls?product=botanical-scalp-oil-demo",
    });
  });

  it("uses optional safe Paystack media and rejects insecure media", () => {
    expect(extractPaystackImage({ media: [{ url: "https://cdn.example.com/oil.webp" }] })).toBe("https://cdn.example.com/oil.webp");
    expect(extractPaystackImage({ image_url: "http://insecure.example.com/oil.jpg" })).toBeUndefined();
  });

  it("creates deterministic IDs to prevent duplicate imports", () => {
    expect(paystackProductDocumentId("41")).toBe("paystack-41");
    expect(paystackProductDocumentId("weird/id")).toBe("paystack-weird-id");
  });

  it("updates source fields while preserving Tamlois presentation overrides", () => {
    const normalized = normalizePaystackProduct(source, "tamls");
    const merged = mergeProductCache({ displayTitle: "Tamlois oil", displayImageUrl: "https://example.com/custom.webp", visible: true, featured: true, displayOrder: 7 }, { ...normalized, sourcePrice: 14000 });
    expect(merged).toMatchObject({ sourcePrice: 14000, displayTitle: "Tamlois oil", displayImageUrl: "https://example.com/custom.webp", visible: true, featured: true, displayOrder: 7, syncStatus: "synced" });
  });

  it("flags only cached products missing from the Storefront response", () => {
    expect(missingPaystackProductIds(["1", "2", "3"], ["1", "3"])).toEqual(["2"]);
  });

  it("retries transient Paystack failures and never reaches cache writes", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: false, message: "temporary", data: [] }), { status: 503, headers: { "Content-Type": "application/json" } }));
    const service = new PaystackCommerceService({} as Firestore, "sk_test_not_real", "tamls", fetcher as typeof fetch);
    await expect(service.importProduct("https://paystack.shop/tamls?product=one")).rejects.toThrow(/could not complete/);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
