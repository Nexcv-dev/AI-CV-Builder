import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Home from './pages/Home';
import LandingPage from './pages/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import PrintView from './pages/PrintView';
import { Toaster } from 'react-hot-toast';
import { Footer } from './components/Footer';

function PageLoadingOverlay() {
  const location = useLocation();
  const isFirstRender = useRef(true);
  const [isLoading, setIsLoading] = useState(false);
  const isBuilderRedirect = location.pathname === '/builder';

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setIsLoading(true);
    const timer = window.setTimeout(() => setIsLoading(false), 650);

    return () => window.clearTimeout(timer);
  }, [location.key]);

  return (
    <AnimatePresence>
      {isLoading && (
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
  const isBuilder = location.pathname === '/builder';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className={`flex flex-col ${isBuilder ? 'min-h-svh h-svh overflow-hidden bg-slate-950' : 'min-h-svh bg-slate-950'}`}>
      <div className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </div>
      {!isBuilder && <Footer />}
    </div>
  );
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
      <Routes>
        {/* Headless print route - no layout */}
        <Route path="/print" element={<PrintView />} />
        
        {/* Standard layout routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/builder" element={<Home />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
