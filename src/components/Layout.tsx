import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Instagram,
  Menu,
  Phone,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { contact } from "../data/content";
import { StorefrontLink } from "./StorefrontLink";
import { analytics, storefrontAnalyticsProperties } from "../lib/analytics";

const links = [
  ["/services", "Services"],
  ["/concerns", "Hair & Scalp Concerns"],
  ["/about", "About"],
  ["/gallery", "Gallery"],
  ["/shop", "Shop"],
  ["/contact", "Contact"],
];

export function Brand({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Tamlois home">
      <span
        className="grid size-10 shrink-0 place-items-center  font-display text-2xl text-white"
        aria-hidden="true"
      >
        {" "}
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          className={inverse ? "brightness-0 invert" : ""}
        />
      </span>
      {!compact && (
        <span
          className={`max-w-[210px] text-[12px] font-bold leading-[1.25] ${inverse ? "text-[var(--color-surface-page)]" : "text-[var(--forest-950)]"}`}
        >
          Tamlois Naturals &<br />
          Trichology Clinic
        </span>
      )}
    </Link>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-[100dvh]">
      <header className="site-header sticky top-0 z-40 border-b border-[var(--line)] backdrop-blur-md">
        <div className="container-shell flex h-[72px] items-center justify-between gap-5">
          <Brand />
          <nav
            className="hidden items-center gap-5 xl:flex"
            aria-label="Primary navigation"
          >
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => {
                  if (to === "/shop")
                    analytics.track(
                      "navigation_storefront_clicked",
                      storefrontAnalyticsProperties("site", "desktop-navigation"),
                    );
                }}
                className={({ isActive }) =>
                  `text-[13px] font-semibold ${isActive ? "text-[var(--forest-800)] underline decoration-[var(--color-commerce-primary)] decoration-2 underline-offset-8" : "text-[var(--ink)] hover:text-[var(--forest-700)]"}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/booking" className="desktop-booking btn btn-primary">
              <CalendarDays size={17} />
              Book an appointment
            </Link>
            <Link
              to="/booking"
              className="mobile-booking btn btn-primary px-3"
              aria-label="Book an appointment"
            >
              <CalendarDays size={19} />
            </Link>
            <button
              className="grid size-12 place-items-center rounded-full border border-[var(--line)] xl:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <div
          id="mobile-menu"
          className={`overflow-hidden border-t border-[var(--line)] bg-[var(--color-surface-page)] transition-[max-height,opacity] duration-200 ${open ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"} xl:hidden`}
        >
          <nav
            className="container-shell grid py-3"
            aria-label="Mobile navigation"
          >
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => {
                  if (to === "/shop")
                    analytics.track(
                      "navigation_storefront_clicked",
                      storefrontAnalyticsProperties("site", "mobile-navigation"),
                    );
                }}
                className="flex min-h-12 items-center justify-between border-b border-[var(--line)] text-sm font-semibold"
              >
                {label}
                <ChevronRight size={17} />
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="site-footer border-t border-white/15 bg-[var(--color-brand-deep)] text-[var(--color-surface-page)]">
        <div className="container-shell grid gap-12 py-16 md:grid-cols-[1.3fr_.7fr_.8fr]">
          <div>
            <Brand inverse />
            <p className="mt-5 max-w-md text-sm leading-7 text-[var(--color-surface-botanical)]">
              Professional trichology and natural hair care focused on healthy
              scalp, hair growth and hair-loss management through personalised,
              evidence-informed care.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Visit and contact
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-[var(--color-surface-botanical)]">
              <p>{contact.address}</p>
              <a
                href={`tel:${contact.phone}`}
                onClick={() => analytics.track("phone_clicked")}
                className="flex items-center gap-2 hover:text-[var(--forest-800)]"
              >
                <Phone size={16} />
                {contact.phone}
              </a>
              <a href="#" className="flex items-center gap-2">
                <Instagram size={16} />
                {contact.instagram}
              </a>
              <p>
                Monday-Saturday, 9:00 a.m.-6:00 p.m.
                <br />
                Sunday closed. Appointments required.
              </p>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Information
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-[var(--color-surface-botanical)]">
              <Link to="/faq">FAQ</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/cancellation-policy">Cancellation</Link>
              <StorefrontLink
                label="Shop products"
                sourcePage="site"
                sourceSection="footer"
                sourceEvent="navigation_storefront_clicked"
                className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-white"
              />
              <Link to="/admin/login">Admin</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/15 py-5">
          <div className="container-shell text-xs text-[var(--color-surface-botanical)]">
            © {new Date().getFullYear()} Tamlois Natural & More | Tamlois
            Trichology Clinic. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
