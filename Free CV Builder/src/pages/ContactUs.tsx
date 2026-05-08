import React, { useState } from 'react';
import { LayoutTemplate, Send, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ContactUs() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="flex-1 bg-[#f8f9fa] w-full">
      <header className="bg-white border-b border-gray-200/80 flex flex-col sm:flex-row items-center p-4 sm:px-8 z-50 sticky top-0 shadow-sm">
        <Link to="/" className="flex items-center">
          <div className="p-2 bg-gray-900 rounded-xl mr-3 shadow-md shadow-gray-900/10">
            <LayoutTemplate className="text-white" size={20} />
          </div>
          <span className="bg-clip-text text-transparent bg-liner-to-r from-gray-900 to-gray-600 text-xl sm:text-2xl font-extrabold">
            CV Builder
          </span>
        </Link>
      </header>

      <main className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-[2px_4px_24px_-8px_rgba(0,0,0,0.05)] border border-gray-100">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Contact Us</h1>
            <p className="text-gray-500">Have questions or feedback? We would love to hear from you. Fill out the form below and we'll get back to you shortly.</p>
          </div>

          {isSubmitted ? (
            <div className="bg-green-50 rounded-2xl p-8 flex flex-col items-center justify-center text-center border border-green-100">
              <CheckCircle2 className="text-green-500 w-16 h-16 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
              <p className="text-gray-600 mb-2">Your feedback is appreciated.</p>
              <p className="text-xs text-gray-400 mb-6">Note: This is a demo form. For actual inquiries, please email us directly.</p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="bg-white text-gray-900 border border-gray-200 px-6 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm resize-none"
                  placeholder="How can we help you?"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-[0.98]"
              >
                <Send size={18} className="mr-2" />
                Send Message
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
