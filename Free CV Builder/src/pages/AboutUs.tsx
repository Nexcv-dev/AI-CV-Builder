import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AboutUs() {
  return (
    <div className="flex-1 bg-[#f8f9fa] w-full">
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
            <h1 className="text-center mb-8">About Us</h1>
            <img 
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200&h=400" 
              alt="Team collaborating" 
              className="w-full h-64 object-cover rounded-2xl mb-8 shadow-sm"
            />
            
            <p className="text-lg leading-relaxed text-gray-600 font-medium">
              We are a passionate team of developers and designers committed to helping individuals showcase their true potential. We believe that a great resume is the first step toward a dream career.
            </p>
            
            <h2>Our Mission</h2>
            <p>
              Our mission is to democratize professional design and intelligence. We built the CV Builder to be intuitive, blisteringly fast, and completely free of the clunky paywalls that plague the industry. Your career documents belong strictly to you.
            </p>

            <h2>Technology First</h2>
            <p>
              By leveraging modern web capabilities like React, Tailwind CSS, and cutting-edge GenAI models via Google Gemini, we provide a localized, private, and highly intelligent CV building experience. 
            </p>
          </article>
        </div>
      </main>
    </div>
  );
}
