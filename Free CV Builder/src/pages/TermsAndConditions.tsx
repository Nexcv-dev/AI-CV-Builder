import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsAndConditions() {
  return (
    <div className="min-h-svh overflow-x-hidden bg-slate-950 text-slate-300">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/76 shadow-sm shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-950 shadow-lg shadow-violet-900/20 sm:h-11 sm:w-11">
              <img src="/brand/faviconblack.png" alt="" className="h-8 w-8 rounded-xl sm:h-9 sm:w-9" />
            </span>
            <span className="font-montserrat text-xl font-black text-white sm:text-2xl">NexCV</span>
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="absolute left-0 top-20 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

        <div className="relative rounded-3xl border border-white/10 bg-white/4 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-12">
          <article className="prose prose-invert prose-slate max-w-none">
            <h1 className="font-montserrat font-black text-white">Terms and Conditions</h1>
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2 className="font-montserrat text-white">1. Agreement to Terms</h2>
            <p>By using our CV Builder, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the application.</p>
            
            <h2 className="font-montserrat text-white">2. License to Use</h2>
            <p>We grant you a non-exclusive, personal, non-transferable license to use the CV Builder application strictly for personal and non-commercial purposes. The generated PDFs are fully yours to use as you wish.</p>
            
            <h2 className="font-montserrat text-white">3. AI Processing</h2>
            <p>By using the "Enhance Text" capabilities included in the application, you agree to the usage of external Artificial Intelligence APIs to process the text. Do not enter sensitive, classified, or proprietary institutional data into the AI tools.</p>
            
            <h2 className="font-montserrat text-white">4. Limitation of Liability</h2>
            <p>In no event shall the CV Builder creators be liable for any indirect, incidental, special, or consequential damages arising out of or in any way connected with the use of the application, including career-related damages resulting from the use of generated resumes.</p>
          </article>
        </div>
      </main>
    </div>
  );
}
