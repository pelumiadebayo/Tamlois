import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StorefrontLink } from "../components/StorefrontLink";
import {
  DEFAULT_PAYSTACK_STOREFRONT_URL,
  FEATURED_PRODUCT_STOREFRONT_URL,
  MOISTURISING_HAIR_MIST_STOREFRONT_URL,
  SCALP_CLEANSING_TREATMENT_STOREFRONT_URL,
  resolveStorefrontUrl,
} from "../config/commerce";
import { analytics } from "../lib/analytics";

describe("Paystack Storefront configuration", () => {
  beforeEach(() => sessionStorage.clear());

  it("uses the supplied Storefront as the safe default", () => {
    expect(DEFAULT_PAYSTACK_STOREFRONT_URL).toBe("https://paystack.shop/tamls");
    expect(resolveStorefrontUrl()).toBe("https://paystack.shop/tamls");
    expect(resolveStorefrontUrl(" https://paystack.shop/tamls/ ")).toBe(
      "https://paystack.shop/tamls",
    );
    expect(FEATURED_PRODUCT_STOREFRONT_URL).toBe(
      "https://paystack.shop/tamls?product=botanical-scalp-oil-hkxrdj",
    );
    expect(resolveStorefrontUrl(FEATURED_PRODUCT_STOREFRONT_URL)).toBe(
      FEATURED_PRODUCT_STOREFRONT_URL,
    );
    expect(MOISTURISING_HAIR_MIST_STOREFRONT_URL).toBe(
      "https://paystack.shop/tamls?product=moisturising-hair-mist-qfygyk",
    );
    expect(resolveStorefrontUrl(MOISTURISING_HAIR_MIST_STOREFRONT_URL)).toBe(
      MOISTURISING_HAIR_MIST_STOREFRONT_URL,
    );
    expect(SCALP_CLEANSING_TREATMENT_STOREFRONT_URL).toBe(
      "https://paystack.shop/tamls?product=scalp-cleansing-treatment-mhxror",
    );
    expect(
      resolveStorefrontUrl(SCALP_CLEANSING_TREATMENT_STOREFRONT_URL),
    ).toBe(SCALP_CLEANSING_TREATMENT_STOREFRONT_URL);
  });

  it("rejects malformed, non-HTTPS and non-Paystack Storefront URLs", () => {
    expect(resolveStorefrontUrl("not a URL")).toBeNull();
    expect(resolveStorefrontUrl("http://paystack.shop/tamls")).toBeNull();
    expect(resolveStorefrontUrl("https://example.com/tamls")).toBeNull();
  });

  it("renders one safe external action and tracks only safe context", () => {
    sessionStorage.setItem(
      "tamlois-utm",
      JSON.stringify({ utm_source: "instagram", email: "private@example.com" }),
    );
    const track = vi.spyOn(analytics, "track").mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <StorefrontLink
          label="Visit the Tamlois Storefront"
          sourcePage="shop"
          sourceSection="primary-action"
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", {
      name: /Visit the Tamlois Storefront.*new tab/i,
    });
    expect(link).toHaveAttribute("href", "https://paystack.shop/tamls");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    fireEvent.click(link);
    expect(track).toHaveBeenCalledWith("storefront_link_clicked", {
      source_page: "shop",
      source_section: "primary-action",
      utm_source: "instagram",
    });
    expect(JSON.stringify(track.mock.calls)).not.toContain("private@example.com");
    track.mockRestore();
  });

  it("replaces an invalid Storefront action with a useful contact route", () => {
    render(
      <MemoryRouter>
        <StorefrontLink
          label="Visit the Tamlois Storefront"
          sourcePage="shop"
          sourceSection="primary-action"
          storefrontUrl={null}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Storefront is temporarily unavailable",
    );
    expect(screen.getByRole("link", { name: /Contact Tamlois/ })).toHaveAttribute(
      "href",
      "/contact",
    );
  });
});
