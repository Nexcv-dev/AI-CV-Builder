import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa] w-full">
      <header className="bg-white border-b border-gray-200/80 flex flex-col sm:flex-row items-center p-4 sm:px-8 z-50 sticky top-0 shadow-sm">
        <Link to="/" className="flex items-center">
          <div className="p-2 bg-gray-900 rounded-xl mr-3 shadow-md shadow-gray-900/10">
            <LayoutTemplate className="text-white" size={20} />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 text-xl sm:text-2xl font-extrabold">
            CV Builder
          </span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-[2px_4px_24px_-8px_rgba(0,0,0,0.05)] border border-gray-100">
          <article className="prose prose-slate max-w-none">
            <h1>Privacy Policy</h1>
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2>1. Information We Collect</h2>
            <p>We do not store your CV data on our servers. All processing and PDF generation happens directly in your browser. Any information you input into the CV Builder remains on your local device unless you explicitly share it.</p>
            
            <h2>2. Use of Information</h2>
            <p>Since we do not collect personal data, we do not use your information for targeted advertising or external profiling. Your data is used exclusively to render and preview your CV layout locally.</p>
            
            <h2>3. Third-party Services</h2>
            <p>Our application may integrate with the Google Gemini API to provide smart AI suggestions. When utilizing these AI features, the text you prompt may be sent to Google API services. Please refer to Google's Privacy Policy to understand how they handle data.</p>
            
            <h2>4. Changes to This Policy</h2>
            <p>We may update our Privacy Policy from time to time. Since the tool operates offline and locally, you do not need to consent to new policies regarding data retention, as we retain nothing.</p>
            
            <h2>Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us via our Contact section.</p>
          </article>
        </div>
      </main>
    </div>
  );
}
