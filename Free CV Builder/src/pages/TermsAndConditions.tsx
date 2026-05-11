import React from 'react';
import { SiteHeader } from '../components/SiteHeader';

export default function TermsAndConditions() {
  return (
    <div className="min-h-svh overflow-x-hidden bg-slate-950 text-slate-300">
      <SiteHeader />

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
