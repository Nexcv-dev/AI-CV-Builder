import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'nexcv-cookie-consent';
const UMAMI_SCRIPT_ID = 'nexcv-umami-analytics';
const UMAMI_WEBSITE_ID = 'dd03ee20-40f5-4886-b4d4-8120d4cfe368';

type CookieConsent = 'accepted' | 'rejected';

function loadAnalytics() {
  if (document.getElementById(UMAMI_SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = UMAMI_SCRIPT_ID;
  script.defer = true;
  script.src = 'https://cloud.umami.is/script.js';
  script.dataset.websiteId = UMAMI_WEBSITE_ID;
  document.head.appendChild(script);
}

function readConsent(): CookieConsent | null {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    return value === 'accepted' || value === 'rejected' ? value : null;
  } catch {
    return null;
  }
}

function saveConsent(value: CookieConsent) {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // If storage is unavailable, keep the user's choice for this render only.
  }
}

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<CookieConsent | null>(() => {
    if (typeof window === 'undefined') return null;
    return readConsent();
  });

  useEffect(() => {
    if (consent === 'accepted') {
      loadAnalytics();
    }
  }, [consent]);

  const chooseConsent = (value: CookieConsent) => {
    saveConsent(value);
    setConsent(value);
  };

  if (consent) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-70 mx-auto max-w-3xl rounded-lg border border-white/10 bg-slate-950/95 p-4 text-white shadow-2xl shadow-black/30 backdrop-blur sm:bottom-5 sm:flex sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">Cookies on NexCV</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">
          We use essential cookies to keep NexCV secure and working. With your consent, we use privacy-friendly analytics to improve the product.
          {' '}
          <Link to="/privacy-policy" className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200">
            Privacy Policy
          </Link>
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:flex sm:shrink-0">
        <button
          type="button"
          onClick={() => chooseConsent('rejected')}
          className="rounded-md border border-white/15 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-white/30 hover:bg-white/10"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => chooseConsent('accepted')}
          className="rounded-md bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-300"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
