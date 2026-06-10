import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown, LayoutTemplate, Sparkles } from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';
import { useTemplateConfig } from '../hooks/useTemplateConfig';

const templateGuides = [
  {
    title: 'ATS-friendly CV templates',
    body: 'Use a clean structure when you apply through online job portals. NexCV templates keep headings, work history, education, and skills easy to scan while preserving a polished visual layout.',
  },
  {
    title: 'Professional templates for experienced roles',
    body: 'Choose structured layouts when your CV needs to show leadership, measurable achievements, technical skills, or multiple roles without feeling crowded.',
  },
  {
    title: 'Creative templates for standout portfolios',
    body: 'Creative CV templates work best for design, marketing, media, and startup roles where personality matters, while still keeping the content readable for recruiters.',
  },
];

const templateFaqs = [
  {
    question: 'Which CV template should I choose?',
    answer: 'Choose a clean professional template for corporate, technical, finance, and operations roles. Use a creative template when the job values portfolio work, brand sense, or visual presentation.',
  },
  {
    question: 'Are NexCV templates ATS-friendly?',
    answer: 'NexCV templates are designed with readable sections, clear headings, and recruiter-friendly structure so your CV content stays easy to understand.',
  },
  {
    question: 'Can I switch templates after entering my CV details?',
    answer: 'Yes. You can add your details once, then switch templates and continue refining the design without rewriting your CV.',
  },
  {
    question: 'Can I download my CV as a PDF?',
    answer: 'Yes. After building your CV, NexCV can export it as a PDF for job applications, email attachments, and online submissions.',
  },
];

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
                      loading={index < 4 ? 'eager' : 'lazy'}
                      decoding="async"
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

        <section className="border-y border-white/10 bg-slate-900 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-emerald-300">Template guide</p>
                <h2 className="mt-3 max-w-xl font-montserrat text-3xl font-black leading-tight text-white sm:text-5xl">
                  Pick a CV template that matches the job
                </h2>
                <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
                  A good CV template should make your experience easy to read, highlight the right details, and help recruiters find the evidence they need quickly. Start with the role you want, then choose the layout that supports it.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {templateGuides.map((guide) => (
                  <article key={guide.title} className="rounded-2xl border border-white/10 bg-white/6 p-5">
                    <h3 className="font-montserrat text-base font-black text-white">{guide.title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">{guide.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-widest text-violet-300">Template FAQ</p>
              <h2 className="mt-3 font-montserrat text-3xl font-black text-white sm:text-5xl">
                CV template questions
              </h2>
            </div>

            <div className="mt-8 grid gap-3">
              {templateFaqs.map((faq) => (
                <details key={faq.question} className="group rounded-2xl border border-white/10 bg-white/6 p-5">
                  <summary className="cursor-pointer list-none font-montserrat text-base font-black text-white">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">{faq.answer}</p>
                </details>
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
