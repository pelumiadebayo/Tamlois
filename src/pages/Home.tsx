import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  Microscope,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  concerns,
  faqs,
  homeOfferings,
  media,
  products,
  testimonials,
} from "../data/content";
import { useServices } from "../hooks/useServices";
import { analytics } from "../lib/analytics";
import { ArrowLink, ProductCard, ServiceCard } from "../components/Cards";
import { LeadCapture } from "../components/LeadCapture";
import { SEO } from "../components/SEO";
import { contentRepository } from "../repositories/contentRepository";
import { shopifyEnabled } from "../lib/adapters";
import { CareLoop } from "../components/CareLoop";
import { publicHomeContent } from "../repositories/homeContentRepository";
import type { HomeOffering } from "../types";

export default function Home() {
  const { services } = useServices();
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
      {announcement && (
        <div
          className="bg-[var(--forest-950)] px-4 py-3 text-center text-sm font-semibold text-white"
          role="status"
        >
          {announcement}
        </div>
      )}
      <CareLoop offerings={offerings} />

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
                <Link to="/services?category=trichology">
                  Explore trichology services <ArrowRight size={16} />
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
                <Link to="/services?category=salon">
                  Explore salon services <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container-shell">
          <h2 className="section-title">Start with what you notice</h2>
          <p className="lede mt-5">
            You do not need to know the name of a service. Choose the concern
            that feels closest, then explore a safe next step.
          </p>
          <div className="mt-10 grid gap-x-8 md:grid-cols-2 lg:grid-cols-3">
            {concerns.map((concern) => (
              <Link
                key={concern.slug}
                to={`/concerns/${concern.slug}`}
                className="group border-t border-[var(--line)] py-6"
              >
                <h3 className="font-display text-2xl text-[var(--forest-950)]">
                  {concern.name}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {concern.summary}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--forest-800)]">
                  Understand this concern
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-8 rounded-[12px] bg-[var(--forest-50)] p-4 text-sm leading-6 text-[var(--ink)]">
            <strong>Important:</strong> Website information is educational. It
            is not a diagnosis or an emergency medical service.
          </p>
        </div>
      </section>

      <section className="section-space bg-[var(--cream)]">
        <div className="container-shell">
          <h2 className="section-title">
            Care built around a proper first look
          </h2>
          <div className="mt-10 grid gap-6 xl:grid-cols-2">
            {featured.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
          <div className="mt-8">
            <ArrowLink to="/services">See all services and packages</ArrowLink>
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container-shell grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <h2 className="section-title">How care moves forward</h2>
            <p className="lede mt-5">
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
      </section>

      <section className="section-space bg-[var(--forest-50)]">
        <div className="container-shell grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
          <figure>
            <div className="overflow-hidden rounded-[14px]">
              <img
                src={media.practitioner.src}
                alt={media.practitioner.alt}
                width="900"
                height="1100"
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <figcaption className="mt-3 text-xs font-semibold text-[#8b4e22]">
              Licensed stock placeholder.
            </figcaption>
          </figure>
          <div>
            <h2 className="section-title">Popoola Adebola Opeyemi</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--ink)]">
              Certified Trichologist, Natural Hair Advocate and Founder of
              Tamlois Trichology Clinic, passionate about healthy hair and scalp
              care.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                [Microscope, "Careful assessment"],
                [ClipboardCheck, "Clear next steps"],
                [ShieldCheck, "Safe boundaries"],
              ].map(([Icon, label]) => {
                const C = Icon as typeof Microscope;
                return (
                  <div
                    key={label as string}
                    className="border-t border-[var(--line)] pt-4"
                  >
                    <C size={22} className="text-[var(--forest-700)]" />
                    <p className="mt-2 text-sm font-bold">{label as string}</p>
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

      <section className="section-space">
        <div className="container-shell">
          <h2 className="section-title">
            Progress needs context, not promises
          </h2>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
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
                <p className="font-semibold">Illustrative result layout</p>
                <p className="mt-1 text-xs text-[var(--forest-100)]">
                  Use only client-approved media with written consent. No
                  outcome is guaranteed.
                </p>
              </div>
            </div>
            <div className="rule-list">
              {testimonials.map((item) => (
                <figure key={item.id} className="py-6">
                  <blockquote className="font-display text-2xl leading-tight text-[var(--forest-950)]">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="mt-4 text-xs font-semibold text-[var(--muted)]">
                    {item.name}
                    <br />
                    <span className="text-[#8b4e22]">{item.label}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-space bg-[var(--cream)]">
        <div className="container-shell">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h2 className="section-title">Care continues at home</h2>
              <p className="lede mt-4">
                {shopifyEnabled
                  ? "A preview of the product category. Live availability and checkout are in the connected shop."
                  : "Demo products show how a Shopify-connected shop can fit the clinic experience."}
              </p>
            </div>
            <ArrowLink to="/shop">
              Visit the {shopifyEnabled ? "connected" : "demo"} shop
            </ArrowLink>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {products
              .filter((product) => product.featured)
              .map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  hideBuy={shopifyEnabled}
                />
              ))}
          </div>
        </div>
      </section>

      <section className="section-space">
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

      <section className="section-space bg-[var(--forest-900)] text-white">
        <div className="container-shell grid items-end gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="max-w-3xl font-display text-[clamp(2.5rem,6vw,5rem)] leading-none">
              Not sure where to begin?
            </h2>
            <p className="mt-5 max-w-xl text-[var(--forest-100)]">
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
