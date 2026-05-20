import DOMPurify from 'dompurify';

export const getValidUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (e) {
    try {
      const parsed = new URL(`https://${url}`);
      return parsed.href;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const domPurifyConfig = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br', 'u', 'div', 'span'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

export const sanitizeRichText = (html: string): string =>
  DOMPurify.sanitize(html || '', domPurifyConfig).replace(/>\s+</g, '><');

export const getContrastColor = (hexColor: string) => {
  if (!hexColor || hexColor.length < 7) return '#ffffff';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
};
