import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ImageOff } from "lucide-react";
import { Link } from "react-router-dom";
import { PageIntro } from "../components/Cards";
import { SEO } from "../components/SEO";
import { staticGalleryItems, validateStaticGallery } from "../data/gallery";
import type { GalleryCategory } from "../types";

const PAGE_SIZE = 4;
const filters: Array<{ label: string; value: "all" | GalleryCategory }> = [
  { label: "All", value: "all" },
  { label: "Trichology", value: "trichology" },
  { label: "Natural Hair", value: "natural-hair" },
  { label: "Clinic", value: "clinic" },
];

const gallery = validateStaticGallery(staticGalleryItems)
  .filter((item) => item.active)
  .sort((a, b) => a.order - b.order);

export default function GalleryPage() {
  const [filter, setFilter] = useState<"all" | GalleryCategory>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [unavailable, setUnavailable] = useState<string[]>([]);

  useEffect(() => setLimit(PAGE_SIZE), [filter]);
  const filtered = useMemo(
    () => gallery.filter((item) => filter === "all" || item.category === filter),
    [filter],
  );
  const visible = filtered.slice(0, limit);

  return (
    <>
      <SEO
        title="Gallery"
        description="Explore Tamlois natural-hair styling and clearly identified editorial reference imagery."
      />
      <PageIntro
        title="Texture, technique and a considered approach"
        text="Tamlois imagery is identified separately from licensed editorial placeholders. Nothing is presented as a client result unless written consent and honest context are confirmed."
      />
      <section className="gallery-section section-space">
        <div className="container-shell">
          <div className="gallery-filters" role="group" aria-label="Filter gallery">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                className={filter === item.value ? "is-active" : ""}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="gallery-grid" aria-live="polite">
            {visible.map((item) => {
              const fallback = item.sources.at(-1)!;
              return (
                <article
                  key={item.id}
                  className={`gallery-item ${item.featured ? "is-featured" : ""}`}
                >
                  <div className="gallery-image">
                    {!unavailable.includes(item.id) ? (
                      <img
                        src={fallback.src}
                        srcSet={item.sources.map((source) => `${source.src} ${source.width}w`).join(", ")}
                        sizes={item.featured
                          ? "(max-width: 767px) calc(100vw - 2rem), (max-width: 1100px) 60vw, 760px"
                          : "(max-width: 767px) calc(100vw - 2rem), (max-width: 1100px) 40vw, 380px"}
                        alt={item.alt}
                        width={item.width}
                        height={item.height}
                        loading="lazy"
                        decoding="async"
                        onError={() => setUnavailable((current) => [...current, item.id])}
                      />
                    ) : (
                      <div className="gallery-image-fallback" role="img" aria-label={item.alt}>
                        <ImageOff size={28} />
                        <span>Image unavailable</span>
                      </div>
                    )}
                    <span className={item.provenance === "tamlois" ? "is-tamlois" : ""}>
                      {item.provenanceLabel}
                    </span>
                  </div>
                  <div className="gallery-caption">
                    <p>{item.category.replace("-", " ")}</p>
                    <h2>{item.caption}</h2>
                    <small>{item.consentNote}</small>
                    {item.relatedHref && (
                      <Link to={item.relatedHref}>
                        View related care <ArrowRight size={15} />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!visible.length && (
            <div className="surface mt-8 p-10 text-center" role="status">
              No gallery images are available in this category.
            </div>
          )}
          {visible.length < filtered.length && (
            <div className="mt-8 flex justify-center">
              <button className="btn btn-secondary" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                Load more images
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
