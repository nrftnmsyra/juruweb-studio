'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { CTA_LINK } from '@/lib/landingData';
import { t, CLOCK_UNITS } from '@/lib/landingCopy';

// Set to an ISO date to pin the offer to a fixed deadline, e.g. '2026-10-15T23:59:59'.
// Left null, it counts to the end of the current month and rolls over on its own.
const OFFER_ENDS = null;

function deadline() {
  if (OFFER_ENDS) return new Date(OFFER_ENDS).getTime();
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
}

const pad = (n) => (n < 10 ? `0${n}` : String(n));

// Read the dismissal through useSyncExternalStore rather than an effect, so the
// server renders the bar and the client agrees on the first paint.
const neverChanges = () => () => {};
const wasDismissed = () => {
  try {
    return sessionStorage.getItem('jw-offer') === 'off';
  } catch {
    return false; // private mode or blocked storage, just show the bar
  }
};
const showOnServer = () => false;

/**
 * Launch offer banner. The clock counts to a real date rather than a rolling
 * timer, so reloading the page does not reset it.
 */
export default function OfferBar({ lang }) {
  const [closed, setClosed] = useState(false);
  const [left, setLeft] = useState(null);
  const dismissedEarlier = useSyncExternalStore(neverChanges, wasDismissed, showOnServer);
  const open = !closed && !dismissedEarlier;

  useEffect(() => {
    let end = deadline();
    const tick = () => {
      let ms = end - Date.now();
      if (ms <= 0) {
        end = deadline();
        ms = end - Date.now();
      }
      setLeft(ms);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  const units = CLOCK_UNITS[lang] || CLOCK_UNITS.en;
  // Render a placeholder until the first client tick, so server and client match.
  const clock =
    left === null
      ? '-'
      : `${Math.floor(left / 86400000)}${units[0]} ` +
        `${pad(Math.floor(left / 3600000) % 24)}${units[1]} ` +
        `${pad(Math.floor(left / 60000) % 60)}${units[2]} ` +
        `${pad(Math.floor(left / 1000) % 60)}${units[3]}`;

  const dismiss = () => {
    setClosed(true);
    try {
      sessionStorage.setItem('jw-offer', 'off');
    } catch {
      /* nothing to remember, the bar just returns next load */
    }
  };

  return (
    <div className="lp-offer">
      <div className="lp-wrap lp-offer-in">
        <span className="lp-offer-dot" />
        <span>{t(lang, 'offer.label')}</span>
        <span className="lp-offer-clock" suppressHydrationWarning>
          {clock}
        </span>
        <a className="lp-offer-cta" href={CTA_LINK} target="_blank" rel="noopener noreferrer">
          {t(lang, 'offer.cta')}
        </a>
        <button
          className="lp-offer-x"
          type="button"
          onClick={dismiss}
          aria-label={t(lang, 'offer.dismiss')}
        >
          &times;
        </button>
      </div>
    </div>
  );
}
