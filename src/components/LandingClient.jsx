'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import { FaWhatsapp } from 'react-icons/fa';

import {
  CTA_LINK,
  IMG_BAND,
  IMG_CTA,
  ADDONS,
  REVIEWS,
  LANGS,
  TRADES,
  SITES,
  PACKAGES,
  DEFAULT_FEATURES,
  tierFor,
} from '@/lib/landingData';
import { t } from '@/lib/landingCopy';

import OfferBar from './landing/OfferBar';
import HeroMesh from './landing/HeroMesh';
import LiveBuild from './landing/LiveBuild';
import PortfolioWall from './landing/PortfolioWall';
import PackageMatrix from './landing/PackageMatrix';
import BuildTimeline from './landing/BuildTimeline';

// Archivo is a variable font; `wdth` gives the headlines their width morph.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--lp-font-sans',
  display: 'swap',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--lp-font-mono',
  display: 'swap',
});

/** Thin progress line pinned to the top of the viewport. */
function useScrollRail(ref) {
  useEffect(() => {
    let queued = false;
    const paint = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (ref.current) ref.current.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
      queued = false;
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(paint);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    paint();
    return () => window.removeEventListener('scroll', onScroll);
  }, [ref]);
}

/**
 * Reveals section rules and replays the stat count-up once each section scrolls
 * in. Figures sit in the DOM at their final value, so the page reads correctly
 * even if this never runs.
 */
function useReveal() {
  useEffect(() => {
    const sections = document.querySelectorAll('.lp-sec, .lp-band');
    if (!('IntersectionObserver' in window)) {
      sections.forEach((s) => s.classList.add('is-in'));
      return undefined;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          if (!reduce) {
            entry.target.querySelectorAll('[data-count]').forEach((el) => {
              const target = parseFloat(el.dataset.count);
              const prefix = el.dataset.prefix || '';
              const suffix = el.dataset.suffix || '';
              const started = performance.now();
              const step = (now) => {
                const k = Math.min((now - started) / 1100, 1);
                const eased = 1 - (1 - k) ** 3;
                el.textContent = `${prefix}${Math.round(target * eased)}${suffix}`;
                if (k < 1) requestAnimationFrame(step);
              };
              requestAnimationFrame(step);
            });
          }
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.18 }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
}

/** Pointer spotlight on the closing CTA. */
function useSpotlight(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let x = 0;
    let y = 0;
    let queued = false;
    const paint = () => {
      el.style.setProperty('--lp-mx', `${x}px`);
      el.style.setProperty('--lp-my', `${y}px`);
      queued = false;
    };
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
      if (!queued) {
        queued = true;
        requestAnimationFrame(paint);
      }
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    return () => el.removeEventListener('pointermove', onMove);
  }, [ref]);
}

