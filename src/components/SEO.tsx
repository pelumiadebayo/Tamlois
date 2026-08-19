import { useEffect } from 'react';

export function SEO({ title, description, schema }: { title: string; description: string; schema?: object | object[] }) {
  useEffect(() => {
    document.title = `${title} | Tamlois`;
    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let tag = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attr, name); document.head.appendChild(tag); }
      tag.content = content;
    };
    setMeta('description', description);
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', 'website', true);
    const configuredBase = String(import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');
    const pageUrl = configuredBase ? `${configuredBase}/${window.location.hash}` : `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    setMeta('og:url', pageUrl, true);
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null ?? document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'canonical' }));
    canonical.href = pageUrl;
    let script = document.getElementById('page-schema') as HTMLScriptElement | null;
    if (schema) {
      if (!script) { script = document.createElement('script'); script.id = 'page-schema'; script.type = 'application/ld+json'; document.head.appendChild(script); }
      script.textContent = JSON.stringify(schema);
    } else script?.remove();
  }, [title, description, schema]);
  return null;
}
