'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker that makes the site installable and keeps the
 * last-seen listings readable when the signal drops mid-bazaar.
 *
 * Deliberately tiny and side-effect only — no state, no render.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* an unavailable service worker must never break the page */
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
