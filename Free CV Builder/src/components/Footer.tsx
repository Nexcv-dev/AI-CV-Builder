import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Mail, ShieldCheck, Sparkles } from 'lucide-react';

const linkGroups = [
  {
    title: 'Product',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Builder', to: '/builder' },
      { label: 'Templates', to: '/#templates' },
      { label: 'Features', to: '/#features' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
];

export const Footer = () => {
  return (
    <footer className="relative mt-auto overflow-hidden bg-slate-950 text-white print:hidden">
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/20 sm:mb-10">
          <div className="grid gap-5 p-5 sm:gap-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-extrabold text-emerald-200 sm:text-sm">
                <Sparkles size={16} />
                Build your next career move
              </div>
              <h2 className="font-montserrat text-2xl font-black leading-tight sm:text-4xl">Create a polished CV with NexCV</h2>
            </div>
            <Link
              to="/builder"
              className="inline-flex items-center justify-center rounded-2xl bg-violet-500 px-5 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-violet-950/30 transition-all hover:bg-violet-400 active:scale-[0.98] sm:px-6 sm:py-4 sm:text-base"
            >
              Start Building
              <ArrowRight size={20} className="ml-2" />
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/20">
                <img src="/brand/faviconblack.png" alt="" className="h-10 w-10 rounded-xl" />
              </span>
              <span className="font-montserrat text-2xl font-black">NexCV</span>
            </Link>
            <p className="mt-5 max-w-md text-sm font-medium leading-7 text-slate-300">
              AI-assisted resume building with editable templates, live preview, and clean PDF export.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { icon: FileText, label: 'Live templates' },
                { icon: ShieldCheck, label: 'Private editing' },
                { icon: Mail, label: 'Ready to send' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-slate-200">
                  <Icon size={15} className="text-emerald-300" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:gap-8">
            {linkGroups.map((group) => (
              <nav key={group.title}>
                <h3 className="mb-4 text-sm font-black uppercase text-emerald-300">{group.title}</h3>
                <div className="grid gap-3">
                  {group.links.map((link) => (
                    <Link key={link.to} to={link.to} className="text-sm font-bold text-slate-300 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm font-medium text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright {new Date().getFullYear()} NexCV. All rights reserved.</p>
          <p className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-slate-300">v{__APP_VERSION__}</p>
        </div>
      </div>
    </footer>
  );
};
