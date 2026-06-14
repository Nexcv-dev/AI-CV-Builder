import React from 'react';

export function RouteLoadingFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-slate-950"
      role="status"
      aria-label="Loading NexCV"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-violet-950 border-t-violet-500" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-violet-500/10 blur-md" />
        <img
          src="/brand/faviconblack.svg"
          alt=""
          className="relative h-14 w-14 rounded-2xl drop-shadow-[0_12px_24px_rgba(124,58,237,0.35)]"
        />
      </div>
    </div>
  );
}
