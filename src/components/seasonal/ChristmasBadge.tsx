import type { ChristmasThemeConfig } from "./christmasTheme";

export function ChristmasBadge({
  config,
}: {
  config: ChristmasThemeConfig;
}) {
  if (!config.enabled) return null;

  return <span className="christmas-badge">{config.badgeText}</span>;
}
