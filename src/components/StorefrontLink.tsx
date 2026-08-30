import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { commerceConfig } from "../config/commerce";
import {
  analytics,
  storefrontAnalyticsProperties,
  type StorefrontAnalyticsEvent,
} from "../lib/analytics";

type StorefrontLinkProps = {
  label: string;
  sourcePage: string;
  sourceSection: string;
  className?: string;
  sourceEvent?: StorefrontAnalyticsEvent;
  storefrontUrl?: string | null;
};

export function StorefrontLink({
  label,
  sourcePage,
  sourceSection,
  className = "btn btn-primary",
  sourceEvent,
  storefrontUrl = commerceConfig.storefrontUrl,
}: StorefrontLinkProps) {
  if (!storefrontUrl)
    return (
      <div className="max-w-lg" role="status">
        <p className="text-sm font-semibold text-[var(--forest-950)]">
          The Tamlois Storefront is temporarily unavailable.
        </p>
        <Link
          className="mt-2 inline-flex min-h-11 items-center font-bold text-[var(--forest-800)] underline decoration-2 underline-offset-4"
          to="/contact"
        >
          Contact Tamlois for help
        </Link>
      </div>
    );

  const trackClick = () => {
    const properties = storefrontAnalyticsProperties(sourcePage, sourceSection);
    analytics.track("storefront_link_clicked", properties);
    if (sourceEvent) analytics.track(sourceEvent, properties);
  };

  return (
    <a
      href={storefrontUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`${label} — opens the official Paystack Storefront in a new tab`}
      onClick={trackClick}
    >
      {label}
      <ExternalLink size={17} aria-hidden="true" />
    </a>
  );
}
