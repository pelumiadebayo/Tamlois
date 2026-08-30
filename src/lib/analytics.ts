export type AnalyticsEvent =
  | "hero_booking_click"
  | "service_viewed"
  | "concern_viewed"
  | "booking_started"
  | "date_selected"
  | "booking_submitted"
  | "guide_requested"
  | "whatsapp_clicked"
  | "phone_clicked"
  | "home_loop_viewed"
  | "home_loop_auto_advanced"
  | "home_loop_manually_selected"
  | "home_loop_paused"
  | "home_trichology_cta_clicked"
  | "home_salon_cta_clicked"
  | "home_products_cta_clicked"
  | "home_gallery_cta_clicked"
  | "storefront_link_clicked"
  | "shop_page_viewed"
  | "homepage_storefront_clicked"
  | "navigation_storefront_clicked";

export type StorefrontAnalyticsEvent =
  | "homepage_storefront_clicked"
  | "navigation_storefront_clicked";

export interface AnalyticsProvider {
  track(
    event: AnalyticsEvent,
    properties?: Record<string, string | number | boolean>,
  ): void;
}

class ConsoleAnalyticsProvider implements AnalyticsProvider {
  track(event: AnalyticsEvent, properties = {}) {
    if (import.meta.env.DEV) console.info("[analytics]", event, properties);
  }
}

export const analytics: AnalyticsProvider = new ConsoleAnalyticsProvider();

export function storefrontAnalyticsProperties(
  sourcePage: string,
  sourceSection: string,
) {
  let utm: Record<string, string> = {};
  try {
    const stored = JSON.parse(sessionStorage.getItem("tamlois-utm") || "{}") as Record<
      string,
      unknown
    >;
    utm = Object.fromEntries(
      Object.entries(stored).filter(
        ([key, value]) => key.startsWith("utm_") && typeof value === "string",
      ),
    ) as Record<string, string>;
  } catch {
    // Analytics context is optional and must never block storefront navigation.
  }
  return { source_page: sourcePage, source_section: sourceSection, ...utm };
}

export function captureUtm(search = window.location.search) {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ].forEach((key) => {
    const value = params.get(key);
    if (value) result[key] = value;
  });
  if (Object.keys(result).length)
    sessionStorage.setItem("tamlois-utm", JSON.stringify(result));
  return result;
}
