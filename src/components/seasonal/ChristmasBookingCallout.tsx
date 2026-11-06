import { CalendarDays } from "lucide-react";
import type { ChristmasThemeConfig } from "./christmasTheme";

export function ChristmasBookingCallout({
  config,
}: {
  config: ChristmasThemeConfig;
}) {
  if (!config.enabled) return null;

  return (
    <div className="christmas-booking-callout">
      <span className="christmas-booking-icon" aria-hidden="true">
        <CalendarDays size={24} strokeWidth={1.8} />
      </span>
      <span>{config.bookingMessage}</span>
    </div>
  );
}
