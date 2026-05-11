import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Info, LayoutTemplate, Mail, Menu, Shield, X, Zap } from 'lucide-react';

const mainLinks = [
  { label: 'Templates', href: '/#templates', icon: LayoutTemplate, delay: '0ms' },
  { label: 'Features', href: '/#features', icon: Zap, delay: '50ms' },
  { label: 'FAQ', href: '/#faq', icon: Info, delay: '100ms' },
  { label: 'About', href: '/about', icon: Info, delay: '150ms' },
];

const secondaryLinks = [
  { label: 'Contact Us', href: '/contact', icon: Mail, delay: '150ms' },
  { label: 'Privacy Policy', href: '/privacy-policy', icon: Shield, delay: '200ms' },
  { label: 'Terms & Conditions', href: '/terms', icon: FileText, delay: '250ms' },
];

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

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

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 shadow-sm shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" onClick={closeMobileMenu}>
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-950 shadow-lg shadow-violet-900/20 sm:h-11 sm:w-11">
              <img src="/brand/faviconblack.png" alt="" className="h-8 w-8 rounded-xl sm:h-9 sm:w-9" />
            </span>
            <span className="font-montserrat text-xl font-black text-white sm:text-2xl">NexCV</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-300 md:flex">
            <Link to="/#templates" className="transition-colors hover:text-white">Templates</Link>
            <Link to="/#features" className="transition-colors hover:text-white">Features</Link>
            <Link to="/#faq" className="transition-colors hover:text-white">FAQ</Link>
            <Link to="/about" className="transition-colors hover:text-white">About</Link>
          </nav>

          <Link
            to="/builder"
            className="hidden items-center justify-center rounded-xl bg-violet-600 px-3.5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-violet-600/25 transition-all hover:bg-violet-500 active:scale-[0.98] sm:px-4 md:inline-flex"
          >
            Start
            <ArrowRight size={17} className="ml-1.5" />
          </Link>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-white transition-all hover:bg-white/12 active:scale-95 md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span className="relative flex h-5 w-5 items-center justify-center" style={{ transition: 'transform 0.3s' }}>
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

      <div
        className="fixed inset-0 z-40 md:hidden"
        style={{ pointerEvents: mobileMenuOpen ? 'auto' : 'none' }}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          style={{ opacity: mobileMenuOpen ? 1 : 0, transition: 'opacity 0.3s ease' }}
          onClick={closeMobileMenu}
        />

        <nav
          className="absolute inset-x-0 top-16 mx-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40"
          style={{
            transform: mobileMenuOpen ? 'translateY(0) scale(1)' : 'translateY(-16px) scale(0.97)',
            opacity: mobileMenuOpen ? 1 : 0,
            transition: 'transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.22s ease',
          }}
        >
          <div className="h-1 w-full bg-linear-to-r from-violet-600 to-emerald-500" />

          <div className="flex flex-col gap-1 p-4">
            {mainLinks.map(({ label, href, icon: Icon, delay }) => (
              <Link
                key={label}
                to={href}
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
              </Link>
            ))}

            <div className="my-2 border-t border-white/8" />

            {secondaryLinks.map(({ label, href, icon: Icon, delay }) => (
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

            <Link
              to="/builder"
              onClick={closeMobileMenu}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-[0.98]"
              style={{
                transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-12px)',
                opacity: mobileMenuOpen ? 1 : 0,
                transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1) 150ms, opacity 0.25s ease 150ms, background 0.15s',
              }}
            >
              Create My CV
              <ArrowRight size={17} />
            </Link>

            <p
              className="mt-2 text-center text-[10px] text-slate-500"
              style={{ opacity: mobileMenuOpen ? 1 : 0, transition: 'opacity 0.3s ease 300ms' }}
            >
              NexCV v{__APP_VERSION__}
            </p>
          </div>
        </nav>
      </div>
    </>
  );
}
