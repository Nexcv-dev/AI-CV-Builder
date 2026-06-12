import type { PostHog } from 'posthog-js';

const posthogToken = import.meta.env.VITE_POSTHOG_TOKEN?.trim();
const posthogHost = (import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/+$/, '');
let initialized = false;
let posthogClient: PostHog | null = null;
let initializationPromise: Promise<boolean> | null = null;
let lastPageView = { pathname: '', capturedAt: 0 };

function sanitizedUrl(value: unknown) {
  if (typeof value !== 'string' || !value) return value;

  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

export async function initializeAnalytics() {
  if (initialized) return true;
  if (!posthogToken || typeof window === 'undefined') return false;
  if (initializationPromise) return initializationPromise;

  initializationPromise = import('posthog-js').then(({ default: posthog }) => {
    posthogClient = posthog;
    posthog.init(posthogToken, {
      api_host: posthogHost,
      ui_host: 'https://us.posthog.com',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_performance: false,
      capture_exceptions: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_feature_flags: true,
      person_profiles: 'identified_only',
      persistence: 'localStorage',
      respect_dnt: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      before_send: (event) => {
        if (!event?.properties) return event;

        for (const property of ['$current_url', '$referrer', '$initial_referrer']) {
          event.properties[property] = sanitizedUrl(event.properties[property]);
        }
        return event;
      },
      loaded: () => {
        initialized = true;
      },
    });

    initialized = true;
    capturePageView(window.location.pathname);
    return true;
  }).catch(() => {
    posthogClient = null;
    return false;
  }).finally(() => {
    initializationPromise = null;
  });

  return initializationPromise;
}

export function capturePageView(pathname: string) {
  if (!initialized || !posthogClient) return;

  const now = Date.now();
  if (lastPageView.pathname === pathname && now - lastPageView.capturedAt < 500) return;
  lastPageView = { pathname, capturedAt: now };

  posthogClient.capture('$pageview', {
    $current_url: `${window.location.origin}${pathname}`,
    $pathname: pathname,
    app_version: __APP_VERSION__,
  });
}

export function disableAnalytics() {
  if (!initialized || !posthogClient) return;
  posthogClient.reset();
  posthogClient.opt_out_capturing();
  posthogClient = null;
  initialized = false;
  lastPageView = { pathname: '', capturedAt: 0 };
}