export default function LandingClient() {
  const [lang, setLang] = useState('en');
  const [tradeId, setTradeId] = useState('rental');
  const [feats, setFeats] = useState(DEFAULT_FEATURES);

  const railRef = useRef(null);
  const ctaRef = useRef(null);
  useScrollRail(railRef);
  useReveal();
  useSpotlight(ctaRef);

  const tier = useMemo(() => tierFor(feats), [feats]);
  const matchCount = useMemo(
    () => SITES.filter((s) => s.trade === tradeId).length,
    [tradeId]
  );

  const tr = useCallback((key) => t(lang, key), [lang]);

  const ways = [
    { key: 'w1', ours: false },
    { key: 'w2', ours: false },
    { key: 'w3', ours: true },
  ];

  return (
    <div className={`lp ${archivo.variable} ${plexMono.variable}`} lang={lang}>
      <div className="lp-rail" ref={railRef} />
      <OfferBar lang={lang} />

      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Link href="/" className="lp-brand">
            <Image
              src="/light-bg-logo.png"
              alt="Juruweb Studio"
              width={132}
              height={38}
              style={{ objectFit: 'contain' }}
              priority
            />
          </Link>

          <nav className="lp-nav-links">
            <a href="#work">{tr('nav.work')}</a>
            <a href="#pricing">{tr('nav.pricing')}</a>
            <a href="#timeline">{tr('nav.timeline')}</a>
            <a href="#reviews">{tr('nav.reviews')}</a>
          </nav>

          <div className="lp-langs" role="group" aria-label={tr('nav.lang')}>
            {LANGS.map(([code, label]) => (
              <button
                key={code}
                id={`lang-${code}`}
                type="button"
                className="lp-lang"
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
              >
                {label}
              </button>
            ))}
          </div>

          <a
            className="lp-btn lp-btn--pink lp-btn--sm lp-nav-cta"
            href={CTA_LINK}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tr('nav.cta')}
          </a>
        </div>
      </header>

      <main id="top">
        <section className="lp-hero">
          <HeroMesh />
          <div className="lp-wrap lp-hero-in">
            <h1 className="lp-hero-title" key={lang}>
              {tr('hero.title')
                .split(' ')
                .map((word, i) => (
                  <span key={`${word}-${i}`} style={{ animationDelay: `${0.05 + i * 0.09}s` }}>
                    {word}{' '}
                  </span>
                ))}
            </h1>
            <p className="lp-hero-sub">{tr('hero.sub')}</p>

            <LiveBuild
              lang={lang}
              tradeId={tradeId}
              setTradeId={setTradeId}
              feats={feats}
              setFeats={setFeats}
              tier={tier}
            />
          </div>
        </section>

        <div className="lp-ticker" aria-hidden="true">
          <div className="lp-ticker-track">
            {[...SITES, ...SITES].map((s, i) => (
              <a
                key={`${s.domain}-${i}`}
                href={`https://${s.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={-1}
              >
                {s.domain}
              </a>
            ))}
          </div>
        </div>

        <section className="lp-sec" id="work">
          <div className="lp-wrap">
            <div className="lp-head">
              <h2>{tr('work.title')}</h2>
              <span className="lp-head-fact">
                <b>{matchCount}</b> {tr('work.fact')}
              </span>
            </div>
            <div className="lp-rule" />
            <p className="lp-head-sub">{tr('work.sub')}</p>
            <PortfolioWall tradeId={tradeId} />
          </div>
        </section>

        <section className="lp-band" style={{ '--lp-bg': `url(${IMG_BAND})` }}>
          <div className="lp-wrap lp-band-in">
            <div>
              <h2>{tr('band.title')}</h2>
              <p>{tr('band.sub')}</p>
            </div>
            <div className="lp-band-stats">
              <div>
                <b data-count="20" data-suffix="+">
                  20+
                </b>
                <span>{tr('band.1')}</span>
              </div>
              <div>
                <b data-count="14" data-prefix="3–">
                  3–14
                </b>
                <span>{tr('band.2')}</span>
              </div>
              <div>
                <b data-count="100" data-suffix="%">
                  100%
                </b>
                <span>{tr('band.3')}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="pricing">
          <div className="lp-wrap">
            <div className="lp-head">
              <h2>{tr('price.title')}</h2>
              <span className="lp-head-fact">{tr('price.fact')}</span>
            </div>
            <div className="lp-rule" />
            <p className="lp-head-sub">{tr('price.sub')}</p>

            <PackageMatrix lang={lang} tier={tier} />

            <div className="lp-addons">
              <h3>{tr('addons.title')}</h3>
              <div className="lp-addon-list">
                {ADDONS.map((a) => (
                  <div className="lp-addon" key={a.label}>
                    <span>{a.label}</span>
                    <span className="lp-fill" />
                    <strong>{a.price}</strong>
                  </div>
                ))}
              </div>
              <p className="lp-terms">{tr('terms')}</p>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="timeline">
          <div className="lp-wrap">
            <div className="lp-head">
              <h2>{tr('proc.title')}</h2>
              <span className="lp-head-fact">{tr('proc.fact')}</span>
            </div>
            <div className="lp-rule" />
            <BuildTimeline lang={lang} tier={tier} />
          </div>
        </section>

        <section className="lp-sec" id="ways">
          <div className="lp-wrap">
            <div className="lp-head">
              <h2>{tr('ways.title')}</h2>
              <span className="lp-head-fact">{tr('ways.fact')}</span>
            </div>
            <div className="lp-rule" />
            <p className="lp-head-sub">{tr('ways.sub')}</p>

            <div className="lp-ways">
              {ways.map(({ key, ours }) => (
                <div className={`lp-way ${ours ? 'is-ours' : ''}`} key={key}>
                  <h3>{tr(`${key}.t`)}</h3>
                  <p>{tr(`${key}.d`)}</p>
                  <dl>
                    <div>
                      <dt>{tr('w.cost')}</dt>
                      <dd>{ours ? 'RM 699 – 1,499' : tr(`${key}.cost`)}</dd>
                    </div>
                    <div>
                      <dt>{tr('w.time')}</dt>
                      <dd>{tr(`${key}.time`)}</dd>
                    </div>
                    <div>
                      <dt>{tr('w.own')}</dt>
                      <dd>{tr(`${key}.own`)}</dd>
                    </div>
                  </dl>
                  <p className="lp-way-best">{tr(`${key}.best`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec" id="reviews">
          <div className="lp-wrap">
            <div className="lp-head">
              <h2>{tr('rev.title')}</h2>
              <span className="lp-head-fact">{tr('rev.fact')}</span>
            </div>
            <div className="lp-rule" />
            <div className="lp-quotes">
              {REVIEWS.map((r) => (
                <blockquote className="lp-quote" key={r.quoteKey}>
                  <p>{tr(r.quoteKey)}</p>
                  <cite>
                    {r.name} · {r.role}
                  </cite>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-cta" ref={ctaRef} style={{ '--lp-bg': `url(${IMG_CTA})` }}>
          <div className="lp-wrap lp-cta-in">
            <h2>{tr('cta.title')}</h2>
            <p>{tr('cta.body')}</p>
            <a
              className="lp-btn lp-btn--pink"
              href={CTA_LINK}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp />
              <span>{tr('cta.button')}</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <span>{tr('foot.copy')}</span>
          <nav>
            <a href="#pricing">{tr('nav.pricing')}</a>
            <a href={CTA_LINK} target="_blank" rel="noopener noreferrer">
              {tr('foot.contact')}
            </a>
            <Link href="/login">{tr('foot.admin')}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// Re-exported so the data module stays the only place package facts live.
export { PACKAGES, TRADES };
