import React from 'react';
import { Loader2 } from 'lucide-react';

export function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-bold text-slate-400">
      <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 shadow-xl shadow-black/20">
        <Loader2 size={18} className="animate-spin text-violet-300" />
        Loading page...
      </div>
    </div>
  );
}
