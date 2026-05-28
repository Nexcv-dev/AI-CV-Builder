import React from 'react';
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
      <h1 className="text-8xl font-extrabold text-blue-600 mb-4">404</h1>
      <p className="text-2xl font-semibold text-slate-800 mb-2">Page not found</p>
      <p className="text-gray-500 mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md"
      >
        &lt;- Go back home
      </Link>
    </div>
  );
}

export function MaintenancePage({ supportEmail }: { supportEmail: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <section className="w-full max-w-2xl text-center">
          <img src="/brand/faviconblack.webp" alt="NexCV" className="mx-auto h-16 w-16 rounded-2xl shadow-2xl shadow-violet-950/40" />
          <p className="mt-8 text-sm font-black uppercase tracking-widest text-violet-300">Maintenance mode</p>
          <h1 className="mt-4 font-montserrat text-3xl font-black leading-tight sm:text-5xl">
            NexCV is getting a quick upgrade
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-400 sm:text-base sm:leading-7">
            We are improving the builder right now. Please check back soon, or contact support if you need help with an existing order.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={`mailto:${supportEmail}`} className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/6 px-5 text-sm font-black text-white transition hover:bg-white/10">
              Contact support
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

export function AdminDisabledPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
      <h1 className="font-montserrat text-6xl font-black text-violet-300">404</h1>
      <p className="mt-4 text-lg font-black text-white">Page not found</p>
      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        The page you are looking for is not available.
      </p>
    </div>
  );
}
