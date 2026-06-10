import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './sentry';
import App from './App.tsx';
import './index.css';
import { CV_GOOGLE_FONTS_URL } from '@nexcv/templates/cvFonts';

const loadCvFonts = () => {
  if (document.querySelector('link[data-nexcv-cv-fonts="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CV_GOOGLE_FONTS_URL;
  link.dataset.nexcvCvFonts = 'true';
  document.head.appendChild(link);
};

loadCvFonts();

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div className="min-h-screen bg-white p-6 text-slate-900">Something went wrong.</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
