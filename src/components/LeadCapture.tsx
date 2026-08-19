import { useState } from 'react';
import { BookOpenText, Check } from 'lucide-react';
import { analytics } from '../lib/analytics';
import { firebaseEnabled } from '../lib/firebase';
import { submissionRepository } from '../repositories/submissionRepository';

export function LeadCapture() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !consent) return;
    setError('');
    try { await submissionRepository.saveLead({ id: crypto.randomUUID(), email, consent, createdAt: new Date().toISOString(), utm: JSON.parse(sessionStorage.getItem('tamlois-utm') || '{}') }); analytics.track('guide_requested'); setDone(true); }
    catch { setError('The request could not be saved. Please retry.'); }
  };
  return <section className="rounded-[14px] bg-[var(--forest-900)] p-7 text-white md:p-10">
    <BookOpenText size={28} />
    <h2 className="mt-5 font-display text-3xl">Healthy Scalp Starter Guide</h2>
    <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--forest-100)]">{firebaseEnabled ? 'Your consented request is saved securely. Email delivery still requires the configured notification provider.' : 'A demo guide request that stores consent locally. Connect Firebase and an email provider for delivery.'}</p>
    {done ? <p className="mt-6 flex items-center gap-2 font-semibold" role="status"><Check />Request saved {firebaseEnabled ? 'securely' : 'in demo mode'}.</p> : <form className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={submit}><label className="sr-only" htmlFor="guide-email">Email address</label><input id="guide-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" className="min-h-12 rounded-[12px] border border-white/30 bg-white px-4 text-[var(--ink)] placeholder:text-[#66756b]" /><button className="btn bg-white text-[var(--forest-950)]">Request guide</button><label className="flex items-start gap-2 text-xs leading-5 text-[var(--forest-100)] sm:col-span-2"><input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-[var(--warm)]" />I agree to receive the guide and related clinic updates. I can unsubscribe later.</label>{error && <p className="text-xs font-bold text-[#ffd4c7] sm:col-span-2" role="alert">{error}</p>}</form>}
  </section>;
}
