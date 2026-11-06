import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  GitBranch,
  Leaf,
  Microscope,
  ScanSearch,
  ShieldPlus,
  ShieldCheck,
  Sprout,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  concerns,
  faqs,
  homeOfferings,
  media,
  testimonials,
} from "../data/content";
import { useServices } from "../hooks/useServices";
import { analytics } from "../lib/analytics";
import { ArrowLink, ProductCard, ServiceCard } from "../components/Cards";
import { LeadCapture } from "../components/LeadCapture";
import { SEO } from "../components/SEO";
import { contentRepository } from "../repositories/contentRepository";
import { CareLoop } from "../components/CareLoop";
import { commerceConfig } from "../config/commerce";
import { publicHomeContent } from "../repositories/homeContentRepository";
import type { HomeOffering } from "../types";
import { useProducts } from "../hooks/useProducts";
import { publicProducts } from "../commerce/products";
import {
  ChristmasAnnouncement,
  christmasTheme,
} from "../components/seasonal";

const concernIcons: Record<string, LucideIcon> = {
  "hair-shedding-and-thinning": TrendingDown,
  "dry-itchy-or-flaky-scalp": ScanSearch,
  "breakage-and-weak-hair": GitBranch,
  "slow-or-inconsistent-growth": Sprout,
  "natural-hair-maintenance": Leaf,
  "post-treatment-scalp-care": ShieldPlus,
};

