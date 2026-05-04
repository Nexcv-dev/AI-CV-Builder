/**
 * Shared HTML building helpers for PDF generation.
 * Eliminates duplicated inline style strings across template renderers.
 */
import DOMPurify from 'dompurify';

// ─── Sanitization ────────────────────────────────────────────────────

export const esc = (str: string): string =>
  (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const sanitizeHtml = (html: string): string =>
  DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br', 'u', 'div', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

// ─── Contrast color ──────────────────────────────────────────────────

export function getContrastColor(hex: string): string {
  if (!hex || hex.length < 7) return '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
}

// ─── Reusable micro-templates ────────────────────────────────────────

/** Section heading with colored underline — adapts font size for professional */
export function sectionHeading(title: string, themeColor: string, template: string): string {
  const fontSize = template === 'professional' ? '0.875rem' : '1.125rem';
  return `<h2 style="font-size:${fontSize};font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-bottom:2px solid ${themeColor};color:${themeColor};padding-bottom:4px;margin-bottom:16px">${title}</h2>`;
}

/** Wraps items in a section container with break-inside:avoid */
export function sectionWrap(content: string, sectionGap: number): string {
  return `<section style="margin-bottom:${sectionGap}rem;break-inside:avoid">${content}</section>`;
}

/** Description block with sanitized rich-text */
export function descriptionBlock(html: string, lineSpacing: number): string {
  if (!html) return '';
  return `<div style="font-size:0.875rem;color:#374151;line-height:${lineSpacing};white-space:pre-wrap;word-break:break-word">${sanitizeHtml(html)}</div>`;
}

/** Skill bar (5-segment) */
export function skillBar(level: number, themeColor: string): string {
  const pct = ((level || 0) / 5) * 100;
  return `<div style="width:96px;height:6px;background:#e5e7eb;border-radius:9999px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${themeColor};border-radius:9999px"></div></div>`;
}

/** Date range for classic template (single line) */
export function dateRangeInline(start: string, end: string): string {
  return `${esc(start || '')} ${start && end ? '—' : ''} ${esc(end || '')}`;
}

/** Date range for professional template (stacked) */
export function dateRangeStacked(start: string, end: string): string {
  return `${esc(start || '')}<br>${start && end ? '—' : ''}<br>${esc(end || '')}`;
}

/** Classic/Professional grid row: date column + content column */
export function timelineRow(dateHtml: string, contentHtml: string, template: string): string {
  const colWidth = template === 'professional' ? '114px' : '130px';
  const dateStyle = template === 'professional'
    ? 'font-size:0.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;padding-top:2px'
    : 'font-size:0.875rem;color:#6b7280;font-weight:500;padding-top:2px';
  return `<div style="display:grid;grid-template-columns:${colWidth} 1fr;gap:16px;break-inside:avoid">
    <div style="${dateStyle}">${dateHtml}</div>
    <div>${contentHtml}</div>
  </div>`;
}

/** Modern layout row: title + subtitle/date side-by-side */
export function modernRow(titleHtml: string, subtitleLeft: string, subtitleRight: string, bodyHtml: string): string {
  return `<div style="break-inside:avoid">
    ${titleHtml}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:0.875rem;font-weight:500;color:#374151">${subtitleLeft}</span>
      <span style="font-size:0.75rem;color:#6b7280;font-weight:500">${subtitleRight}</span>
    </div>
    ${bodyHtml}
  </div>`;
}

/** Item title (h3) */
export function itemTitle(text: string): string {
  return `<h3 style="font-size:1rem;font-weight:700;color:#111827;margin:0">${esc(text)}</h3>`;
}

/** Subtitle line (company / institution) */
export function itemSubtitle(text: string, color: string = '#374151', marginBottom: string = '8px'): string {
  return `<div style="font-size:0.875rem;font-weight:500;color:${color};margin-bottom:${marginBottom}">${esc(text)}</div>`;
}

/** Personal detail row (label: value) for classic/professional */
export function detailRow(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #f3f4f6;padding-bottom:4px"><span style="font-weight:600;color:#4b5563">${label}:</span><span style="color:#1f2937">${esc(value)}</span></div>`;
}

/** Skill chip for classic/professional */
export function skillChip(name: string): string {
  return `<span style="font-size:0.875rem;font-weight:600;padding:6px 12px;background:#f3f4f6;color:#374151;border-radius:6px;border:1px solid #e5e7eb">${esc(name || '')}</span>`;
}

/** Items list wrapper */
export function itemsList(items: string[], gap: string = '24px'): string {
  return `<div style="display:flex;flex-direction:column;gap:${gap}">${items.join('')}</div>`;
}

/** Profile image HTML */
export function profileImageHtml(
  src: string, zoom: number, x: number, y: number,
  size: number, borderRadius: string, border: string
): string {
  if (!src) return '';
  return `<div style="width:${size}px;height:${size}px;border-radius:${borderRadius};overflow:hidden;border:${border};margin:0 auto;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;-webkit-mask-image:-webkit-radial-gradient(white,black);transform:translateZ(0);clip-path:inset(0 round ${borderRadius})"><img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block;transform-origin:center;transform:scale(${zoom}) translate(${x}px,${y}px)" /></div>`;
}
