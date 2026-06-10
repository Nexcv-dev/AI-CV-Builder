import { Link } from 'react-router-dom';
import { Mail, Phone, ShieldCheck } from 'lucide-react';
import { PaymentMethodLogos } from './PaymentMethodLogos';

export function CheckoutFooter() {
  return (
    <footer className="bg-slate-950 border-t border-white/10 py-12 pb-32 sm:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-3 md:items-start md:justify-between">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 opacity-50">Customer Support</h3>
            <p className="text-slate-400 text-sm font-semibold mb-6">Payment stuck or have questions? We're here to help you.</p>
            <div className="space-y-4">
              <a href="tel:+94701234567" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:border-violet-500/50 group-hover:bg-violet-500/10 transition-all">
                  <Phone size={16} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase text-slate-500">Call Us</div>
                  <div className="text-sm font-bold">+94 70 123 4567</div>
                </div>
              </a>
              <a href="mailto:support@nexcv.com" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all">
                  <Mail size={16} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase text-slate-500">Email Support</div>
                  <div className="text-sm font-bold">support@nexcv.com</div>
                </div>
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-center">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 opacity-50">Secure Payments</h3>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-emerald-400">
                <ShieldCheck size={20} />
                <div className="leading-none">
                  <div className="text-[9px] font-black uppercase tracking-widest">Secure SSL</div>
                  <div className="text-[11px] font-bold">Encrypted</div>
                </div>
              </div>

              <PaymentMethodLogos compact />
            </div>
            <p className="mt-6 text-center text-[11px] font-bold text-slate-500 max-w-[200px]">
              Your transactions are encrypted and processed securely.
            </p>
          </div>

          <div className="md:text-right">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 opacity-50">Legal Policies</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/privacy-policy" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/refund-policy" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Refund & Cancellation Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Terms & Conditions</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-bold text-slate-600">
            &copy; {new Date().getFullYear()} NexCV. Built with security in mind.
          </p>
          <div className="flex items-center gap-2 text-[11px] font-black text-slate-700 uppercase tracking-widest">
            <ShieldCheck size={12} />
            PCI DSS Compliant
          </div>
        </div>
      </div>
    </footer>
  );
}
