import { FileText, LayoutTemplate, Mail, Palette, Sparkles, Wand2 } from 'lucide-react';

const visualItems = [
  { icon: FileText, className: 'left-[12%] top-[41%] border-sky-300/25 bg-sky-400/18 text-sky-100' },
  { icon: LayoutTemplate, className: 'left-[23%] top-[26%] border-emerald-300/25 bg-emerald-400/18 text-emerald-100' },
  { icon: Sparkles, className: 'left-[42%] top-[18%] border-violet-300/25 bg-violet-400/20 text-violet-100' },
  { icon: Wand2, className: 'right-[27%] top-[23%] border-fuchsia-300/25 bg-fuchsia-400/18 text-fuchsia-100' },
  { icon: Palette, className: 'right-[13%] top-[39%] border-amber-300/25 bg-amber-300/18 text-amber-100' },
  { icon: Mail, className: 'right-[19%] top-[57%] border-indigo-300/25 bg-indigo-400/18 text-indigo-100' },
];

export function AuthVisualPanel() {
  return (
    <section className="relative hidden min-h-[540px] overflow-hidden bg-slate-900 lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(20,184,166,0.34),transparent_30%),radial-gradient(circle_at_58%_36%,rgba(168,85,247,0.38),transparent_32%),linear-gradient(145deg,rgba(15,23,42,1),rgba(17,24,39,1)_42%,rgba(88,28,135,0.55))]" />
      <div className="absolute inset-x-0 top-16 mx-auto h-64 w-64 rounded-full bg-cyan-400/18 blur-3xl" />
      <div className="absolute bottom-10 right-4 h-64 w-64 rounded-full bg-violet-500/18 blur-3xl" />
      <div className="absolute left-1/2 top-[45%] flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white shadow-2xl shadow-violet-950/40 backdrop-blur">
        <img src="/brand/faviconblack.svg" alt="" className="h-18 w-18 rounded-3xl" />
      </div>
      {visualItems.map(({ icon: Icon, className }, index) => (
        <div
          key={index}
          className={`absolute flex h-14 w-14 items-center justify-center rounded-2xl border shadow-xl shadow-black/20 backdrop-blur ${className}`}
        >
          <Icon size={25} strokeWidth={2.6} />
        </div>
      ))}
      <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-slate-950/35 p-4 backdrop-blur">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-200">NexCV workspace</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-200">
          Secure access for templates, AI tools, saved CVs, and launch-ready downloads.
        </p>
      </div>
      <Sparkles className="absolute left-[20%] top-[28%] text-white/80" size={22} />
      <Sparkles className="absolute right-[17%] top-[24%] text-white/80" size={24} />
      <Sparkles className="absolute bottom-[36%] left-[20%] text-white/70" size={18} />
      <Sparkles className="absolute bottom-[31%] right-[9%] text-white/70" size={18} />
    </section>
  );
}
