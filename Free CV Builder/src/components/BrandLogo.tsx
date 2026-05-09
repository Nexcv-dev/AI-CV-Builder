import React from 'react';

interface BrandLogoProps {
  showWordmark?: boolean;
  markClassName?: string;
  wordmarkClassName?: string;
}

export const BrandLogo = ({ showWordmark = true, markClassName = 'h-8 w-8', wordmarkClassName = '' }: BrandLogoProps) => (
  <div className="flex items-center gap-3">
    <img src="/brand/faviconblack.png" alt="NexCV" className={markClassName} />
    {showWordmark && (
      <img src="/brand/logo-text.png" alt="NexCV - Build your next career move" className={`h-10 w-auto object-contain ${wordmarkClassName}`} />
    )}
  </div>
);
