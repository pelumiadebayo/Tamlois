import type { ChristmasThemeConfig } from "./christmasTheme";

export function ChristmasCampaignLabel({
  config,
}: {
  config: ChristmasThemeConfig;
}) {
  if (!config.enabled) return null;

  return (
    <p className="christmas-campaign-label">
      <img
        className="christmas-campaign-bells"
        src={`${import.meta.env.BASE_URL}seasonal/christmas-bells.webp`}
        alt=""
        width="211"
        height="160"
        aria-hidden="true"
        draggable={false}
      />
      <span>{config.campaignLabel}</span>
    </p>
  );
}
