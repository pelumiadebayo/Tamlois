import { useEffect, useMemo, useState } from "react";
import { Check, Search, ShieldCheck } from "lucide-react";
import { SEO } from "../components/SEO";
import { EmptyState, ProductCard } from "../components/Cards";
import { StorefrontLink } from "../components/StorefrontLink";
import { analytics, storefrontAnalyticsProperties } from "../lib/analytics";
import { useProducts } from "../hooks/useProducts";
import { productTitle, publicProducts } from "../commerce/products";

const storefrontBenefits = [
  "Current Paystack-synchronized prices and availability",
  "Tamlois-selected products and care categories",
  "Secure checkout completed through Paystack Storefront",
];

export function ProductLoadState({
  state,
  retry,
}: {
  state: "loading" | "ready" | "error";
  retry(): Promise<void>;
}) {
  if (state === "loading")
    return (
      <div
        className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        role="status"
        aria-label="Loading products"
      >
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="aspect-[4/5] animate-pulse rounded-[14px] bg-[var(--forest-50)]"
          />
        ))}
      </div>
    );
  if (state === "error")
    return (
      <EmptyState
        title="Products could not be loaded"
        text="Your connection or the product catalogue may be temporarily unavailable."
        action={
          <button className="btn btn-primary" onClick={() => void retry()}>
            Retry
          </button>
        }
      />
    );
  return null;
}

export default function ShopPage() {
  const { products, state, retry } = useProducts();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  useEffect(() => {
    analytics.track(
      "shop_page_viewed",
      storefrontAnalyticsProperties("shop", "page"),
    );
  }, []);
  const ordered = publicProducts(products);
  const categories = useMemo(
    () =>
      [
        ...new Set(
          ordered
            .map((product) => product.category)
            .filter(Boolean) as string[],
        ),
      ].sort(),
    [ordered],
  );
  const filtered = ordered.filter((product) => {
    const query = search.trim().toLowerCase();
    return (
      (!query ||
        `${productTitle(product)} ${product.sourceDescription}`
          .toLowerCase()
          .includes(query)) &&
      (category === "all" || product.category === category) &&
      (!featuredOnly || product.featured)
    );
  });
  return (
    <>
      <SEO
        title="Hair & Scalp Care Products"
        description="Explore Tamlois hair and scalp-care products and complete secure checkout through Paystack."
      />
      <section className="section-product section-space">
        <div className="container-shell grid gap-9 lg:grid-cols-[.78fr_1.22fr] lg:gap-14">
          <div>
            <ShieldCheck
              size={30}
              strokeWidth={1.6}
              className="text-[var(--forest-700)]"
              aria-hidden="true"
            />
            <h1 className="page-title mt-5">
              Care that continues at home
            </h1>
            <p className="lede mt-4">
              Browse the Tamlois collection here, then complete your purchase
              securely on Paystack.
            </p>
          </div>
          <div className="border-t border-[var(--line)]">
            <ul aria-label="Shop information">
              {storefrontBenefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex min-h-20 items-center gap-4 border-b border-[var(--line)] py-5 text-sm font-semibold"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--forest-100)]">
                    <Check size={16} />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
            <StorefrontLink
              label="Shop all on Paystack"
              sourcePage="shop"
              sourceSection="intro"
              className="btn btn-commerce mt-6"
            />
          </div>
        </div>
      </section>
      <section className="section-page section-space" aria-labelledby="shop-products-title">
        <div className="container-shell">
          <h2 id="shop-products-title" className="section-title">
            Shop products
          </h2>
          <div className="mt-7 grid gap-3 rounded-[14px] border border-[var(--line)] bg-white p-4 md:grid-cols-[1fr_220px_auto]">
            <label className="relative">
              <span className="sr-only">Search products</span>
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                className="control"
                style={{ paddingLeft: "2.75rem" }}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products"
              />
            </label>
            <label>
              <span className="sr-only">Product category</span>
              <select
                className="control"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="flex min-h-12 items-center gap-3 px-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={featuredOnly}
                onChange={(event) => setFeaturedOnly(event.target.checked)}
                className="size-5 accent-[var(--color-commerce-primary)]"
              />
              Featured only
            </label>
          </div>
          <ProductLoadState state={state} retry={retry} />
          {state === "ready" && filtered.length === 0 && (
            <EmptyState
              title={
                ordered.length
                  ? "No matching products"
                  : "Products are coming soon"
              }
              text={
                ordered.length
                  ? "Try a different search or filter."
                  : "Visit the official Paystack Storefront for current Tamlois products."
              }
              action={
                <StorefrontLink
                  label="Open Paystack Storefront"
                  sourcePage="shop"
                  sourceSection="empty"
                />
              }
            />
          )}
          {state === "ready" && filtered.length > 0 && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  sourcePage="shop"
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
