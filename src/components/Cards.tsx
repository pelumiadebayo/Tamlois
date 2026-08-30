import { ArrowRight, CalendarDays, Clock3, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product, Service } from '../types';
import { currency } from '../lib/booking';
import { analytics, storefrontAnalyticsProperties } from '../lib/analytics';

export function ServiceCard({ service }: { service: Service }) {
  return <article className="group grid overflow-hidden rounded-[14px] border border-[var(--line)] bg-white md:grid-cols-[180px_1fr]">
    <img src={service.image} alt={service.imageAlt} width="500" height="500" loading="lazy" className="h-52 w-full object-cover md:h-full" />
    <div className="flex flex-col p-5">
      <p className="text-xs font-bold text-[var(--forest-700)]">{service.category}</p>
      <h3 className="mt-2 font-display text-2xl leading-tight text-[var(--forest-950)]">{service.name}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{service.summary}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[var(--muted)]"><span className="flex items-center gap-1"><Clock3 size={15} />{service.duration} min</span><span>{currency(service.price)}</span>{service.consultationRequired && <span>Consultation required</span>}</div>
      <div className="mt-auto flex flex-wrap gap-3 pt-5"><Link to={`/services/${service.slug}`} className="btn btn-secondary">View service</Link><Link to={`/booking?service=${service.id}`} className="btn btn-primary"><CalendarDays size={16} />Book now</Link></div>
    </div>
  </article>;
}

export function ProductCard({
  product,
  storefrontUrl,
}: {
  product: Product;
  storefrontUrl: string;
}) {
  const trackClick = () => {
    analytics.track(
      'storefront_link_clicked',
      storefrontAnalyticsProperties('home', `featured-product-${product.id}`),
    );
  };

  return (
    <article className="group">
      <a
        href={storefrontUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Shop ${product.title} on the official Paystack Storefront — opens in a new tab`}
        onClick={trackClick}
        className="block rounded-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--forest-700)]"
      >
        <span className="block overflow-hidden rounded-[14px] bg-[var(--forest-50)]">
          <img
            src={product.image}
            alt={product.imageAlt}
            width="600"
            height="720"
            loading="lazy"
            className="aspect-[4/5] w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
          />
        </span>
        <span className="block pt-4">
          <span className="flex items-start justify-between gap-4">
            <span className="font-semibold text-[var(--forest-950)]">
              {product.title}
            </span>
            <span className="shrink-0 text-sm font-bold">
              {currency(product.price)}
            </span>
          </span>
          <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">
            {product.summary}
          </span>
          <span className="btn btn-primary mt-4">
            View product
            <ExternalLink size={16} aria-hidden="true" />
          </span>
        </span>
      </a>
    </article>
  );
}

export function PageIntro({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return <section className="page-hero"><div className="container-shell"><h1 className="page-title">{title}</h1><p className="lede mt-6">{text}</p>{children && <div className="mt-8">{children}</div>}</div></section>;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="surface grid min-h-64 place-items-center p-8 text-center"><div><h3 className="font-display text-3xl text-[var(--forest-950)]">{title}</h3><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">{text}</p>{action && <div className="mt-5">{action}</div>}</div></div>;
}

export function ArrowLink({ to, children }: { to: string; children: React.ReactNode }) { return <Link to={to} className="inline-flex min-h-11 items-center gap-2 font-bold text-[var(--forest-800)]">{children}<ArrowRight size={18} /></Link>; }
