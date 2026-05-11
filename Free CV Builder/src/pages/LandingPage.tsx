import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Download, FileText, Info, LayoutTemplate, Mail, Menu, Palette, Quote, Shield, Sparkles, Star, Wand2, X, Zap } from 'lucide-react';

const stats = [
  { label: 'CVs Created', value: 12800, suffix: '+', color: 'from-violet-400 to-violet-600' },
  { label: 'Active Users', value: 4300, suffix: '+', color: 'from-emerald-400 to-emerald-600' },
  { label: 'Templates Available', value: 3, suffix: '', color: 'from-violet-400 to-emerald-400' },
];

function useCountUp(target: number, duration = 2200, started: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let startTime: number | null = null;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(easeOut(progress) * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, started]);
  return count;
}

function StatCard({ label, value, suffix, color }: typeof stats[0]) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const count = useCountUp(value, 2400, started);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="landing-scroll-reveal flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-8 backdrop-blur-sm sm:py-10">
      <span className={`bg-linear-to-br ${color} bg-clip-text font-montserrat text-5xl font-black text-transparent sm:text-6xl`}>
        {count.toLocaleString()}{suffix}
      </span>
      <span className="text-sm font-bold uppercase tracking-widest text-slate-400">{label}</span>
    </div>
  );
}

const templates = [
  { name: 'Professional', src: '/templates/professional.png' },
  { name: 'Modern', src: '/templates/modern.png' },
  { name: 'Classic', src: '/templates/classic.png' },
];

const featureTiles = [
  { icon: Wand2, title: 'AI polish', text: 'Improve rough content fast.', tone: 'emerald' },
  { icon: Palette, title: 'Design control', text: 'Tune colors, fonts, and layout.', tone: 'violet' },
  { icon: FileText, title: 'Live preview', text: 'See edits as you build.', tone: 'emerald' },
  { icon: Download, title: 'PDF export', text: 'Download a clean final resume.', tone: 'violet' },
];

const testimonials = [
  {
    name: 'Amaya Silva',
    role: 'Marketing Executive',
    quote: 'NexCV helped me turn messy notes into a clean resume in one sitting.',
    color: 'bg-violet-600',
    rating: 5,
  },
  {
    name: 'Ravindu Perera',
    role: 'Software Engineer',
    quote: 'The live preview made it easy to tune the layout before exporting.',
    color: 'bg-emerald-600',
    rating: 5,
  },
  {
    name: 'Nethmi Fernando',
    role: 'Graduate Trainee',
    quote: 'Simple, fast, and the final PDF looked much more professional.',
    color: 'bg-violet-600',
    rating: 5,
  },
];

const steps = [
  { title: 'Write', label: 'AI content', icon: Wand2, color: 'text-violet-300', bg: 'bg-violet-500/15' },
  { title: 'Style', label: 'Live design', icon: Palette, color: 'text-emerald-300', bg: 'bg-emerald-400/15' },
  { title: 'Export', label: 'PDF ready', icon: Download, color: 'text-violet-300', bg: 'bg-violet-500/15' },
];

const faqs = [
  {
    question: 'Is NexCV free to use?',
    answer: 'Yes. You can build, preview, and download your CV without paying.',
  },
  {
    question: 'Can AI help improve my CV content?',
    answer: 'Yes. The builder can polish rough notes into clearer resume wording while you stay in control of every section.',
  },
  {
    question: 'Can I change templates after adding details?',
    answer: 'Yes. Your information stays in the builder, so you can switch between available templates and adjust the design.',
  },
  {
    question: 'Does the final CV download as a PDF?',
    answer: 'Yes. Once your CV is ready, you can export a clean PDF for job applications.',
  },
  {
    question: 'Do I need design experience?',
    answer: 'No. NexCV gives you ready-made templates, live preview, and simple controls for colors, fonts, and layout.',
  },
];

