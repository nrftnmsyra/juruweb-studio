'use client';

import { useEffect } from 'react';

// Registers the service worker scoped to /admin only, so the public
// landing page is never treated as a PWA.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/admin' }).catch(() => {});
    }
  }, []);

  return null;
}
