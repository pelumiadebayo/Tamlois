import type { ChristmasThemeConfig } from "./christmasTheme";

export function ChristmasHeroDecor({
  config,
}: {
  config: ChristmasThemeConfig;
}) {
  if (!config.enabled) return null;

  const assetRoot = `${import.meta.env.BASE_URL}seasonal/`;

  return (
    <div className="christmas-hero-decor" aria-hidden="true">
      <img
        className="christmas-botanical christmas-botanical-top"
        src={`${assetRoot}christmas-botanical-top.webp`}
        alt=""
        width="720"
        height="658"
        draggable={false}
      />
      <img
        className="christmas-botanical christmas-botanical-bottom"
        src={`${assetRoot}christmas-botanical-bottom.webp`}
        alt=""
        width="900"
        height="450"
        loading="lazy"
        draggable={false}
      />
    </div>
  );
}

export function ChristmasHeroDivider({
  config,
}: {
  config: ChristmasThemeConfig;
}) {
  if (!config.enabled) return null;

  return (
    <span className="christmas-hero-divider" aria-hidden="true">
      <span />
    </span>
  );
}
