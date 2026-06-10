import React, { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, LayoutTemplate, Search, Sparkles, Target, Wand2 } from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';

const guideSteps = [
  {
    icon: FileText,
    title: 'Start with the right sections',
    text: 'Add contact details, summary, work experience, education, skills, projects, and references only when they add value.',
  },
  {
    icon: Target,
    title: 'Match the job',
    text: 'Read the vacancy first, then move the most relevant skills and achievements closer to the top of your CV.',
  },
  {
    icon: Wand2,
    title: 'Improve the wording',
    text: 'Use AI to make rough notes clearer, but keep the facts honest and review every sentence before saving.',
  },
  {
    icon: LayoutTemplate,
    title: 'Pick a clean template',
    text: 'Choose a readable design, preview the full page, and download only after the layout looks correct.',
  },
];

const checklist = [
  'Use a professional email address and working phone number.',
  'Keep the summary short: who you are, what you do, and your strongest value.',
  'Write experience bullets with action, result, and context.',
  'Include keywords from the job description naturally.',
  'Avoid fake skills, fake numbers, and over-designed layouts.',
  'Proofread names, dates, links, and spelling before downloading.',
];

export default function BlogPage() {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <SiteHeader />

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:grid-cols-[1fr_0.82fr] lg:items-center lg:px-8">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-black uppercase text-emerald-200">
            <Sparkles size={15} />
            CV guide
          </div>
          <h1 className="max-w-4xl font-montserrat text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
            How to create a professional CV step by step
          </h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-slate-400 sm:text-lg sm:leading-8">
            A practical guide for building a clear CV with NexCV: organize your details, write stronger content, choose a template, and export a PDF when the preview is ready.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to="/builder?import=1" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-[0.98]">
              Start building
              <ArrowRight size={17} />
            </Link>
            <Link to="/templates" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10 active:scale-[0.98]">
              Browse templates
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-2xl shadow-black/25">
          <img src="/images/resume_tips_hero.webp" alt="Professional CV guide preview" className="h-auto w-full rounded-xl object-cover" loading="eager" decoding="async" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {guideSteps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200 ring-1 ring-violet-300/15">
                  <Icon size={19} />
                </span>
                <h2 className="mt-4 font-montserrat text-lg font-black">{step.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">{step.text}</p>
              </article>
            );
          })}
        </div>

        <article className="mt-10 grid gap-8 rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl shadow-black/15 sm:p-7 lg:grid-cols-[0.75fr_1fr]">
          <div>
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-300/12 text-emerald-200">
              <Search size={20} />
            </div>
            <h2 className="font-montserrat text-2xl font-black sm:text-3xl">A simple CV structure that works</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-400">
              Your CV should be easy to scan. Recruiters usually look for role fit, recent experience, skills, and proof that you can do the work. Keep the design clean and let the content carry the value.
            </p>
          </div>
          <div className="grid gap-3">
            {checklist.map((item) => (
              <div key={item} className="flex gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm font-semibold leading-6 text-slate-300">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={17} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="mt-10 overflow-hidden rounded-2xl border border-violet-300/20 bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(16,185,129,0.12),rgba(255,255,255,0.04))] p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="font-montserrat text-2xl font-black">Ready to make yours?</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
                Use this guide as a checklist, then build your CV in NexCV with live preview and editable templates.
              </p>
            </div>
            <Link to="/builder?import=1" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-500 active:scale-[0.98]">
              Create CV
              <ArrowRight size={17} />
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
