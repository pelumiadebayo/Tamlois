import { useEffect } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "../components/SEO";
import { StorefrontLink } from "../components/StorefrontLink";
import { analytics, storefrontAnalyticsProperties } from "../lib/analytics";

const storefrontBenefits = [
  "Current product details, prices and availability",
  "Delivery options managed in one official Tamlois store",
  "Secure shopping and checkout through Paystack Storefront",
];

export default function ShopPage() {
  useEffect(() => {
    analytics.track(
      "shop_page_viewed",
      storefrontAnalyticsProperties("shop", "page"),
    );
  }, []);

  return (
    <>
      <SEO
        title="Hair & Scalp Care Products"
        description="Explore the official Tamlois Storefront for available hair and scalp-care products, current prices and secure checkout."
      />
      <section className="section-space bg-[var(--cream)]">
        <div className="container-shell grid gap-12 lg:grid-cols-[.78fr_1.22fr] lg:gap-20">
          <div className="self-start">
            <ShieldCheck
              size={30}
              strokeWidth={1.6}
              className="text-[var(--forest-700)]"
              aria-hidden="true"
            />
            <h2 className="mt-6 max-w-xl font-display text-[clamp(2.3rem,5vw,4.25rem)] leading-[.98] tracking-[-.025em] text-[var(--forest-950)]">
              One official place to shop
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--ink)]">
              Care for your hair and scalp beyond the clinic. Products can support a consistent home routine alongside professional care. Tamlois keeps every retail detail in one official Storefront so you always see the current information.
            </p>
          </div>

          <div className="border-t border-[var(--line)]">
            <ul aria-label="Benefits of the official Tamlois Storefront">
              {storefrontBenefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex min-h-20 items-center gap-4 border-b border-[var(--line)] py-5 text-sm font-semibold text-[var(--forest-950)]"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--forest-100)]">
                    <Check size={16} aria-hidden="true" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
            <div className="pt-8">
              <StorefrontLink
                label="Visit the Tamlois Storefront"
                sourcePage="shop"
                sourceSection="primary-action"
              />
              <p className="mt-4 max-w-xl text-xs leading-5 text-[var(--muted)]">
                Opens the official Tamlois shop on Paystack Storefront in a new
                tab.
              </p>
              <Link
                to="/services"
                className="mt-6 inline-flex min-h-11 items-center gap-2 font-bold text-[var(--forest-800)]"
              >
                Explore professional services
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container-shell">
          <div className="max-w-3xl border-t border-[var(--line)] pt-6">
            <h2 className="font-display text-3xl text-[var(--forest-950)]">
              Products complement individual care
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Products support general hair and scalp-care routines but do not
              replace professional assessment or medical advice. If you are
              unsure what suits your needs, book an assessment before making a
              care decision.
            </p>
            <Link to="/booking" className="btn btn-secondary mt-6">
              Book an assessment
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
