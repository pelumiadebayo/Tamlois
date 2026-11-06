import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { analytics } from "../../lib/analytics";
import type { ChristmasThemeConfig } from "./christmasTheme";

export function ChristmasAnnouncement({
  config,
}: {
  config: ChristmasThemeConfig;
}) {
  if (!config.enabled) return null;

  return (
    <aside
      className="christmas-announcement"
      aria-label="Christmas booking announcement"
    >
      <span className="christmas-announcement-flourish" aria-hidden="true">
        <img
          src={`${import.meta.env.BASE_URL}seasonal/christmas-bells.webp`}
          alt=""
          width="211"
          height="160"
          draggable={false}
        />
      </span>
      <p>{config.announcement}</p>
      <Link
        to={config.announcementHref}
        className="christmas-announcement-link"
        onClick={() =>
          analytics.track("christmas_announcement_booking_clicked")
        }
      >
        {config.announcementCta}
      </Link>
      <span className="christmas-announcement-flourish" aria-hidden="true">
        <img
          src={`${import.meta.env.BASE_URL}seasonal/christmas-bells.webp`}
          alt=""
          width="211"
          height="160"
          draggable={false}
        />
      </span>
    </aside>
  );
}
