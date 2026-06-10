import React from 'react';
import { SiteHeader } from './SiteHeader';
import { usePublicContent } from '../hooks/usePublicContent';
import type { CmsContent, CmsLegalPage as CmsLegalPageContent } from '@nexcv/shared/contentDefaults';

function readableDate(value: string) {
  if (value.trim()) return value;
  return new Date().toLocaleDateString();
}

export function CmsLegalPage({ pageKey }: { pageKey: keyof CmsContent['legal'] }) {
  const content = usePublicContent();
  const page: CmsLegalPageContent = content.legal[pageKey];

  return (
    <div className="overflow-x-hidden bg-slate-950 text-slate-300">
      <SiteHeader />
      <main className="relative mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-0 top-20 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative rounded-3xl border border-white/10 bg-white/4 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-12">
          <article className="prose prose-invert prose-slate max-w-none">
            <h1 className="font-montserrat font-black text-white">{page.title}</h1>
            <p>Last updated: {readableDate(page.lastUpdated)}</p>

            {page.sections.map((section, index) => (
              <section key={`${section.heading}-${index}`}>
                <h2 className="font-montserrat text-white">{index + 1}. {section.heading}</h2>
                <p>{section.body}</p>
                {section.bullets && section.bullets.length > 0 && (
                  <ul>
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </section>
            ))}
          </article>
        </div>
      </main>
    </div>
  );
}
