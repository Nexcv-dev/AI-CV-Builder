import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Send, CheckCircle2, Loader2 } from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';
import { apiFetch } from '../utils/api';

export default function ContactUs() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    type: 'general',
    subject: '',
    message: '',
  });

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = await apiFetch<{ message: string }>('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success(data.message || 'Message sent.');
      setIsSubmitted(true);
      setForm({ fullName: '', email: '', type: 'general', subject: '', message: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send your message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="overflow-x-hidden bg-slate-950 text-slate-300">
      <SiteHeader />

      <main className="relative mx-auto max-w-2xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="absolute left-0 top-20 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

        <div className="relative rounded-3xl border border-white/10 bg-white/4 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-12">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-montserrat font-black text-white mb-4">Contact Us</h1>
            <p className="text-slate-400">Have questions or feedback? We would love to hear from you. Fill out the form below and we'll get back to you shortly.</p>
          </div>

          {isSubmitted ? (
            <div className="bg-emerald-500/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center border border-emerald-500/20">
              <CheckCircle2 className="text-emerald-400 w-16 h-16 mb-4" />
              <h2 className="text-2xl font-montserrat font-bold text-white mb-2">Thank You!</h2>
              <p className="text-slate-300 mb-2">Your feedback is appreciated.</p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="bg-white/10 text-white border border-white/20 px-6 py-2 rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  className="w-full bg-slate-900/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm placeholder:text-slate-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  className="w-full bg-slate-900/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm placeholder:text-slate-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-slate-300 mb-2">Request Type</label>
                <select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={(event) => updateField('type', event.target.value)}
                  className="w-full bg-slate-900/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm"
                >
                  <option value="general">General</option>
                  <option value="complaint">Complaint</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="payment_issue">Payment Issue</option>
                </select>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                <input
                  id="subject"
                  name="subject"
                  required
                  value={form.subject}
                  onChange={(event) => updateField('subject', event.target.value)}
                  className="w-full bg-slate-900/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm placeholder:text-slate-500"
                  placeholder="Briefly describe the issue"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={(event) => updateField('message', event.target.value)}
                  className="w-full bg-slate-900/50 text-white px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm resize-none placeholder:text-slate-500"
                  placeholder="How can we help you?"
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-violet-600/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isSubmitting ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Send size={18} className="mr-2" />}
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
