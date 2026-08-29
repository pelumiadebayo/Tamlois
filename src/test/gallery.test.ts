import { describe, expect, it } from "vitest";
import { staticGalleryItems, validateStaticGallery } from "../data/gallery";

describe("static gallery configuration", () => {
  it("uses optimized WebP source sets with intrinsic dimensions", () => {
    for (const item of staticGalleryItems) {
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
      expect(item.sources.length).toBeGreaterThanOrEqual(2);
      expect(item.sources.every((source) => source.src.endsWith(".webp"))).toBe(true);
    }
  });

  it("rejects a client-result label without written consent", () => {
    expect(() => validateStaticGallery([{ ...staticGalleryItems[0], isClientResult: true }]))
      .toThrow(/written consent/);
  });

  it("distinguishes Tamlois media from licensed placeholders", () => {
    expect(staticGalleryItems.some((item) => item.provenance === "tamlois")).toBe(true);
    expect(staticGalleryItems.some((item) => item.provenance === "licensed-placeholder")).toBe(true);
  });
});
