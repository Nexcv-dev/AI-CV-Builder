import React from 'react';
import { SiteHeader } from '../components/SiteHeader';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-svh overflow-x-hidden bg-slate-950 text-slate-300">
      <SiteHeader />

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
