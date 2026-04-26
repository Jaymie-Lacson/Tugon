import { useEffect } from 'react';

interface DocumentHeadOptions {
  title: string;
  description?: string;
  canonicalPath?: string;
  noindex?: boolean;
}

function ensureMeta(name: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  return el;
}

function ensureMetaProperty(property: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  return el;
}

function ensureCanonical(): HTMLLinkElement {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  return el;
}

export function useDocumentHead({
  title,
  description,
  canonicalPath,
  noindex,
}: DocumentHeadOptions) {
  useEffect(() => {
    document.title = title;
    ensureMetaProperty('og:title').setAttribute('content', title);
    ensureMeta('twitter:title').setAttribute('content', title);

    if (description !== undefined) {
      ensureMeta('description').setAttribute('content', description);
      ensureMetaProperty('og:description').setAttribute('content', description);
      ensureMeta('twitter:description').setAttribute('content', description);
    }

    if (canonicalPath !== undefined) {
      const absolute = `${window.location.origin}${canonicalPath}`;
      ensureCanonical().setAttribute('href', absolute);
      ensureMetaProperty('og:url').setAttribute('content', absolute);
    }

    if (noindex) {
      const robots = ensureMeta('robots');
      const previous = robots.getAttribute('content');
      robots.setAttribute('content', 'noindex,follow');
      return () => {
        if (previous === null) robots.remove();
        else robots.setAttribute('content', previous);
      };
    }
  }, [title, description, canonicalPath, noindex]);
}
