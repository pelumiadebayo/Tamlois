import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageIntro, ServiceCard } from "../components/Cards";
import { SEO } from "../components/SEO";
import { useServices } from "../hooks/useServices";
import { analytics } from "../lib/analytics";
import { currency } from "../lib/booking";
import { filterServices } from "../lib/catalogue";

export function ServicesPage() {
  const { services, loading, error, retry } = useServices();
  const [search] = useSearchParams();
  const [query, setQuery] = useState("");
  const requestedCategory = search.get("category");
  const [category, setCategory] = useState(
    requestedCategory === "trichology" || requestedCategory === "salon"
      ? requestedCategory
      : "All",
  );
  useEffect(() => {
    setCategory(
      requestedCategory === "trichology" || requestedCategory === "salon"
        ? requestedCategory
        : "All",
    );
  }, [requestedCategory]);
  const categories = [
    "All",
    ...new Set(
      services
        .filter((s) => s.active && s.type !== "package")
        .map((s) => s.category),
    ),
  ];
  const filtered = useMemo(
    () =>
      filterServices(
        services.filter((service) => service.type !== "package"),
        query,
        category,
      ),
    [services, query, category],
  );
  return (
    <>
      <SEO
        title="Services"
        description="Explore Tamlois trichology, scalp and natural-hair services."
      />
      <PageIntro
        title="Care that starts with understanding"
        text="Browse assessment, treatment and maintenance services. All prices and durations are placeholders until confirmed."
      />
      <section className="section-space">
        <div className="container-shell">
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-[12px] bg-[#fff0ec] p-4 text-sm text-[#7d3028]"
            >
              {error}{" "}
              <button
                className="font-bold underline"
                onClick={retry}
              >
                Retry
              </button>
            </div>
          )}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                size={18}
              />
              <input
                className="control pl-11"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services or concerns"
                aria-label="Search services"
              />
            </div>
            <div className="no-scrollbar flex max-w-full gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`btn ${category === item ? "btn-primary" : "btn-secondary"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div
              className="mt-10 grid gap-6 xl:grid-cols-2"
              aria-label="Loading services"
            >
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="surface h-48 animate-pulse bg-[var(--forest-50)]"
                />
              ))}
            </div>
          ) : (
            <div className="mt-10 grid gap-6 xl:grid-cols-2">
              {filtered.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="surface mt-10 p-10 text-center">
              <h2 className="font-display text-3xl">
                {services.length ? "No matching services" : "No services have been published yet"}
              </h2>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {services.length
                  ? "Try a broader search or choose another category."
                  : "Please check back after Tamlois adds its first active service."}
              </p>
              {services.length > 0 && <button
                className="btn btn-secondary mt-5"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                }}
              >
                Clear filters
              </button>}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function PackagesPage() {
  const { services } = useServices();
  const packages = services.filter(
    (service) => service.active && service.type === "package",
  );
  return (
    <>
      <SEO
        title="Packages"
        description="Explore placeholder service packages from Tamlois."
      />
      <PageIntro
        title="Care plans with a clear sequence"
        text="Packages are illustrative until the clinic confirms the included services, prices and treatment order."
      />
      <section className="section-space">
        <div className="container-shell grid gap-6 lg:grid-cols-2">
          {packages.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>
    </>
  );
}

export function ServiceDetailPage() {
  const { services } = useServices();
  const { slug } = useParams();
  const service = services.find((item) => item.slug === slug && item.active);
  if (!service)
    return (
      <PageIntro
        title="Service not found"
        text="This service may be inactive or the link may be incorrect."
      />
    );
  analytics.track("service_viewed", { service: service.id });
  const detailGroups = [
    ["Who it may suit", service.concerns.join(", ")],
    ["How to prepare", service.preparation],
    ["What happens", service.expectation],
    ["Aftercare", service.aftercare],
    ["Caution", service.caution],
  ];
  return (
    <>
      <SEO
        title={service.name}
        description={service.summary}
        schema={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.name,
          description: service.summary,
          offers: {
            "@type": "Offer",
            priceCurrency: "NGN",
            price: service.price,
          },
        }}
      />
      <section className="border-b border-[var(--line)]">
        <div className="container-shell grid min-h-[620px] lg:grid-cols-[1fr_.9fr]">
          <div className="flex flex-col justify-center py-14 pr-0 lg:pr-14">
            <span className="text-sm font-bold text-[var(--forest-700)]">
              {service.category}
            </span>
            <h1 className="page-title mt-4">{service.name}</h1>
            <p className="lede mt-6">{service.summary}</p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold">
              <span>{currency(service.price)}</span>
              <span>{service.duration} minutes</span>
            </div>
            <div className="mt-8">
              <Link
                to={`/booking?service=${service.id}`}
                className="btn btn-primary"
              >
                Book this service
              </Link>
            </div>
          </div>
          <img
            src={service.image}
            alt={service.imageAlt}
            width="1000"
            height="1000"
            className="h-full min-h-[420px] w-full object-cover"
          />
        </div>
      </section>
      <section className="section-space">
        <div className="container-shell grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <h2 className="section-title">A considered appointment</h2>
            <p className="mt-6 text-base leading-7 text-[var(--muted)]">
              {service.description}
            </p>
            {service.variations.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold">Available variations</h3>
                <div className="mt-3 rule-list">
                  {service.variations.map((variation) => (
                    <div
                      key={variation.id}
                      className="flex justify-between gap-4 py-4 text-sm"
                    >
                      <span>{variation.name}</span>
                      <span className="font-bold">
                        {currency(variation.price)} · {variation.duration} min
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {detailGroups.map(([title, text]) => (
              <div key={title} className="border-t border-[var(--line)] pt-5">
                <h3 className="font-bold text-[var(--forest-950)]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