export default function LandingPage() {
  useEffect(() => {
    const revealItems = document.querySelectorAll<HTMLElement>('.landing-scroll-reveal');
    if (!revealItems.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lock scroll when mobile menu is open (works on iOS Safari too)
  useEffect(() => {
    if (mobileMenuOpen) {
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-svh overflow-x-hidden bg-slate-950 text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 shadow-sm shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" onClick={closeMobileMenu}>
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-950 shadow-lg shadow-violet-900/20 sm:h-11 sm:w-11">
              <img src="/brand/faviconblack.png" alt="" className="h-8 w-8 rounded-xl sm:h-9 sm:w-9" />
            </span>
            <span className="font-montserrat text-xl font-black text-white sm:text-2xl">NexCV</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-300 md:flex">
            <a href="#templates" className="transition-colors hover:text-white">Templates</a>
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#faq" className="transition-colors hover:text-white">FAQ</a>
            <Link to="/about" className="transition-colors hover:text-white">About</Link>
          </nav>

          {/* Desktop CTA */}
          <Link
            to="/builder"
            className="hidden md:inline-flex items-center justify-center rounded-xl bg-violet-600 px-3.5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-violet-600/25 transition-all hover:bg-violet-500 active:scale-[0.98] sm:px-4"
          >
            Start
            <ArrowRight size={17} className="ml-1.5" />
          </Link>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-white transition-all hover:bg-white/12 active:scale-95"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span
              className="relative flex h-5 w-5 items-center justify-center"
              style={{ transition: 'transform 0.3s' }}
            >
              <Menu
                size={20}
                className="absolute transition-all duration-300"
                style={{ opacity: mobileMenuOpen ? 0 : 1, transform: mobileMenuOpen ? 'rotate(90deg) scale(0.5)' : 'rotate(0deg) scale(1)' }}
              />
              <X
                size={20}
                className="absolute transition-all duration-300"
                style={{ opacity: mobileMenuOpen ? 1 : 0, transform: mobileMenuOpen ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.5)' }}
              />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer — full screen slide-in */}
      <div
        className="fixed inset-0 z-40 md:hidden"
        style={{
          pointerEvents: mobileMenuOpen ? 'auto' : 'none',
        }}
        aria-hidden={!mobileMenuOpen}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          style={{
            opacity: mobileMenuOpen ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          onClick={closeMobileMenu}
        />

        {/* Drawer panel */}
        <nav
          className="absolute inset-x-0 top-16 mx-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40"
          style={{
            transform: mobileMenuOpen ? 'translateY(0) scale(1)' : 'translateY(-16px) scale(0.97)',
            opacity: mobileMenuOpen ? 1 : 0,
            transition: 'transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.22s ease',
          }}
        >
          {/* Accent bar */}
          <div className="h-1 w-full bg-linear-to-r from-violet-600 to-emerald-500" />

          <div className="p-4 flex flex-col gap-1">
            {[
              { label: 'Templates', href: '#templates', icon: LayoutTemplate, delay: '0ms', isLink: false },
              { label: 'Features', href: '#features', icon: Zap, delay: '50ms', isLink: false },
              { label: 'FAQ', href: '#faq', icon: Info, delay: '100ms', isLink: false },
              { label: 'About', href: '/about', icon: Info, delay: '150ms', isLink: true },
            ].map(({ label, href, icon: Icon, delay, isLink }) => (
              isLink ? (
                <Link
                  key={label}
                  to={href}
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-200 transition-all hover:bg-white/[0.07] hover:text-white active:scale-[0.98]"
                  style={{
                    transitionDelay: mobileMenuOpen ? delay : '0ms',
                    transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-12px)',
                    opacity: mobileMenuOpen ? 1 : 0,
                    transition: `transform 0.35s cubic-bezier(0.22,1,0.36,1) ${delay}, opacity 0.25s ease ${delay}, background 0.15s`,
                  }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/6">
                    <Icon size={15} className="text-violet-400" />
                  </span>
                  {label}
                </Link>
              ) : (
                <a
                  key={label}
                  href={href}
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-200 transition-all hover:bg-white/[0.07] hover:text-white active:scale-[0.98]"
                  style={{
                    transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-12px)',
                    opacity: mobileMenuOpen ? 1 : 0,
                    transition: `transform 0.35s cubic-bezier(0.22,1,0.36,1) ${delay}, opacity 0.25s ease ${delay}, background 0.15s`,
                  }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/6">
                    <Icon size={15} className="text-violet-400" />
                  </span>
                  {label}
                </a>
              )
            ))}

            {/* Divider */}
            <div className="my-2 border-t border-white/8" />

            {/* Legal & Contact links */}
            {[
              { label: 'Contact Us', href: '/contact', icon: Mail, delay: '150ms' },
              { label: 'Privacy Policy', href: '/privacy-policy', icon: Shield, delay: '200ms' },
              { label: 'Terms & Conditions', href: '/terms', icon: FileText, delay: '250ms' },
            ].map(({ label, href, icon: Icon, delay }) => (
              <Link
                key={label}
                to={href}
                onClick={closeMobileMenu}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200 active:scale-[0.98]"
                style={{
                  transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-12px)',
                  opacity: mobileMenuOpen ? 1 : 0,
                  transition: `transform 0.35s cubic-bezier(0.22,1,0.36,1) ${delay}, opacity 0.25s ease ${delay}, background 0.15s`,
                }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/4">
                  <Icon size={13} className="text-slate-500" />
                </span>
                {label}
              </Link>
            ))}

            {/* CTA */}
            <Link
              to="/builder"
              onClick={closeMobileMenu}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-[0.98]"
              style={{
                transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-12px)',
                opacity: mobileMenuOpen ? 1 : 0,
                transition: `transform 0.35s cubic-bezier(0.22,1,0.36,1) 150ms, opacity 0.25s ease 150ms, background 0.15s`,
              }}
            >
              Create My CV
              <ArrowRight size={17} />
            </Link>

            {/* Version badge */}
            <p
              className="mt-2 text-center text-[10px] text-slate-500"
              style={{
                opacity: mobileMenuOpen ? 1 : 0,
                transition: 'opacity 0.3s ease 300ms',
              }}
            >
              NexCV v{__APP_VERSION__}
            </p>
          </div>
        </nav>
      </div>

      <main>
        <section className="landing-hero relative min-h-svh overflow-hidden pt-16 md:min-h-[94svh]">
          <div className="absolute inset-0">
            <div className="landing-color-wash absolute -left-24 top-20 h-80 w-80 rounded-full bg-violet-500/24 blur-3xl" />
            <div className="landing-color-wash landing-color-wash-two absolute bottom-10 right-1/3 h-72 w-72 rounded-full bg-emerald-400/18 blur-3xl" />
            <img
              src="/templates/professional.png"
              alt=""
              className="landing-hero-sheet landing-hero-sheet-main absolute right-[6%] top-[10%] hidden h-[74svh] max-h-[760px] min-h-[520px] w-auto object-contain md:block"
            />
            <img
              src="/templates/modern.png"
              alt=""
              className="landing-hero-sheet landing-hero-sheet-left absolute right-[35%] top-[18%] hidden h-[58svh] max-h-[610px] min-h-[420px] w-auto object-contain opacity-80 lg:block"
            />
            <img
              src="/templates/classic.png"
              alt=""
              className="landing-hero-sheet landing-hero-sheet-mobile absolute left-1/2 top-24 h-[54svh] max-h-[520px] min-h-[330px] w-auto -translate-x-1/2 object-contain opacity-[0.13] md:hidden"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#020617_0%,#020617_36%,rgba(2,6,23,0.84)_63%,rgba(2,6,23,0.32)_100%)]" />
          </div>

          <div className="relative z-10 mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center px-4 py-10 sm:px-6 md:min-h-[calc(94svh-4rem)] lg:grid-cols-[0.88fr_1fr] lg:px-8">
            <div className="max-w-2xl">
              <div className="landing-reveal mb-5 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs font-extrabold text-violet-200 shadow-sm backdrop-blur sm:mb-6 sm:text-sm">
                <Sparkles size={16} className="text-violet-300" />
                Free AI resume builder
              </div>

              <h1 className="landing-reveal max-w-2xl font-montserrat text-4xl font-black leading-[0.98] text-white min-[390px]:text-5xl sm:text-6xl sm:leading-[0.94] lg:text-7xl">
                AI CV Builder <span className="text-violet-300">that pops</span>
              </h1>

              <p className="landing-reveal mt-5 max-w-xl text-base font-semibold leading-7 text-slate-300 sm:mt-6 sm:text-lg sm:leading-8">
                Write, style, preview, and download a polished resume without starting from a blank page.
              </p>

              <div className="landing-reveal mt-7 grid gap-3 sm:mt-8 sm:flex sm:flex-row">
                <Link
                  to="/builder"
                  className="inline-flex items-center justify-center rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-violet-600/30 transition-all hover:bg-violet-500 active:scale-[0.98] sm:px-6 sm:py-4 sm:text-base"
                >
                  Create CV
                  <ArrowRight size={20} className="ml-2" />
                </Link>
                <a
                  href="#templates"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-5 py-3.5 text-sm font-extrabold text-white backdrop-blur transition-all hover:bg-white/10 active:scale-[0.98] sm:px-6 sm:py-4 sm:text-base"
                >
                  See Templates
                </a>
              </div>

              <div className="landing-reveal mt-7 grid max-w-2xl gap-2.5 sm:mt-9 sm:grid-cols-3 sm:gap-3">
                {steps.map(({ title, label, icon: Icon, color, bg }, index) => (
                  <div key={title} className="landing-workflow-card group relative overflow-hidden rounded-2xl border border-white/10 bg-white/7 p-3.5 shadow-xl shadow-black/20 backdrop-blur sm:p-4">
                    <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#7c3aed,#10b981)] opacity-70" />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className={`text-sm font-black ${color}`}>0{index + 1}</div>
                        <div className="mt-1 font-montserrat text-lg font-black text-white sm:text-xl">{title}</div>
                        <div className="mt-1 text-xs font-bold text-slate-400">{label}</div>
                      </div>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${bg} ${color} transition-transform group-hover:scale-110 group-hover:rotate-3 sm:h-11 sm:w-11`}>
                        <Icon size={20} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Counter Section ── */}
        <section className="relative overflow-hidden bg-slate-900 py-12 sm:py-16">
          <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-violet-500/12 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center landing-scroll-reveal">
              <p className="text-sm font-black uppercase tracking-widest text-violet-400">By the Numbers</p>
              <h2 className="mt-3 font-montserrat text-2xl font-black text-white sm:text-4xl">
                Trusted by resume builders
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
              {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="relative overflow-hidden bg-slate-950 py-12 text-white sm:py-20">
          <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div className="landing-scroll-reveal">
                <p className="text-sm font-black uppercase text-emerald-300">Features</p>
                <h2 className="mt-3 max-w-xl font-montserrat text-2xl font-black leading-tight min-[390px]:text-3xl sm:text-5xl">
                  Less typing. More finished resume.
                </h2>
                <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-bold text-slate-200 sm:mt-7">
                  <Zap size={18} className="text-emerald-300" />
                  Smart tools, clean controls, fast export
                </div>
              </div>

              <div className="landing-feature-orbit grid gap-4 sm:grid-cols-2">
                {featureTiles.map(({ icon: Icon, title, text, tone }, index) => (
                  <article
                    key={title}
                    className={`landing-scroll-reveal landing-feature-tile landing-tone-${tone} group rounded-2xl border border-white/10 bg-white/7 p-4 backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/11 sm:p-5`}
                    style={{ '--scroll-delay': `${index * 100}ms` } as React.CSSProperties}
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 transition-transform group-hover:scale-110 sm:mb-5 sm:h-12 sm:w-12">
                      <Icon size={22} />
                    </div>
                    <h3 className="font-montserrat text-xl font-black">{title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{text}</p>
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <span className="landing-bar block h-full rounded-full" />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="templates" className="bg-slate-900 py-12 text-white sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="landing-scroll-reveal flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black uppercase text-violet-700">Templates</p>
                <h2 className="mt-3 font-montserrat text-2xl font-black min-[390px]:text-3xl sm:text-5xl">Pick a look and keep moving</h2>
              </div>
              <Link to="/builder" className="inline-flex items-center text-sm font-black text-violet-700 hover:text-violet-600">
                Open builder <ArrowRight size={17} className="ml-1.5" />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-3 md:gap-5">
              {templates.map((template, index) => (
                <Link
                  to={`/builder?template=${template.name.toLowerCase()}`}
                  key={template.name}
                  className="landing-scroll-reveal landing-template-card group overflow-hidden rounded-2xl border border-white/10 bg-white/6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/20"
                  style={{ '--scroll-delay': `${index * 120}ms` } as React.CSSProperties}
                >
                  <div className="aspect-4/5 overflow-hidden bg-slate-800">
                    <img
                      src={template.src}
                      alt={`${template.name} CV template preview`}
                      className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.035]"
                    />
                  </div>
                  <div className="flex items-center justify-between px-5 py-4">
                    <span className="font-montserrat font-black text-white">{template.name}</span>
                    <ArrowRight size={18} className="text-violet-300 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-950 py-12 text-white sm:py-20">
          <div className="absolute left-10 top-10 h-60 w-60 rounded-full bg-violet-500/14 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-400/12 blur-3xl" />
          <div id="faq" className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="landing-scroll-reveal text-center">
              <p className="text-sm font-black uppercase text-violet-300">FAQ</p>
              <h2 className="mt-3 font-montserrat text-2xl font-black min-[390px]:text-3xl sm:text-5xl">Questions before you start?</h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-300 sm:text-base sm:leading-7">
                Quick answers about creating, styling, and exporting your CV with NexCV.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:mt-10">
              {faqs.map((faq, index) => (
                <details
                  key={faq.question}
                  className="landing-scroll-reveal landing-faq-item group rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur transition-all open:border-violet-300/30 open:bg-white/9 sm:p-5"
                  style={{ '--scroll-delay': `${index * 80}ms` } as React.CSSProperties}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-montserrat text-base font-black text-white marker:hidden sm:text-lg">
                    <span>{faq.question}</span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 text-violet-300 transition-transform group-open:rotate-180">
                      <ChevronDown size={18} />
                    </span>
                  </summary>
                  <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 sm:text-base sm:leading-7">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-950 py-12 text-white sm:py-20">
          <div className="absolute left-10 top-10 h-60 w-60 rounded-full bg-violet-500/14 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-400/12 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="landing-scroll-reveal flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black uppercase text-emerald-700">Testimonials</p>
                <h2 className="mt-3 font-montserrat text-2xl font-black min-[390px]:text-3xl sm:text-5xl">Loved by resume builders</h2>
              </div>
              <div className="inline-flex w-fit items-center gap-1 rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-sm font-black text-violet-200">
                {[...Array(5)].map((_, index) => (
                  <Star key={index} size={16} className="fill-current" />
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-3 md:gap-5">
              {testimonials.map((testimonial, index) => (
                <article
                  key={testimonial.name}
                  className="landing-scroll-reveal landing-testimonial-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/6 p-5 shadow-xl shadow-black/10 sm:p-6"
                  style={{ '--scroll-delay': `${index * 120}ms` } as React.CSSProperties}
                >
                  <div className={`absolute inset-x-0 top-0 h-1.5 ${testimonial.color}`} />
                  <Quote size={30} className="text-violet-300/40" />
                  <p className="mt-5 text-base font-bold leading-7 text-slate-200">"{testimonial.quote}"</p>
                  <div className="mt-4 flex items-center gap-1 text-amber-400">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} size={14} className="fill-current" />
                    ))}
                  </div>
                  <div className="mt-6 flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${testimonial.color} font-montserrat text-lg font-black text-white shadow-lg`}>
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-montserrat font-black text-white">{testimonial.name}</div>
                      <div className="text-sm font-bold text-slate-400">{testimonial.role}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
