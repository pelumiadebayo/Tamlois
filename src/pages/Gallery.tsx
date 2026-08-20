import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ImageOff } from "lucide-react";
import { Link } from "react-router-dom";
import { galleryItems } from "../data/content";
import { publicHomeContent } from "../repositories/homeContentRepository";
import type { GalleryCategory, GalleryItem } from "../types";
import { PageIntro } from "../components/Cards";
import { SEO } from "../components/SEO";

const filters: Array<{ label: string; value: "all" | GalleryCategory }> = [
  { label: "All", value: "all" },
  { label: "Trichology", value: "trichology" },
  { label: "Natural Hair", value: "natural-hair" },
  { label: "Clinic", value: "clinic" },
];

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>(galleryItems);
  const [filter, setFilter] = useState<"all" | GalleryCategory>("all");
  const [unavailable, setUnavailable] = useState<string[]>([]);
  useEffect(() => {
    publicHomeContent.gallery().then((next) => {
      if (next.length) setItems(next);
    });
  }, []);
  const visible = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.active &&
            item.category !== "products" &&
            (filter === "all" || item.category === filter),
        )
        .sort((a, b) => a.order - b.order),
    [filter, items],
  );
  return (
    <>
      <SEO
        title="Gallery"
        description="Explore placeholder imagery for Tamlois trichology, natural-hair and clinic care."
      />
      <PageIntro
        title="Care, environment and healthy-hair inspiration"
        text="This gallery currently uses licensed stock placeholders, not verified Tamlois client results. Genuine result imagery will appear only with explicit consent and honest context."
      />
      <section className="gallery-section section-space">
        <div className="container-shell">
          <div
            className="gallery-filters"
            role="group"
            aria-label="Filter gallery"
          >
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
            {visible.map((item, index) => (
              <article
                key={item.id}
                className={`gallery-item ${item.featured ? "is-featured" : ""}`}
              >
                <div className="gallery-image">
                  {!unavailable.includes(item.id) ? (
                    <img
                      src={item.image}
                      alt={item.alt}
                      width="900"
                      height={index % 3 === 0 ? "1100" : "760"}
                      loading={index < 2 ? "eager" : "lazy"}
                      onError={() =>
                        setUnavailable((current) => [...current, item.id])
                      }
                    />
                  ) : (
                    <div
                      className="gallery-image-fallback"
                      role="img"
                      aria-label={item.alt}
                    >
                      <ImageOff size={28} />
                      <span>Image unavailable</span>
                    </div>
                  )}
                  {item.placeholder && <span>Licensed placeholder</span>}
                </div>
                <div className="gallery-caption">
                  <p>{item.category.replace("-", " ")}</p>
                  <h2>{item.caption}</h2>
                  {item.relatedServiceId && (
                    <Link to={`/booking?service=${item.relatedServiceId}`}>
                      View related care <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="surface mt-8 p-10 text-center" role="status">
              No active placeholder images are available in this category.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
