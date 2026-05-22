import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown, LayoutTemplate, Sparkles } from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';
import { useTemplateConfig } from '../hooks/useTemplateConfig';

export default function TemplatesPage() {
  const { templates } = useTemplateConfig();
  return (
    <div className="overflow-x-hidden bg-slate-950 text-white">
      <SiteHeader />

      <main className="relative pt-16">
        <section className="relative overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-violet-500/18 blur-3xl" />
          <div className="absolute bottom-20 right-0 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs font-extrabold text-violet-200">
                <Sparkles size={16} className="text-violet-300" />
                Choose your CV style
              </div>
              <h1 className="font-montserrat text-3xl font-black leading-tight text-white min-[390px]:text-4xl sm:text-6xl">
                Templates
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-300 sm:text-base sm:leading-7">
                Pick a layout first, then continue building with the same live preview and PDF export.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {templates.map((template, index) => (
                <Link
                  key={template.key}
                  to={`/builder?import=1&template=${template.key}`}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/6 shadow-xl shadow-black/10 transition-all hover:-translate-y-1 hover:border-violet-300/30 hover:bg-white/9 hover:shadow-2xl hover:shadow-black/20 active:scale-[0.99]"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="relative aspect-4/5 overflow-hidden bg-slate-900">
                    <TemplateAccessBadge access={template.access} />
                    <img
                      src={template.thumbnail}
                      alt={`${template.label} CV template preview`}
                      className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.035]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <div className="font-montserrat text-sm font-black leading-tight text-white sm:text-base">{template.label}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <LayoutTemplate size={13} />
                        {template.category} template
                      </div>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white transition-transform group-hover:translate-x-1">
                      <ArrowRight size={17} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function TemplateAccessBadge({ access }: { access: 'free' | 'paid' }) {
  if (access === 'free') {
    return (
      <span className="absolute right-3 top-3 z-10 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/60">
        Free
      </span>
    );
  }

  return (
    <span className="absolute right-3 top-3 z-10 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-amber-400 px-2 text-amber-950 shadow-lg shadow-amber-400/30 ring-1 ring-white/60" aria-label="Premium template">
      <Crown size={15} strokeWidth={2.6} />
    </span>
  );
}
