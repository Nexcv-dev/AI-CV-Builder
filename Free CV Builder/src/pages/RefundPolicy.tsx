import React from 'react';
import { SiteHeader } from '../components/SiteHeader';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-montserrat font-black text-white mb-8">Refund & Cancellation Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-slate-400 font-medium">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Refund Eligibility</h2>
            <p>At NexCV, we strive to provide the best AI-powered CV building experience. However, since our services involve immediate digital access and AI processing credits, refunds are generally only considered under specific circumstances:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Technical failures that prevent you from downloading your CV after a successful payment.</li>
              <li>Duplicate charges for the same transaction.</li>
              <li>Request made within 24 hours of purchase if no AI features or downloads were used.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Cancellation</h2>
            <p>For subscription-based plans (if applicable), you can cancel your subscription at any time through your account settings. Upon cancellation, you will continue to have access to premium features until the end of your current billing cycle.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How to Request a Refund</h2>
            <p>To request a refund, please contact our support team at <a href="mailto:support@nexcv.com" className="text-violet-400 hover:underline">support@nexcv.com</a> with your transaction ID and the reason for your request. We aim to process all requests within 3-5 business days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Sri Lankan Consumer Law</h2>
            <p>This policy is governed by the laws of Sri Lanka. Your statutory rights as a consumer are not affected by this policy.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
