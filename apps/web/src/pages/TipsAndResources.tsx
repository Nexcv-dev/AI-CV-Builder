import React, { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Crown,
  Download,
  Edit3,
  FileText,
  LayoutTemplate,
  Lightbulb,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import { AppShellHeader } from '../components/AppShellHeader';
import { AppSidebar } from '../components/AppSidebar';
import { clearPageScrollLock } from '../utils/scrollLock';

type GuideSection = {
  eyebrow: string;
  title: string;
  copy: string;
  points: string[];
  visual: React.ReactNode;
};

const quickSteps = [
  {
    icon: Plus,
    title: 'Create or import',
    text: 'Start with a blank CV, or import an existing PDF so the builder can help you organize the content.',
  },
  {
    icon: Wand2,
    title: 'Refine with AI',
    text: 'Use AI for summaries and bullet points, then edit the wording so it still sounds like you.',
  },
  {
    icon: LayoutTemplate,
    title: 'Choose a template',
    text: 'Switch templates anytime. Your CV data stays in place while the visual layout changes.',
  },
  {
    icon: Download,
    title: 'Download when ready',
    text: 'Preview first, confirm the final layout, then export a polished PDF for applications.',
  },
];

function DashboardScreenshot() {
  return (
    <ScreenshotFrame label="Dashboard">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Saved CVs', '1', FileText],
          ['Templates Used', '1', LayoutTemplate],
          ['Latest Update', '5 days', CheckCircle2],
        ].map(([label, value, Icon]) => (
          <div key={label as string} className="rounded-xl border border-white/10 bg-slate-950/80 p-3">
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200">
              <Icon size={16} />
            </span>
            <p className="text-2xl font-black text-white">{value as string}</p>
            <p className="mt-1 text-xs font-bold text-slate-400">{label as string}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/75 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-white">Recent CVs</p>
            <p className="text-xs font-semibold text-slate-500">Your latest saved documents.</p>
          </div>
          <span className="rounded-lg bg-emerald-300/12 px-2 py-1 text-[10px] font-black text-emerald-200">Saved</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.035] p-2">
          <div className="h-14 w-11 rounded-md bg-linear-to-b from-slate-100 to-slate-300" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">Alpha CV</p>
            <p className="text-xs font-semibold text-slate-400">Tech template</p>
          </div>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-2 text-xs font-black text-slate-200">
            <Edit3 size={13} />
            Edit
          </button>
        </div>
      </div>
    </ScreenshotFrame>
  );
}

function BuilderScreenshot() {
  return (
    <ScreenshotFrame label="Builder">
      <div className="grid gap-4 md:grid-cols-[1fr_0.85fr]">
        <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-white">Personal Details</p>
            <span className="rounded-lg bg-violet-400/12 px-2 py-1 text-[10px] font-black text-violet-200">Editing</span>
          </div>
          <div className="grid gap-2">
            <div className="h-9 rounded-lg bg-white/[0.07]" />
            <div className="h-9 rounded-lg bg-white/[0.07]" />
            <div className="h-20 rounded-lg bg-white/[0.07]" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-300 px-2.5 py-2 text-xs font-black text-slate-950">
              <Save size={13} />
              Save
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-2.5 py-2 text-xs font-black text-white">
              <Sparkles size={13} />
              AI refine
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-100 p-3 shadow-xl shadow-black/20">
          <div className="rounded-lg bg-white p-3 text-slate-900">
            <div className="h-5 w-32 rounded bg-slate-900" />
            <div className="mt-2 h-2 w-44 rounded bg-slate-300" />
            <div className="mt-5 grid gap-2">
              <div className="h-2 rounded bg-slate-300" />
              <div className="h-2 rounded bg-slate-300" />
              <div className="h-2 w-3/4 rounded bg-slate-300" />
            </div>
            <div className="mt-5 h-16 rounded bg-violet-100" />
          </div>
        </div>
      </div>
    </ScreenshotFrame>
  );
}

function TemplatesScreenshot() {
  return (
    <ScreenshotFrame label="Templates and pricing">
      <div className="grid gap-3 sm:grid-cols-3">
        {['Classic', 'Tech', 'Creative'].map((template, index) => (
          <div key={template} className="rounded-xl border border-white/10 bg-slate-950/80 p-3">
            <div className={`h-28 rounded-lg ${index === 0 ? 'bg-slate-200' : index === 1 ? 'bg-cyan-100' : 'bg-violet-100'}`} />
            <p className="mt-3 text-sm font-black text-white">{template}</p>
            <p className="text-xs font-semibold text-slate-500">{index === 0 ? 'Free' : 'Premium'}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-300/15 text-emerald-200">
            <Crown size={16} />
          </span>
          <div>
            <p className="text-sm font-black text-white">Upgrade only when you need more</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
              Free is enough to try the builder. Paid plans unlock more saved CVs, premium templates, and higher download access.
            </p>
          </div>
        </div>
      </div>
    </ScreenshotFrame>
  );
}

const guideSections: GuideSection[] = [
  {
    eyebrow: 'Step 1',
    title: 'Use the dashboard as your control room',
    copy: 'The dashboard is where you check saved CVs, recent activity, and your current progress. Keep one master CV for your full career history, then edit copies for specific jobs when needed.',
    points: [
      'Create New CV starts a fresh document or import flow.',
      'Recent CVs shows the latest saved work so you can continue quickly.',
      'Edit opens the same builder view, so there is no separate download-only flow to manage.',
    ],
    visual: <DashboardScreenshot />,
  },
  {
    eyebrow: 'Step 2',
    title: 'Build content first, polish second',
    copy: 'A strong CV starts with accurate details. Add your experience, education, skills, projects, and contact information before spending too much time on design. After the structure is complete, use AI carefully to improve clarity.',
    points: [
      'Write short, direct bullet points focused on outcomes.',
      'Use AI as a helper, then review every sentence manually.',
      'Save regularly so your latest version appears in My CVs.',
    ],
    visual: <BuilderScreenshot />,
  },
  {
    eyebrow: 'Step 3',
    title: 'Choose templates and plans with balance',
    copy: 'Templates help your CV look professional, but the content still matters most. Start simple, check readability, then choose a premium template only when it improves the final presentation.',
    points: [
      'Free templates are good for testing and basic CV creation.',
      'Premium templates are useful when you want a more polished final PDF.',
      'Pricing is separated by local and global checkout so users see the relevant currency.',
    ],
    visual: <TemplatesScreenshot />,
  },
];

export default function TipsAndResources() {
  useLayoutEffect(() => {
    clearPageScrollLock();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <AppShellHeader />
      <div className="lg:flex lg:h-dvh lg:overflow-hidden">
        <AppSidebar />
        <main className="scrollbar-hide mx-auto min-w-0 max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pb-32 sm:pt-10 lg:h-dvh lg:overflow-y-auto lg:px-8 lg:pb-12">
          <section className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-500/10 px-3 py-1.5 text-xs font-black uppercase text-violet-200">
                <BookOpen size={15} />
                NexCV app guide
              </div>
              <h1 className="max-w-4xl font-montserrat text-3xl font-black leading-tight text-white sm:text-5xl">
                How to use NexCV from first draft to final PDF
              </h1>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-400 sm:text-base sm:leading-7">
                This guide explains the app workflow in a practical way: what each main area does, when to use AI, how to keep your saved CVs organized, and how to download only after checking the final preview.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-200 ring-1 ring-emerald-200/20">
                  <Lightbulb size={18} />
                </span>
                <div>
                  <p className="text-sm font-black text-emerald-100">Best habit</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-emerald-50/75">
                    Build once, review twice, download last. That keeps the final PDF clean and avoids wasting time on repeated exports.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickSteps.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200 ring-1 ring-violet-300/15">
                    <Icon size={18} />
                  </span>
                  <h2 className="mt-4 font-montserrat text-base font-black text-white">{step.title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">{step.text}</p>
                </article>
              );
            })}
          </section>

          <section className="mt-10 grid gap-8">
            {guideSections.map((section, index) => (
              <article key={section.title} className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/15 sm:p-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:p-6">
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-300">{section.eyebrow}</p>
                  <h2 className="mt-2 font-montserrat text-2xl font-black leading-tight text-white sm:text-3xl">{section.title}</h2>
                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-400">{section.copy}</p>
                  <ul className="mt-5 grid gap-3">
                    {section.points.map((point) => (
                      <li key={point} className="flex gap-3 text-sm font-semibold leading-6 text-slate-300">
                        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={17} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>{section.visual}</div>
              </article>
            ))}
          </section>

          <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/12 text-sky-200">
                  <Search size={18} />
                </span>
                <h2 className="font-montserrat text-xl font-black">Before you download</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  'Check spelling, phone number, email, and links.',
                  'Preview the full page and make sure sections do not overflow.',
                  'Use a role-specific title and keep the summary focused.',
                  'Download only after the CV looks correct in the preview.',
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-white/[0.035] p-3 text-sm font-semibold leading-6 text-slate-300">
                    <ShieldCheck className="mt-0.5 shrink-0 text-sky-300" size={16} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200">
                  <Sparkles size={18} />
                </span>
                <h2 className="font-montserrat text-xl font-black">A balanced AI workflow</h2>
              </div>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
                AI is best for cleaning rough wording, creating stronger summaries, and improving bullet points. It should not invent experience, fake numbers, or add skills you cannot explain in an interview.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3">
                  <p className="text-sm font-black text-emerald-100">Good use</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-emerald-50/75">Rewrite unclear sentences and make real achievements sharper.</p>
                </div>
                <div className="rounded-xl border border-red-300/20 bg-red-400/10 p-3">
                  <p className="text-sm font-black text-red-100">Avoid</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-red-50/75">Adding false results, fake roles, or keywords you cannot support.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10 overflow-hidden rounded-2xl border border-violet-300/20 bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(16,185,129,0.12),rgba(255,255,255,0.04))] p-5 shadow-2xl shadow-black/20 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="font-montserrat text-2xl font-black text-white">Ready to continue your CV?</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
                  Open the builder, make the next useful edit, save it, and come back to My CVs whenever you need to manage your versions.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[330px]">
                <Link to="/builder?import=1" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500 active:scale-[0.98]">
                  <Upload size={16} />
                  Open builder
                </Link>
                <Link to="/my-cvs" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-white transition hover:bg-white/12 active:scale-[0.98]">
                  My CVs
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function ScreenshotFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </div>
        <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}
