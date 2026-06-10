import React from 'react';
import { SiteHeader } from '../components/SiteHeader';

export default function AboutUs() {
  return (
    <div className="overflow-x-hidden bg-slate-950 text-slate-300">
      <SiteHeader />

      <main className="relative mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="absolute left-0 top-20 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

        <div className="relative rounded-3xl border border-white/10 bg-white/4 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-12">
          <article className="prose prose-invert prose-slate max-w-none">
            <h1 className="text-center mb-8 font-montserrat font-black text-white">About Us</h1>
            <img 
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200&h=400" 
              alt="Team collaborating" 
              className="w-full h-64 object-cover rounded-2xl mb-8 shadow-sm"
            />
            
            <p className="text-lg leading-relaxed text-slate-300 font-medium">
              We are a passionate team of developers and designers committed to helping individuals showcase their true potential. We believe that a great resume is the first step toward a dream career.
            </p>
            
            <h2 className="font-montserrat text-white">Our Mission</h2>
            <p>
              Our mission is to democratize professional design and intelligence. We built the CV Builder to be intuitive, blisteringly fast, and completely free of the clunky paywalls that plague the industry. Your career documents belong strictly to you.
            </p>

            <h2 className="font-montserrat text-white">Technology First</h2>
            <p>
              By leveraging modern web capabilities like React, Tailwind CSS, and cutting-edge GenAI models via Google Gemini, we provide a localized, private, and highly intelligent CV building experience. 
            </p>
          </article>
        </div>
      </main>
    </div>
  );
}
