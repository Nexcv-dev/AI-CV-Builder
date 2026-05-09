import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
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
            <h1 className="font-montserrat font-black text-white">Privacy Policy</h1>
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2 className="font-montserrat text-white">1. Information We Collect</h2>
            <p>We do not store your CV data on our servers. All processing and PDF generation happens directly in your browser. Any information you input into the CV Builder remains on your local device unless you explicitly share it.</p>
            
            <h2 className="font-montserrat text-white">2. Use of Information</h2>
            <p>Since we do not collect personal data, we do not use your information for targeted advertising or external profiling. Your data is used exclusively to render and preview your CV layout locally.</p>
            
            <h2 className="font-montserrat text-white">3. Third-party Services</h2>
            <p>Our application may integrate with the Google Gemini API to provide smart AI suggestions. When utilizing these AI features, the text you prompt may be sent to Google API services. Please refer to Google's Privacy Policy to understand how they handle data.</p>
            
            <h2 className="font-montserrat text-white">4. Changes to This Policy</h2>
            <p>We may update our Privacy Policy from time to time. Since the tool operates offline and locally, you do not need to consent to new policies regarding data retention, as we retain nothing.</p>
            
            <h2 className="font-montserrat text-white">Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us via our Contact section.</p>
          </article>
        </div>
      </main>
    </div>
  );
}
