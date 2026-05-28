import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './Layout';
import { PageLoadingOverlay, RouteLoadingFallback } from './loading';
import { AdminProtectedRoute, ProtectedRoute } from './routeGuards';
import { AdminDisabledPage, MaintenancePage, NotFound } from './systemPages';
import type { PublicAppSettings } from './types';
import { SeoHead } from '../components/SeoHead';
import ForgotPassword from '../pages/ForgotPassword';

const Home = lazy(() => import('../pages/Home'));
const LandingPage = lazy(() => import('../pages/LandingPage'));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('../pages/TermsAndConditions'));
const AboutUs = lazy(() => import('../pages/AboutUs'));
const ContactUs = lazy(() => import('../pages/ContactUs'));
const TemplatesPage = lazy(() => import('../pages/TemplatesPage'));
const PrintView = lazy(() => import('../pages/PrintView'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const MyCvs = lazy(() => import('../pages/MyCvs'));
const Profile = lazy(() => import('../pages/Profile'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const TipsAndResources = lazy(() => import('../pages/TipsAndResources'));
const PricingPage = lazy(() => import('../pages/PricingPage'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'));
const RefundPolicy = lazy(() => import('../pages/RefundPolicy'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));

function PublicAnnouncement({ settings }: { settings: PublicAppSettings }) {
  const location = useLocation();
  const text = settings.announcementText || settings.announcement?.text;
  const shouldShow =
    settings.announcementEnabled &&
    text &&
    !location.pathname.startsWith('/admin') &&
    location.pathname !== '/builder';

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-x-0 top-16 z-60 border-b border-violet-300/20 bg-violet-950/95 px-4 py-2 text-center text-xs font-black text-white shadow-lg shadow-black/20 backdrop-blur">
      <span>{text}</span>
      {settings.announcement?.linkLabel && settings.announcement?.linkHref && (
        settings.announcement.linkHref.startsWith('http') ? (
          <a href={settings.announcement.linkHref} className="ml-2 text-emerald-200 underline underline-offset-4">
            {settings.announcement.linkLabel}
          </a>
        ) : (
          <Link to={settings.announcement.linkHref} className="ml-2 text-emerald-200 underline underline-offset-4">
            {settings.announcement.linkLabel}
          </Link>
        )
      )}
    </div>
  );
}

export function AppRoutes() {
  const location = useLocation();
  const [publicSettings, setPublicSettings] = useState<PublicAppSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch('/api/public/app-settings', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!ignore && data) setPublicSettings(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!ignore) setSettingsLoaded(true);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (!settingsLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-bold text-slate-400">
        Loading NexCV...
      </div>
    );
  }

  if (publicSettings?.maintenanceMode && !location.pathname.startsWith('/admin')) {
    return <MaintenancePage supportEmail={publicSettings.supportEmail || 'support@nexcv.com'} />;
  }

  if (location.pathname.startsWith('/admin') && publicSettings?.adminAccessAllowed === false) {
    return <AdminDisabledPage />;
  }

  return (
    <>
      <SeoHead />
      <PageLoadingOverlay />
      {publicSettings && <PublicAnnouncement settings={publicSettings} />}
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/print" element={<PrintView />} />

          <Route element={<Layout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/admin/*" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/my-cvs" element={<ProtectedRoute><MyCvs /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<Navigate to="/profile" replace />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/builder" element={<Home />} />
            <Route path="/tips" element={<TipsAndResources />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<Navigate to="/builder" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
