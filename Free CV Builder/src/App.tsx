import React, { useLayoutEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Home from './pages/Home';
import LandingPage from './pages/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import TemplatesPage from './pages/TemplatesPage';
import PrintView from './pages/PrintView';
import Dashboard from './pages/Dashboard';
import MyCvs from './pages/MyCvs';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import { Toaster } from 'react-hot-toast';
import { Footer } from './components/Footer';
import { getCurrentUser } from './utils/api';

function PageLoadingOverlay() {
  const location = useLocation();
  const isFirstRender = useRef(true);
  const previousPathname = useRef(location.pathname);
  const [isLoading, setIsLoading] = useState(false);
  const isBuilderRedirect = location.pathname === '/builder';
  const skipsPageLoadingOverlay = [
    '/forgot-password',
    '/reset-password',
    '/verify-email',
  ].includes(location.pathname);
  const isHashOnlyLandingNavigation =
    location.pathname === '/' &&
    Boolean(location.hash) &&
    previousPathname.current !== '/builder';
  const shouldShowImmediately =
    !isFirstRender.current &&
    previousPathname.current !== location.pathname &&
    !isHashOnlyLandingNavigation &&
    !skipsPageLoadingOverlay;

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousPathname.current = location.pathname;
      return;
    }

    const previous = previousPathname.current;
    if (previous === location.pathname || skipsPageLoadingOverlay || (location.pathname === '/' && location.hash && previous !== '/builder')) {
      previousPathname.current = location.pathname;
      return;
    }

    previousPathname.current = location.pathname;
    setIsLoading(true);
    const timer = window.setTimeout(() => setIsLoading(false), 650);

    return () => window.clearTimeout(timer);
  }, [location.pathname, skipsPageLoadingOverlay]);

  return (
    <AnimatePresence>
      {(isLoading || shouldShowImmediately) && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-200 flex flex-col items-center justify-center bg-slate-950"
          role="status"
          aria-live="polite"
        >
          <div className="relative mb-6">
            <div className="h-20 w-20 animate-spin rounded-full border-4 border-violet-900/60 border-t-violet-600"></div>
            <img src="/brand/faviconblack.png" alt="NexCV" className="absolute inset-0 m-auto h-12 w-12 rounded-2xl" />
          </div>
          <h2 className="bg-linear-to-r from-slate-100 to-violet-400 bg-clip-text text-2xl font-bold text-transparent">
            NexCV
          </h2>
          {isBuilderRedirect && (
            <p className="mt-2 text-sm font-medium text-slate-400">Preparing your workspace...</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Layout() {
  const location = useLocation();
  const previousPathname = useRef(location.pathname);
  const isBuilder = location.pathname === '/builder';
  const hidesFooter = isBuilder || [
    '/dashboard',
    '/my-cvs',
    '/profile',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
  ].includes(location.pathname);

  useLayoutEffect(() => {
    const previous = previousPathname.current;
    previousPathname.current = location.pathname;

    if (location.hash) {
      const targetId = decodeURIComponent(location.hash.slice(1));
      const target = document.getElementById(targetId);
      if (target && previous === '/builder') {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
      }

      const frame = window.requestAnimationFrame(() => {
        const targetAfterPaint = document.getElementById(targetId);
        if (targetAfterPaint) {
          targetAfterPaint.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      return () => window.cancelAnimationFrame(frame);
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.hash]);

  return (
    <div className={`flex flex-col ${isBuilder ? 'h-dvh min-h-dvh overflow-hidden bg-slate-950' : 'min-h-screen bg-slate-950'}`}>
      <div className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </div>
      {!hidesFooter && <Footer />}
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const [status, setStatus] = useState<'loading' | 'authed' | 'guest'>('loading');

  useLayoutEffect(() => {
    let ignore = false;
    getCurrentUser()
      .then(() => {
        if (!ignore) setStatus('authed');
      })
      .catch(() => {
        if (!ignore) setStatus('guest');
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-bold text-slate-400">
        Loading...
      </div>
    );
  }

  if (status === 'guest') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
      <h1 className="text-8xl font-extrabold text-blue-600 mb-4">404</h1>
      <p className="text-2xl font-semibold text-slate-800 mb-2">Page not found</p>
      <p className="text-gray-500 mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md"
      >
        ← Go back home
      </Link>
    </div>
  );
}

function App() {
  return (
    <Router>
      <PageLoadingOverlay />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          className: '!rounded-2xl !border !border-slate-700 !bg-slate-900 !px-4 !py-3 !text-sm !font-bold !text-slate-100 !shadow-2xl',
          style: {
            maxWidth: 'calc(100vw - 32px)',
          },
          success: {
            iconTheme: {
              primary: '#8b5cf6',
              secondary: '#0f172a',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#0f172a',
            },
          },
        }}
      />
      <Routes>
        {/* Headless print route - no layout */}
        <Route path="/print" element={<PrintView />} />
        
        {/* Standard layout routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/my-cvs" element={<ProtectedRoute><MyCvs /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<Navigate to="/profile" replace />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/builder" element={<Home />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
