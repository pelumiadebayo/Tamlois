export type AnalyticsEvent = 'hero_booking_click' | 'service_viewed' | 'concern_viewed' | 'booking_started' | 'date_selected' | 'booking_submitted' | 'product_clicked' | 'guide_requested' | 'whatsapp_clicked' | 'phone_clicked';

export interface AnalyticsProvider { track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>): void; }

class ConsoleAnalyticsProvider implements AnalyticsProvider {
  track(event: AnalyticsEvent, properties = {}) { if (import.meta.env.DEV) console.info('[analytics]', event, properties); }
}

export const analytics: AnalyticsProvider = new ConsoleAnalyticsProvider();

export function captureUtm(search = window.location.search) {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
    const value = params.get(key);
    if (value) result[key] = value;
  });
  if (Object.keys(result).length) sessionStorage.setItem('tamlois-utm', JSON.stringify(result));
  return result;
}
