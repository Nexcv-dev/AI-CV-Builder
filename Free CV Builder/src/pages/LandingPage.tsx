import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Crown, Download, FileText, Home, Info, LayoutTemplate, LogIn, Mail, Menu, Palette, Quote, Shield, Sparkles, Star, Upload, Wand2, X, Zap } from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { useTemplateConfig } from '../hooks/useTemplateConfig';
import { usePublicContent } from '../hooks/usePublicContent';
import { apiFetch } from '../utils/api';

type StatItem = {
  label: string;
  value: number;
  suffix: string;
  color: string;
};

const baseStats: StatItem[] = [
  { label: 'CVs Created', value: 12800, suffix: '+', color: 'from-violet-400 to-violet-600' },
  { label: 'Active Users', value: 4300, suffix: '+', color: 'from-emerald-400 to-emerald-600' },
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

function StatCard({ label, value, suffix, color }: StatItem) {
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

function TemplateAccessBadge({ access }: { access: 'free' | 'paid' }) {
  if (access === 'free') {
    return (
      <span className="absolute right-3 top-3 z-10 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/70">
        Free
      </span>
    );
  }

  return (
    <span className="absolute right-3 top-3 z-10 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-amber-400 px-2 text-amber-950 shadow-lg shadow-amber-400/30 ring-1 ring-white/70" aria-label="Premium template">
      <Crown size={15} strokeWidth={2.6} />
    </span>
  );
}

const pricingPlans = [
  {
    key: 'free',
    name: 'Free',
    price: 'LKR 0',
    duration: 'Starter',
    description: 'Build your first CV and export once with a watermark.',
    icon: FileText,
    href: '/builder?import=1',
    cta: 'Start free',
    badge: '',
    highlighted: false,
    features: ['1 saved CV', 'Classic template', '1 watermarked PDF download', 'Manual editing tools'],
  },
  {
    key: 'payg',
    name: 'Pay As You Go',
    price: 'LKR 499',
    duration: '7 days (One-time payment)',
    description: 'One CV with any template, AI tools, unlimited edits and downloads.',
    icon: Zap,
    href: '/pricing',
    cta: 'Choose PAYG',
    badge: 'Popular',
    highlighted: true,
    features: ['1 extra saved CV per purchase', 'Any template', 'Unlimited edits for 7 days', 'Unlimited downloads for 7 days', 'Faster warm PDF downloads', 'AI import, summary, and refine tools'],
  },
  {
    key: 'monthly',
    name: 'Monthly',
    price: 'LKR 2199',
    duration: '30 days (One-time payment)',
    description: 'Unlimited CV creation, saves, downloads, and AI features.',
    icon: Crown,
    href: '/pricing',
    cta: 'Go monthly',
    badge: '',
    highlighted: false,
    features: ['Unlimited CV creation', 'Unlimited saved CVs', 'Any template', 'Unlimited downloads for 30 days', 'Faster warm PDF downloads', 'AI import, summary, and refine tools'],
  },
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
  const location = useLocation();
  const cmsContent = usePublicContent();
  const { templates } = useTemplateConfig();
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0);
  const [centeredTemplateIndex, setCenteredTemplateIndex] = useState(0);
  const featuredTemplates = useMemo(() => (
    [...templates].sort((a, b) => {
      const sourceRank = Number(b.source === 'custom') - Number(a.source === 'custom');
      if (sourceRank !== 0) return sourceRank;
      return a.label.localeCompare(b.label);
    })
  ), [templates]);
  const carouselTemplates = useMemo(() => (
    featuredTemplates.length
      ? [...featuredTemplates, ...featuredTemplates, ...featuredTemplates]
      : []
  ), [featuredTemplates]);
  const stats = useMemo<StatItem[]>(() => [
    ...baseStats,
    { label: 'Templates Available', value: templates.length, suffix: '', color: 'from-violet-400 to-emerald-400' },
  ], [templates.length]);
  const landing = cmsContent.landing;
  const cmsPricingPlans = useMemo(() => pricingPlans.map((plan) => {
    const copy = cmsContent.pricingPlans.find((item) => item.key === plan.key);
    return copy ? { ...plan, ...copy } : plan;
  }), [cmsContent.pricingPlans]);
  const cmsFeatureTiles = useMemo(() => featureTiles.map((tile, index) => ({
    ...tile,
    ...(cmsContent.featureTiles[index] || {}),
  })), [cmsContent.featureTiles]);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'login' | 'signup' }>({
    isOpen: false,
    mode: 'signup',
  });
  
  const [planPrices, setPlanPrices] = useState<Record<string, {
    cents: number;
    baseAmountCents: number;
    promotionActive: boolean;
    promotionLabel?: string;
    discountBadge?: string;
    currency: string;
  }> | null>(null);

  useEffect(() => {
    let ignore = false;
    apiFetch<{ plans: Array<{ plan: string; cents: number; baseAmountCents: number; promotionActive: boolean; promotionLabel?: string; discountBadge?: string; currency: string }> }>('/api/billing/plans')
      .then((data) => {
        if (!ignore) {
          setPlanPrices(data.plans.reduce((acc, plan) => ({ ...acc, [plan.plan]: plan }), {} as Record<string, {
            cents: number;
            baseAmountCents: number;
            promotionActive: boolean;
            promotionLabel?: string;
            discountBadge?: string;
            currency: string;
          }>));
        }
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  const formatPrice = (cents: number, currency = 'LKR') => `${currency} ${new Intl.NumberFormat().format(Math.round(cents / 100))}`;

  useEffect(() => {
    if (activeTemplateIndex >= featuredTemplates.length) {
      setActiveTemplateIndex(Math.max(featuredTemplates.length - 1, 0));
    }
  }, [activeTemplateIndex, featuredTemplates.length]);
  useEffect(() => {
    if (centeredTemplateIndex >= featuredTemplates.length) {
      setCenteredTemplateIndex(Math.max(featuredTemplates.length - 1, 0));
    }
  }, [centeredTemplateIndex, featuredTemplates.length]);

  const templateScaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (templateScaleTimerRef.current) clearTimeout(templateScaleTimerRef.current);
  }, []);

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthModal({ isOpen: true, mode });
  };
  const closeAuthModal = () => {
    setAuthModal((current) => ({ ...current, isOpen: false }));
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const revealItems = document.querySelectorAll<HTMLElement>('.landing-scroll-reveal');
    if (!revealItems.length) return;

    const isMobileViewport = window.matchMedia('(max-width: 767px)').matches;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: isMobileViewport ? 0.08 : 0.16,
        rootMargin: isMobileViewport ? '0px 0px 12% 0px' : '0px 0px -8% 0px',
      }
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
  const shouldCloseBeforeNavigate = (href: string) => href.startsWith('#') || (href === '/' && location.pathname === '/');
  const scrollTemplateCarousel = (direction: 'previous' | 'next') => {
    if (!featuredTemplates.length) return;
    setActiveTemplateIndex((current) => {
      const nextIndex = direction === 'next'
        ? (current + 1) % featuredTemplates.length
        : (current - 1 + featuredTemplates.length) % featuredTemplates.length;

      if (templateScaleTimerRef.current) clearTimeout(templateScaleTimerRef.current);
      setCenteredTemplateIndex(-1);
      templateScaleTimerRef.current = setTimeout(() => {
        setCenteredTemplateIndex(nextIndex);
      }, 520);
      return nextIndex;
    });
  };

  return (
    <div className="overflow-x-hidden bg-slate-950 text-white">
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
            <Link to="/templates" className="transition-colors hover:text-white">Templates</Link>
            <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
            <Link to="/tips" className="transition-colors hover:text-white">Tips</Link>
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#faq" className="transition-colors hover:text-white">FAQ</a>
            <Link to="/about" className="transition-colors hover:text-white">About</Link>
          </nav>

          {/* Desktop Auth */}
          <div className="hidden items-center md:flex">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-white/10 transition-all hover:bg-slate-100 active:scale-[0.98]"
            >
              <LogIn size={16} />
              Login
            </button>
          </div>

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
              { label: 'Home', href: '/', icon: Home, delay: '0ms', isLink: true },
              { label: 'Templates', href: '/templates', icon: LayoutTemplate, delay: '50ms', isLink: true },
              { label: 'Pricing', href: '#pricing', icon: Crown, delay: '100ms', isLink: false },
              { label: 'Features', href: '#features', icon: Zap, delay: '200ms', isLink: false },
              { label: 'FAQ', href: '#faq', icon: Info, delay: '250ms', isLink: false },
              { label: 'About', href: '/about', icon: Info, delay: '300ms', isLink: true },
            ].map(({ label, href, icon: Icon, delay, isLink }) => (
              isLink ? (
                <Link
                  key={label}
                  to={href}
                  onClick={shouldCloseBeforeNavigate(href) ? closeMobileMenu : undefined}
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
            <div
              className="grid grid-cols-3 gap-2"
              style={{
                transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(8px)',
                opacity: mobileMenuOpen ? 1 : 0,
                transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1) 150ms, opacity 0.25s ease 150ms',
              }}
            >
              {[
                { label: 'Contact', href: '/contact', icon: Mail },
                { label: 'Privacy', href: '/privacy-policy', icon: Shield },
                { label: 'Terms', href: '/terms', icon: FileText },
              ].map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  to={href}
                  className="flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2 py-3 text-center text-[11px] font-bold text-slate-400 transition-all hover:bg-white/7 hover:text-slate-200 active:scale-[0.98]"
                >
                  <Icon size={15} className="text-slate-500" />
                  <span className="max-w-full truncate">{label}</span>
                </Link>
              ))}
            </div>

            {/* Auth actions */}
            <div
              className="grid"
              style={{
                transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-12px)',
                opacity: mobileMenuOpen ? 1 : 0,
                transition: `transform 0.35s cubic-bezier(0.22,1,0.36,1) 150ms, opacity 0.25s ease 150ms, background 0.15s`,
              }}
            >
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-white/10 transition-all hover:bg-slate-100 active:scale-[0.98]"
              >
                <LogIn size={16} />
                Login
              </button>
            </div>

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
                {landing.heroEyebrow}
              </div>

              <h1 className="landing-reveal max-w-2xl font-montserrat text-4xl font-black leading-[0.98] text-white min-[390px]:text-5xl sm:text-6xl sm:leading-[0.94] lg:text-7xl">
                {landing.heroTitle} {landing.heroAccent && <span className="text-violet-300">{landing.heroAccent}</span>}
              </h1>

              <p className="landing-reveal mt-5 max-w-xl text-base font-semibold leading-7 text-slate-300 sm:mt-6 sm:text-lg sm:leading-8">
                {landing.heroDescription}
              </p>

              <div className="landing-reveal mt-7 grid gap-3 sm:mt-8 sm:flex sm:flex-row">
                <Link
                  to="/builder?import=1"
                  className="inline-flex items-center justify-center rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-violet-600/30 transition-all hover:bg-violet-500 active:scale-[0.98] sm:px-6 sm:py-4 sm:text-base"
                >
                  {landing.primaryCta}
                  <ArrowRight size={20} className="ml-2" />
                </Link>
                <Link
                  to="/builder?import=1"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-5 py-3.5 text-sm font-extrabold text-white backdrop-blur transition-all hover:bg-white/10 active:scale-[0.98] sm:px-6 sm:py-4 sm:text-base"
                >
                  <Upload size={19} className="mr-2" />
                  {landing.secondaryCta}
                </Link>
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
              <p className="text-sm font-black uppercase tracking-widest text-violet-400">{landing.statsEyebrow}</p>
              <h2 className="mt-3 font-montserrat text-2xl font-black text-white sm:text-4xl">
                {landing.statsTitle}
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
                <p className="text-sm font-black uppercase text-emerald-300">{landing.featuresEyebrow}</p>
                <h2 className="mt-3 max-w-xl font-montserrat text-2xl font-black leading-tight min-[390px]:text-3xl sm:text-5xl">
                  {landing.featuresTitle}
                </h2>
                <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-bold text-slate-200 sm:mt-7">
                  <Zap size={18} className="text-emerald-300" />
                  {landing.featuresBadge}
                </div>
              </div>

              <div className="landing-feature-orbit grid gap-4 sm:grid-cols-2">
                {cmsFeatureTiles.map(({ icon: Icon, title, text, tone }, index) => (
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

        <section id="templates" className="relative overflow-hidden bg-slate-50 py-12 text-slate-900 sm:py-18">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <div className="landing-scroll-reveal">
              <p className="text-sm font-black uppercase tracking-widest text-sky-600">{landing.templatesEyebrow}</p>
              <h2 className="mt-3 font-montserrat text-2xl font-black min-[390px]:text-3xl sm:text-5xl">{landing.templatesTitle}</h2>
              <p className="mx-auto mt-4 max-w-3xl text-base font-semibold text-slate-500 sm:text-xl">
                {landing.templatesDescription}
              </p>
            </div>
          </div>

          <div
            className="relative mt-9 overflow-hidden sm:mt-12"
            style={{
              '--template-card-width': 'clamp(210px, 20vw, 265px)',
              '--template-card-gap': '20px',
            } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => scrollTemplateCarousel('previous')}
              className="absolute left-3 top-[50%] z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 active:scale-95 sm:left-6 sm:h-12 sm:w-12"
              aria-label="Previous template"
            >
              <ChevronLeft size={21} />
            </button>
            <button
              type="button"
              onClick={() => scrollTemplateCarousel('next')}
              className="absolute right-3 top-[50%] z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 active:scale-95 sm:right-6 sm:h-12 sm:w-12"
              aria-label="Next template"
            >
              <ChevronRight size={21} />
            </button>

            <div
              className="flex pb-12 pt-5 transition-transform duration-500 ease-out"
              style={{
                gap: 'var(--template-card-gap)',
                transform: `translateX(calc(50vw - (var(--template-card-width) / 2) - ${activeTemplateIndex + featuredTemplates.length} * (var(--template-card-width) + var(--template-card-gap))))`,
              }}
              onWheel={(event) => event.preventDefault()}
              onTouchMove={(event) => event.preventDefault()}
            >
              {carouselTemplates.map((template, index) => {
                const originalIndex = featuredTemplates.length ? index % featuredTemplates.length : index;
                const centerIndex = centeredTemplateIndex >= 0
                  ? centeredTemplateIndex + featuredTemplates.length
                  : -1;
                return (
                <Link
                  to={`/builder?import=1&template=${template.key}`}
                  key={`${template.key}-${index}`}
                  className={`group grid shrink-0 gap-3 text-center transition-transform duration-500 ${
                    index === centerIndex
                      ? 'z-10 scale-105'
                      : 'scale-100'
                  }`}
                  style={{ width: 'var(--template-card-width)' }}
                >
                  <div>
                    <h3 className="inline-flex min-h-7 max-w-full items-center justify-center font-montserrat text-base font-black leading-tight text-slate-800 sm:text-lg">
                      <span>{template.label}</span>
                    </h3>
                  </div>
                  <div className={`relative mx-auto aspect-[210/297] w-full overflow-hidden border bg-white ring-1 transition-shadow duration-300 ${
                    originalIndex === centeredTemplateIndex && index === centerIndex
                      ? 'border-sky-200 shadow-2xl shadow-sky-200/70 ring-sky-200'
                      : 'border-slate-200 shadow-lg shadow-slate-200/60 ring-slate-900/5'
                  }`}>
                    <TemplateAccessBadge access={template.access} />
                    <img
                      src={template.thumbnail}
                      alt={`${template.label} CV template preview`}
                      className="h-full w-full object-cover object-top"
                    />
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="rounded-md bg-sky-500 px-4 py-2.5 text-xs font-black text-white opacity-0 shadow-lg shadow-sky-500/25 group-hover:opacity-100">
                        Use this template
                      </span>
                    </div>
                  </div>
                </Link>
                );
              })}
            </div>

            <div className="text-center">
              <Link to="/templates" className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-300/40 transition hover:bg-slate-800">
                View all templates <ArrowRight size={17} className="ml-1.5" />
              </Link>
            </div>
          </div>
        </section>

        <section id="pricing" className="relative overflow-hidden bg-slate-950 py-12 text-white sm:py-20">
          <div className="absolute left-0 top-8 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-500/16 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="landing-scroll-reveal flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black uppercase text-emerald-300">{landing.pricingEyebrow}</p>
                <h2 className="mt-3 max-w-3xl font-montserrat text-2xl font-black min-[390px]:text-3xl sm:text-5xl">{landing.pricingTitle}</h2>
              </div>
              <Link to="/pricing" className="inline-flex w-fit items-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-[0.98]">
                Compare plans <ArrowRight size={17} className="ml-1.5" />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:mt-10 lg:grid-cols-3">
              {cmsPricingPlans.map((plan, index) => {
                const Icon = plan.icon;
                return (
                  <article
                    key={plan.name}
                    className={`landing-scroll-reveal flex min-h-[420px] flex-col rounded-2xl border p-5 shadow-2xl sm:p-6 ${plan.highlighted
                        ? 'border-violet-300/35 bg-violet-500/10 shadow-violet-950/30 ring-2 ring-violet-400/25'
                        : 'border-white/10 bg-white/6 shadow-black/20'
                      }`}
                    style={{ '--scroll-delay': `${index * 120}ms` } as React.CSSProperties}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${plan.highlighted ? 'border-violet-300/30 bg-violet-400/15 text-violet-200' : 'border-white/10 bg-white/6 text-emerald-300'}`}>
                        <Icon size={22} />
                      </span>
                      {plan.highlighted && (
                        <span className="rounded-full bg-violet-400 px-3 py-1 text-[11px] font-black uppercase text-slate-950">{plan.badge || 'Popular'}</span>
                      )}
                    </div>
                    <h3 className="mt-5 font-montserrat text-2xl font-black">{plan.name}</h3>
                    <p className="mt-2 min-h-14 text-sm font-semibold leading-6 text-slate-400">{plan.description}</p>
                    <div className="mt-5">
                      {planPrices?.[plan.key]?.promotionActive && (
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-lg font-black text-slate-500 line-through">{formatPrice(planPrices[plan.key].baseAmountCents, planPrices[plan.key].currency)}</span>
                          <span className="rounded-full bg-emerald-300 px-2.5 py-1 text-[10px] font-black uppercase text-slate-950">{planPrices[plan.key].discountBadge}</span>
                        </div>
                      )}
                      <div className={`text-4xl font-black ${planPrices?.[plan.key]?.promotionActive ? 'text-emerald-300' : ''}`}>
                        {planPrices?.[plan.key] ? formatPrice(planPrices[plan.key].cents, planPrices[plan.key].currency) : plan.price}
                      </div>
                      {planPrices?.[plan.key]?.promotionLabel && (
                        <div className="mt-2 text-xs font-black uppercase text-emerald-200">{planPrices[plan.key].promotionLabel}</div>
                      )}
                      <div className="mt-1 text-sm font-bold text-slate-400">{plan.duration}</div>
                    </div>
                    <div className="mt-7 mb-8 grid gap-3">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3 text-sm font-bold text-slate-200">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                            <Check size={13} />
                          </span>
                          {feature}
                        </div>
                      ))}
                    </div>
                    <Link
                      to={plan.href}
                      className={`mt-auto inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-black transition active:scale-[0.98] ${plan.highlighted ? 'bg-violet-600 text-white hover:bg-violet-500' : 'border border-white/10 bg-white/6 text-white hover:bg-white/10'
                        }`}
                    >
                      {plan.cta}
                      <ArrowRight size={17} className="ml-2" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-950 py-12 text-white sm:py-20">
          <div className="absolute left-10 top-10 h-60 w-60 rounded-full bg-violet-500/14 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-400/12 blur-3xl" />
          <div id="faq" className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="landing-scroll-reveal text-center">
              <p className="text-sm font-black uppercase text-violet-300">{landing.faqEyebrow}</p>
              <h2 className="mt-3 font-montserrat text-2xl font-black min-[390px]:text-3xl sm:text-5xl">{landing.faqTitle}</h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-300 sm:text-base sm:leading-7">
                {landing.faqDescription}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:mt-10">
              {cmsContent.faqs.map((faq, index) => (
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
                <p className="text-sm font-black uppercase text-emerald-700">{landing.testimonialsEyebrow}</p>
                <h2 className="mt-3 font-montserrat text-2xl font-black min-[390px]:text-3xl sm:text-5xl">{landing.testimonialsTitle}</h2>
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
      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        onClose={closeAuthModal}
      />
    </div>
  );
}