function HomeConcernsSection() {
  return (
    <section
      className="concerns-showcase"
      aria-labelledby="home-concerns-title"
    >
      <div className="container-shell">
        <div className="concerns-showcase-layout">
          <header className="concerns-showcase-header">
            <p className="concerns-eyebrow">Hair &amp; scalp concerns</p>
            <h2 id="home-concerns-title" className="section-title">
              Common Hair &amp; Scalp Concerns We Support
            </h2>
          </header>

          <div className="concerns-grid">
            {concerns.map((concern) => {
              const Icon = concernIcons[concern.slug] ?? ScanSearch;
              return (
                <Link
                  key={concern.slug}
                  to={`/concerns/${concern.slug}`}
                  className="concern-card"
                  aria-labelledby={`concern-${concern.slug}-action concern-${concern.slug}-title`}
                  aria-describedby={`concern-${concern.slug}-description`}
                >
                  <span
                    id={`concern-${concern.slug}-action`}
                    className="sr-only"
                  >
                    Learn about
                  </span>
                  <span className="concern-card-top" aria-hidden="true">
                    <span className="concern-card-icon">
                      <Icon size={25} strokeWidth={1.6} />
                    </span>
                  </span>
                  <h3
                    id={`concern-${concern.slug}-title`}
                    className="concern-card-title"
                  >
                    {concern.name}
                  </h3>
                  <p
                    id={`concern-${concern.slug}-description`}
                    className="concern-card-description sr-only"
                  >
                    {concern.summary}
                  </p>
                  <span className="concern-card-arrow" aria-hidden="true">
                    <ArrowRight size={19} strokeWidth={1.7} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}

export default function Home() {
  const { services } = useServices();
  const { products, state: productState, retry: retryProducts } = useProducts();
  const [announcement, setAnnouncement] = useState("");
  const [offerings, setOfferings] = useState<HomeOffering[]>(homeOfferings);
  useEffect(() => {
    Promise.all([
      contentRepository.getAnnouncement(),
      publicHomeContent.offerings(),
    ]).then(([nextAnnouncement, nextOfferings]) => {
      setAnnouncement(nextAnnouncement);
      if (nextOfferings.length) setOfferings(nextOfferings);
    });
  }, []);
  const featured = services
    .filter((service) => service.active && service.type !== "package")
    .slice(0, 4);
  const featuredProducts = publicProducts(products, true);
  return (
    <>
      <SEO
        title="Personalised hair and scalp care"
        description="Understand your scalp and care for your natural hair with personalised, evidence-informed support from Tamlois."
        schema={{
          "@context": "https://schema.org",
          "@type": "HealthAndBeautyBusiness",
          name: "Tamlois Natural & More | Tamlois Trichology Clinic",
          description:
            "Professional trichology and natural hair clinic focused on healthy scalp, hair growth and hair-loss management through personalised, evidence-informed care.",
          openingHours: "Mo-Sa 09:00-18:00",
        }}
      />
      <ChristmasAnnouncement config={christmasTheme} />
      {announcement && (
        <div
          className="bg-[var(--color-brand-deep)] px-4 py-3 text-center text-sm font-semibold text-white"
          role="status"
        >
          {announcement}
        </div>
      )}
      <CareLoop offerings={offerings} christmasTheme={christmasTheme} />
      <HomeConcernsSection />

      <section
        className="care-paths section-space"
        aria-labelledby="care-paths-title"
      >
        <div className="container-shell">
          <div className="care-paths-heading">
            <h2 id="care-paths-title" className="section-title">
              Two kinds of care. One considered starting point.
            </h2>
            <p className="lede">
              Choose the path closest to what you need today. You can still
              change direction before reserving a time.
            </p>
          </div>
          <div className="care-paths-grid">
            <article>
              <span>Clinical path</span>
              <h3>I need help with my scalp or hair loss</h3>
              <p>
                Begin with trichology services, concern-led education or a
                consultation booking.
              </p>
              <div>
                <Link
                  to="/booking?category=trichology"
                  className="btn btn-primary"
                >
                  Book trichology care
                </Link>
              </div>
            </article>
            <article>
              <span>Salon path</span>
              <h3>I want professional natural-hair care</h3>
              <p>
                Explore scalp-conscious salon services for hydration,
                maintenance and healthy-hair support.
              </p>
              <div>
                <Link to="/booking?category=salon" className="btn btn-primary">
                  Book salon care
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        className="section-product section-space"
        aria-labelledby="featured-products-title"
      >
        <div className="container-shell">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h2 id="featured-products-title" className="section-title">
                Care continues at home
              </h2>
              <p className="lede mt-4">
                Explore three featured Tamlois hair and scalp-care products.
                Current availability and secure checkout are provided through
                Paystack Storefront.
              </p>
            </div>
            <a href={commerceConfig.storefrontUrl || "/shop"} target="_blank" rel="noopener noreferrer" className="commerce-link inline-flex min-h-11 items-center gap-2 font-bold">Shop all products <ArrowRight size={18} /></a>
          </div>
          {productState === "loading" && <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading featured products">{[1, 2, 3].map((item) => <div key={item} className="aspect-[4/5] animate-pulse rounded-[14px] bg-[var(--forest-100)]" />)}</div>}
          {productState === "error" && <div className="surface mt-8 p-6" role="alert"><p>Products could not be loaded right now.</p><button className="btn btn-secondary mt-4" onClick={() => void retryProducts()}>Retry</button></div>}
          {productState === "ready" && featuredProducts.length > 0 && <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{featuredProducts.map((product) => <ProductCard key={product.id} product={product} sourcePage="home" />)}</div>}
          {productState === "ready" && featuredProducts.length === 0 && <p className="mt-8 text-sm text-[var(--muted)]">Featured products are being prepared. Visit the official Storefront to see current availability.</p>}
        </div>
      </section>

      <section className="section-botanical section-space">
        <div className="container-shell">
          <h2 className="section-title">
            Care built around a proper first look
          </h2>
          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            {featured.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
          <div className="mt-8">
            <ArrowLink to="/services">See all services and packages</ArrowLink>
          </div>
        </div>
      </section>

      {/* <section className="section-inverse section-space">
        <div className="container-shell grid gap-9 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <h2 className="section-title">How care moves forward</h2>
            <p className="lede mt-4">
              One step at a time, with room to pause, ask questions and seek
              medical care when appropriate.
            </p>
          </div>
          <ol className="paper-lines rounded-[14px] border border-[var(--line)] bg-white p-6 md:p-8">
            {[
              "Choose a consultation or suitable service",
              "Complete your booking information",
              "Attend the hair and scalp assessment",
              "Receive an individual care recommendation",
              "Continue treatment and follow-up if needed",
            ].map((step, index) => (
              <li key={step} className="flex min-h-[76px] items-center gap-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--forest-800)] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <span className="font-semibold text-[var(--forest-950)]">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section> */}

      <section className="section-editorial section-space">
        <div className="container-shell grid items-center gap-9 lg:grid-cols-[.85fr_1.15fr]">
          <figure>
            <div className="overflow-hidden rounded-[14px]">
              <img
                src={`${import.meta.env.BASE_URL}media/owner.jpg`}
                alt="Popoola Adebola Opeyemi, Certified Trichologist and founder of Tamlois Trichology Clinic"
                width="2047"
                height="2560"
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          </figure>
          <div>
            <h2 className="section-title">Popoola Adebola Opeyemi</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--ink)]">
              Certified Trichologist, Natural Hair Advocate and Founder of
              Tamlois Trichology Clinic, passionate about healthy hair and scalp
              care.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-4">
              {[
                [Microscope, "Careful assessment"],
                [ClipboardCheck, "Clear next steps"],
                [ShieldCheck, "Safe boundaries"],
              ].map(([Icon, label]) => {
                const C = Icon as typeof Microscope;
                return (
                  <div
                    key={label as string}
                    className="min-w-0 border-t border-[var(--line)] pt-4"
                  >
                    <C size={22} className="text-[var(--forest-700)]" />
                    <p className="mt-2 text-[0.65rem] font-bold leading-4 sm:text-sm">
                      {label as string}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8">
              <ArrowLink to="/about">Meet the trichologist</ArrowLink>
            </div>
          </div>
        </div>
      </section>

      <section className="section-raised section-space">
        <div className="container-shell">
          <h2 className="section-title">
            Progress needs context, not promises
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <div className="relative overflow-hidden rounded-[14px]">
              <img
                src={media.results.src}
                alt={media.results.alt}
                width="1200"
                height="800"
                loading="lazy"
                className="aspect-[16/9] w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-[rgba(13,45,33,.88)] p-5 text-white">
                {/* <p className="font-semibold">Illustrative result layout</p>
                <p className="mt-1 text-xs text-[var(--forest-100)]">
                  Use only client-approved media with written consent. No
                  outcome is guaranteed.
                </p> */}
              </div>
            </div>
            <div className="rule-list">
              {testimonials.map((item) => (
                <figure key={item.id} className="py-6">
                  <blockquote className="testimonial-quote font-display text-2xl leading-tight text-[var(--forest-950)]">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="mt-4 text-xs font-semibold text-[var(--muted)]">
                    {item.name}
                    <br />
                    <span className="text-[var(--color-commerce-primary)]">{item.label}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-botanical section-space">
        <div className="container-shell grid gap-10 lg:grid-cols-[1fr_.9fr]">
          <div>
            <h2 className="section-title">Questions before you book</h2>
            <div className="mt-8 rule-list">
              {faqs.slice(0, 5).map(([question, answer]) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-bold text-[var(--forest-950)]">
                    {question}
                    <span className="text-xl group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
            <ArrowLink to="/faq">Read all questions</ArrowLink>
          </div>
          <LeadCapture />
        </div>
      </section>

      <section className="section-inverse section-space">
        <div className="container-shell grid items-end gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="section-title">
              Not sure where to begin?
            </h2>
            <p className="lede max-w-xl">
              Start with a consultation, or contact the clinic with a short note
              about what you have noticed.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/booking?service=svc-consult"
              className="btn bg-white text-[var(--forest-950)]"
            >
              <CalendarDays size={18} />
              Book a consultation
            </Link>
            <Link
              to="/contact"
              className="btn border border-white/50 text-white"
            >
              Contact the clinic
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
