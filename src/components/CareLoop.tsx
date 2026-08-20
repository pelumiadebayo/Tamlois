import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Pause,
  Play,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";
import { analytics, type AnalyticsEvent } from "../lib/analytics";
import type { HomeOffering, HomeOfferingId } from "../types";

const ROTATION_MS = 6500;
const INITIAL_OFFERING: HomeOfferingId = "salon";
const OFFERING_ORDER: HomeOfferingId[] = [
  "salon",
  "trichology",
  "products",
  "gallery",
];

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

const ctaEvents: Record<HomeOfferingId, AnalyticsEvent> = {
  trichology: "home_trichology_cta_clicked",
  salon: "home_salon_cta_clicked",
  products: "home_products_cta_clicked",
  gallery: "home_gallery_cta_clicked",
};

function resolveImageSource(source: string) {
  if (!source.startsWith("/") || source.startsWith("//")) return source;
  return `${import.meta.env.BASE_URL}${source.slice(1)}`;
}

export function CareLoop({ offerings }: { offerings: HomeOffering[] }) {
  const ordered = useMemo(
    () =>
      OFFERING_ORDER.map((id) =>
        offerings.find((item) => item.id === id && item.active),
      ).filter((item): item is HomeOffering => Boolean(item)),
    [offerings],
  );
  const initialIndex = Math.max(
    0,
    ordered.findIndex((offering) => offering.id === INITIAL_OFFERING),
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [manualAnnouncement, setManualAnnouncement] = useState(false);
  const [playOverride, setPlayOverride] = useState(false);
  const [imageUnavailable, setImageUnavailable] = useState<string[]>([]);
  const swipeStart = useRef<number | null>(null);
  const playControl = useRef<HTMLButtonElement>(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = useMediaQuery("(max-width: 767px)");
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const autoEnabled =
    playing &&
    (playOverride || (!hovered && !focused)) &&
    pageVisible &&
    !reducedMotion;
  const active = ordered[activeIndex] || ordered[0];

  useEffect(() => {
    analytics.track("home_loop_viewed");
  }, []);
  useEffect(() => {
    if (reducedMotion) setPlaying(false);
  }, [reducedMotion]);
  useEffect(() => {
    const visibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (!autoEnabled || ordered.length < 2) return;
    const timer = window.setTimeout(() => {
      setManualAnnouncement(false);
      setActiveIndex((current) => (current + 1) % ordered.length);
      analytics.track("home_loop_auto_advanced");
    }, ROTATION_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, autoEnabled, ordered.length]);
  useEffect(() => {
    if (activeIndex >= ordered.length) setActiveIndex(0);
  }, [activeIndex, ordered.length]);

  if (!active) return null;

  function select(index: number, input: "click" | "keyboard" | "swipe") {
    setActiveIndex((index + ordered.length) % ordered.length);
    setPlaying(false);
    setPlayOverride(false);
    setManualAnnouncement(true);
    analytics.track("home_loop_manually_selected", {
      offering: ordered[(index + ordered.length) % ordered.length].id,
      input,
    });
  }

  function moveBy(delta: number, input: "click" | "keyboard" | "swipe") {
    select((activeIndex + delta + ordered.length) % ordered.length, input);
  }

  function advanceAndResume() {
    const nextIndex = (activeIndex + 1) % ordered.length;
    setActiveIndex(nextIndex);
    setPlaying(!reducedMotion);
    setPlayOverride(!reducedMotion);
    setManualAnnouncement(true);
    analytics.track("home_loop_manually_selected", {
      offering: ordered[nextIndex].id,
      input: "click",
    });
  }

  return (
    <section
      className="care-loop"
      aria-label="Tamlois Care Loop"
      onMouseEnter={() => {
        if (!canHover) return;
        setHovered(true);
        setPlayOverride(false);
      }}
      onMouseLeave={() => {
        if (canHover) setHovered(false);
      }}
      onFocus={(event) => {
        setFocused(true);
        if (event.target !== playControl.current) setPlayOverride(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="container-shell care-loop-layout">
        <div className="care-loop-positioning">
          <h1>Understand your scalp. Care for your hair with confidence.</h1>
          <p>
            Personalised trichology, healthy-scalp care and professional
            natural-hair services designed around your individual needs.
          </p>
          <div key={`actions-${active.id}`} className="care-loop-actions">
            <Link
              to={active.primaryCta.href}
              className="btn btn-primary"
              onClick={() =>
                analytics.track(ctaEvents[active.id], { action: "primary" })
              }
            >
              {active.primaryCta.label}
              <ArrowRight size={16} />
            </Link>
            {active.secondaryCta && (
              <Link
                to={active.secondaryCta.href}
                className="care-loop-secondary"
                onClick={() =>
                  analytics.track(ctaEvents[active.id], {
                    action: "secondary",
                  })
                }
              >
                {active.secondaryCta.label}
              </Link>
            )}
          </div>
          <div
            className="care-loop-rail"
            role="group"
            aria-label="Explore Tamlois offerings"
            data-orientation={mobile ? "horizontal" : "vertical"}
          >
            {ordered.map((offering, index) => (
              <button
                key={offering.id}
                id={`offering-tab-${offering.id}`}
                aria-pressed={index === activeIndex}
                tabIndex={index === activeIndex ? 0 : -1}
                className={index === activeIndex ? "is-active" : ""}
                onClick={() => select(index, "click")}
                onKeyDown={(event) => {
                  if (["ArrowDown", "ArrowRight"].includes(event.key)) {
                    event.preventDefault();
                    select(index + 1, "keyboard");
                    document
                      .getElementById(
                        `offering-tab-${ordered[(index + 1) % ordered.length].id}`,
                      )
                      ?.focus();
                  }
                  if (["ArrowUp", "ArrowLeft"].includes(event.key)) {
                    event.preventDefault();
                    select(index - 1, "keyboard");
                    document
                      .getElementById(
                        `offering-tab-${ordered[(index - 1 + ordered.length) % ordered.length].id}`,
                      )
                      ?.focus();
                  }
                }}
              >
                <span className="care-loop-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{offering.eyebrow}</span>
                <span
                  className="care-loop-progress"
                  aria-hidden="true"
                  style={{
                    animationDuration: `${ROTATION_MS}ms`,
                    animationPlayState: autoEnabled ? "running" : "paused",
                  }}
                />
              </button>
            ))}
          </div>
          <div className="care-loop-controls">
            <button
              ref={playControl}
              type="button"
              className="care-loop-playback"
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                  setPlayOverride(false);
                  analytics.track("home_loop_paused");
                } else {
                  setPlaying(true);
                  setPlayOverride(true);
                }
              }}
              aria-label={playing ? "Pause Care Loop" : "Play Care Loop"}
              aria-pressed={!playing}
              title={playing ? "Pause Care Loop" : "Play Care Loop"}
              disabled={reducedMotion}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              className="care-loop-advance"
              onClick={advanceAndResume}
              aria-label={`Show next offering and resume: ${ordered[(activeIndex + 1) % ordered.length].eyebrow}`}
              title="Next offering"
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </div>

        <div
          className="care-loop-stage"
          data-offering={active.id}
          onTouchStart={(event) => {
            swipeStart.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (swipeStart.current === null) return;
            const distance =
              event.changedTouches[0].clientX - swipeStart.current;
            if (Math.abs(distance) > 48) moveBy(distance < 0 ? 1 : -1, "swipe");
            swipeStart.current = null;
          }}
        >
          <div
            key={`image-${active.id}`}
            className="care-loop-image-wrap"
            data-placeholder={active.image.placeholder ? "true" : "false"}
          >
            {!imageUnavailable.includes(active.id) ? (
              <img
                src={resolveImageSource(active.image.src)}
                alt={active.image.alt}
                width="1100"
                height="820"
                fetchPriority={active.id === INITIAL_OFFERING ? "high" : "auto"}
                style={{ objectPosition: active.image.focalPoint }}
                onError={() =>
                  setImageUnavailable((current) => [...current, active.id])
                }
              />
            ) : (
              <div
                className="care-loop-image-fallback"
                role="img"
                aria-label={active.image.alt}
              >
                <ShieldCheck size={30} />
                <span>Image unavailable</span>
              </div>
            )}
            {active.image.placeholder && (
              <span className="care-loop-placeholder">
                Tamlois
              </span>
            )}
          </div>
          <article
            key={`copy-${active.id}`}
            id={`offering-panel-${active.id}`}
            role="region"
            aria-label={active.eyebrow}
            className="care-loop-offering"
            aria-live={manualAnnouncement ? "polite" : "off"}
          >
            <div className="care-loop-offering-top">
              <div>
                <p className="care-loop-offering-label">{active.eyebrow}</p>
                <h2>{active.title}</h2>
              </div>
              <Link
                to={active.primaryCta.href}
                className="care-loop-card-action"
                onClick={() =>
                  analytics.track(ctaEvents[active.id], {
                    action: "card-primary",
                  })
                }
                aria-label={`${active.primaryCta.label} from offering card`}
              >
                {active.id === "products" ? (
                  <ShoppingBag size={19} />
                ) : active.id === "gallery" ? (
                  <ArrowUpRight size={19} />
                ) : (
                  <CalendarDays size={19} />
                )}
              </Link>
            </div>
            <p className="care-loop-offering-copy">{active.description}</p>
          </article>
        </div>
      </div>
      <nav className="sr-only" aria-label="All Tamlois offerings">
        <Link to="/services?category=trichology">Trichology Services</Link>
        <Link to="/services?category=salon">Salon Services</Link>
        <Link to="/shop">Shop</Link>
        <Link to="/gallery">Gallery</Link>
      </nav>
    </section>
  );
}
