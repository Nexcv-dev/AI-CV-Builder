import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsAndConditions() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa] w-full">
      <header className="bg-white border-b border-gray-200/80 flex flex-col sm:flex-row items-center p-4 sm:px-8 z-50 sticky top-0 shadow-sm">
        <Link to="/" className="flex items-center">
          <div className="p-2 bg-gray-900 rounded-xl mr-3 shadow-md shadow-gray-900/10">
            <LayoutTemplate className="text-white" size={20} />
          </div>
          <span className="bg-clip-text text-transparent bg-linear-to-r from-gray-900 to-gray-600 text-xl sm:text-2xl font-extrabold">
            CV Builder
          </span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-[2px_4px_24px_-8px_rgba(0,0,0,0.05)] border border-gray-100">
          <article className="prose prose-slate max-w-none">
            <h1>Terms and Conditions</h1>
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2>1. Agreement to Terms</h2>
            <p>By using our CV Builder, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the application.</p>
            
            <h2>2. License to Use</h2>
            <p>We grant you a non-exclusive, personal, non-transferable license to use the CV Builder application strictly for personal and non-commercial purposes. The generated PDFs are fully yours to use as you wish.</p>
            
            <h2>3. AI Processing</h2>
            <p>By using the "Enhance Text" capabilities included in the application, you agree to the usage of external Artificial Intelligence APIs to process the text. Do not enter sensitive, classified, or proprietary institutional data into the AI tools.</p>
            
            <h2>4. Limitation of Liability</h2>
            <p>In no event shall the CV Builder creators be liable for any indirect, incidental, special, or consequential damages arising out of or in any way connected with the use of the application, including career-related damages resulting from the use of generated resumes.</p>
          </article>
        </div>
      </main>
    </div>
  );
}
