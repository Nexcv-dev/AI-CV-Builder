import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  buildAssetUrl,
  buildCanonicalUrl,
  DEFAULT_SITE_URL,
  getSeoRoute,
  isPublicSeoPath,
  shouldNoIndexPath,
  SITE_NAME,
} from '../seo';

const siteUrl = DEFAULT_SITE_URL;

export function SeoHead() {
  const location = useLocation();

  useEffect(() => {
    const route = getSeoRoute(location.pathname);
    const canonicalUrl = buildCanonicalUrl(route.path, siteUrl);
    const imageUrl = buildAssetUrl(route.image, siteUrl);
    const noIndex = shouldNoIndexPath(location.pathname) || !isPublicSeoPath(location.pathname);

    document.title = route.title;
    setMeta('description', route.description);
    setMeta('keywords', route.keywords.join(', '));
    setMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    setCanonical(canonicalUrl);

    setProperty('og:site_name', SITE_NAME);
    setProperty('og:type', 'website');
    setProperty('og:title', route.title);
    setProperty('og:description', route.description);
    setProperty('og:url', canonicalUrl);
    setProperty('og:image', imageUrl);

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', route.title);
    setMeta('twitter:description', route.description);
    setMeta('twitter:image', imageUrl);
  }, [location.pathname]);

  return null;
}

function setMeta(name: string, content: string) {
  const selector = `meta[name="${cssEscape(name)}"]`;
  const tag = document.head.querySelector<HTMLMetaElement>(selector) || createMeta('name', name);
  tag.content = content;
}

function setProperty(property: string, content: string) {
  const selector = `meta[property="${cssEscape(property)}"]`;
  const tag = document.head.querySelector<HTMLMetaElement>(selector) || createMeta('property', property);
  tag.content = content;
}

function setCanonical(href: string) {
  const tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]') || document.createElement('link');
  tag.rel = 'canonical';
  tag.href = href;
  if (!tag.parentElement) document.head.appendChild(tag);
}

function createMeta(attribute: 'name' | 'property', value: string) {
  const tag = document.createElement('meta');
  tag.setAttribute(attribute, value);
  document.head.appendChild(tag);
  return tag;
}

function cssEscape(value: string) {
  return value.replace(/"/g, '\\"');
}
