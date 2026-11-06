export interface ChristmasThemeConfig {
  enabled: boolean;
  announcement: string;
  announcementCta: string;
  announcementHref: string;
  campaignLabel: string;
  bookingMessage: string;
  badgeText: string;
}

export function parseChristmasThemeEnabled(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === "true";
}

export const christmasTheme: ChristmasThemeConfig = {
  enabled: parseChristmasThemeEnabled(
    import.meta.env.VITE_CHRISTMAS_THEME_ENABLED,
  ),
  announcement: "A season of care!! holiday appointments are now open",
  announcementCta: "Book early",
  announcementHref: "/booking",
  campaignLabel: "Christmas at Tamlois",
  bookingMessage: "Plan your December hair & scalp care early",
  badgeText: "Holiday care",
};
