import { ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageIntro, ServiceCard } from '../components/Cards';
import { SEO } from '../components/SEO';
import { concerns } from '../data/content';
import { useServices } from '../hooks/useServices';
import { analytics } from '../lib/analytics';

export function ConcernsPage() {
  return <><SEO title="Hair and scalp concerns" description="Plain-language guidance to help you choose an appropriate Tamlois service." /><PageIntro title="Begin with the change you can see" text="These guides explain common signs and possible contributing factors without diagnosing. Choose a concern to see what the clinic can assess." /><section className="section-space"><div className="container-shell grid gap-x-8 md:grid-cols-2 lg:grid-cols-3">{concerns.map((concern) => <Link key={concern.slug} to={`/concerns/${concern.slug}`} className="group border-t border-[var(--line)] py-7"><h2 className="font-display text-3xl text-[var(--forest-950)]">{concern.name}</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{concern.summary}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--forest-800)]">Read guide<ArrowRight size={16} /></span></Link>)}</div></section></>;
}

export function ConcernDetailPage() {
  const { services } = useServices();
  const { slug } = useParams();
  const concern = concerns.find((item) => item.slug === slug);
  if (!concern) return <PageIntro title="Concern guide not found" text="The requested guide is unavailable." />;
  analytics.track('concern_viewed', { concern: concern.slug });
  const related = services.filter((service) => concern.relatedServiceIds.includes(service.id) && service.active);
  return <><SEO title={concern.name} description={concern.summary} /><PageIntro title={concern.name} text={concern.overview}><Link to="/booking?service=svc-consult" className="btn btn-primary">Book a consultation</Link></PageIntro><section className="section-space"><div className="container-shell grid gap-12 lg:grid-cols-2"><div><h2 className="section-title">What you may notice</h2><div className="mt-7 grid gap-3">{concern.signs.map((sign) => <p key={sign} className="rounded-[12px] bg-[var(--forest-50)] p-4 text-sm font-semibold">{sign}</p>)}</div></div><div><h2 className="section-title">Possible contributing factors</h2><p className="mt-5 text-sm leading-6 text-[var(--muted)]">These are examples, not a diagnosis.</p><div className="mt-6 grid grid-cols-2 gap-3">{concern.factors.map((factor) => <p key={factor} className="border-t border-[var(--line)] py-4 text-sm font-semibold">{factor}</p>)}</div></div></div></section><section className="section-space bg-[var(--cream)]"><div className="container-shell grid gap-10 lg:grid-cols-[1fr_.85fr]"><div><h2 className="section-title">What Tamlois can assess</h2><p className="lede mt-5">{concern.assessment}</p></div><aside className="rounded-[14px] bg-white p-7"><h3 className="font-display text-2xl text-[var(--forest-950)]">When to seek medical care</h3><p className="mt-4 text-sm leading-6 text-[var(--muted)]">{concern.doctorNote}</p></aside></div></section><section className="section-space"><div className="container-shell"><h2 className="section-title">Relevant services</h2><div className="mt-10 grid gap-6 xl:grid-cols-2">{related.map((service) => <ServiceCard key={service.id} service={service} />)}</div></div></section></>;
}
