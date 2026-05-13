import React from 'react';
import { Link } from 'react-router-dom';
import { Copyright } from 'lucide-react';

const resetFooterLinks = [
  { label: 'FAQ', to: '/#faq' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Support/Help', to: '/contact' },
];

export function PasswordResetFooter() {
  return (
    <footer className="mt-6 flex flex-col items-center gap-3 text-center text-xs font-semibold text-slate-500">
      <p className="inline-flex items-center justify-center gap-1.5">
        <Copyright size={13} aria-hidden="true" />
        <span>{new Date().getFullYear()} NexCV. All rights reserved.</span>
      </p>
      <nav className="flex max-w-sm flex-wrap items-center justify-center gap-x-4 gap-y-2" aria-label="Password reset support links">
        {resetFooterLinks.map((link) => (
          <Link key={link.to} to={link.to} className="transition hover:text-slate-300">
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
