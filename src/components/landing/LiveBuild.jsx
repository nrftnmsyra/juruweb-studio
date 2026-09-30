'use client';

import { useEffect, useRef, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { MdCheck } from 'react-icons/md';
import {
  CTA_LINK,
  WHATSAPP_NUMBER,
  TRADES,
  FEATURES,
  PACKAGES,
  pick,
} from '@/lib/landingData';
import { t } from '@/lib/landingCopy';
import SitePreview from './SitePreview';

const TIER_NAMES = PACKAGES.map((p) => p.name);

/** The message the visitor sends us, their whole build in four lines. */
export function buildSpec({ trade, feats, pkg, lang }) {
  const picked = FEATURES.filter((f) => feats[f.id]).map((f) => pick(f.label, lang));
  return [
    t(lang, 'spec.head'),
    `${t(lang, 'spec.business')}: ${pick(trade.label, lang)}`,
    `${t(lang, 'spec.package')}: ${pkg.name} (${pkg.price})`,
    `${t(lang, 'spec.timeline')}: ${pick(pkg.timeline, lang)}`,
    `${t(lang, 'spec.needs')}: ${picked.length ? picked.join(', ') : '-'}`,
  ].join('\n');
}

/**
 * The control panel and the live preview. Lifting state to LandingClient lets the
 * portfolio, the package matrix and the build timeline follow the same choices.
 */
export default function LiveBuild({ lang, tradeId, setTradeId, feats, setFeats, tier }) {
  const trade = TRADES.find((x) => x.id === tradeId) || TRADES[0];
  const pkg = PACKAGES[tier];
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const prevTier = useRef(tier);
  const [bump, setBump] = useState(false);

  // Nudge the price when the recommendation actually changes tier.
  useEffect(() => {
    if (prevTier.current !== tier) {
      setBump(true);
      const id = setTimeout(() => setBump(false), 520);
      prevTier.current = tier;
      return () => clearTimeout(id);
    }
    return undefined;
  }, [tier]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const flash = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  const spec = buildSpec({ trade, feats, pkg, lang });
  const sendHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(spec)}`
    : CTA_LINK;

  const copySpec = async () => {
    try {
      await navigator.clipboard.writeText(spec);
      flash(t(lang, 'ro.copied'));
    } catch {
      flash(t(lang, 'ro.copyFail'));
    }
  };

  const toggle = (id) => setFeats((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      <div className="lp-stage">
        <div className="lp-panel">
          <div className="lp-panel-bar">
            <span className="lp-pulse" />
            <span>{t(lang, 'panel.bar')}</span>
          </div>

          <div className="lp-panel-body">
            <fieldset className="lp-fset">
              <legend>{t(lang, 'panel.trade')}</legend>
              <div className="lp-chips">
                {TRADES.map((tr) => (
                  <button
                    key={tr.id}
                    id={`trade-${tr.id}`}
                    type="button"
                    className="lp-chip"
                    aria-pressed={tr.id === tradeId}
                    onClick={() => setTradeId(tr.id)}
                  >
                    {pick(tr.label, lang)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="lp-fset">
              <legend>{t(lang, 'panel.feat')}</legend>
              <div className="lp-opts">
                {FEATURES.map((f) => (
                  <button
                    key={f.id}
                    id={`feat-${f.id}`}
                    type="button"
                    className="lp-opt"
                    aria-pressed={!!feats[f.id]}
                    onClick={() => toggle(f.id)}
                  >
                    <span className="lp-box">
                      <MdCheck />
                    </span>
                    <span className="lp-opt-l">{pick(f.label, lang)}</span>
                    <em>
                      {TIER_NAMES[f.tier]}
                      {f.tier < TIER_NAMES.length - 1 ? '+' : ''}
                    </em>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="lp-readout">
            <div className="lp-ro-top">
              <div>
                <div className="lp-ro-tier">{t(lang, 'ro.tier')}</div>
                <div className="lp-ro-name">{pkg.name}</div>
              </div>
              <div className={`lp-ro-price ${bump ? 'is-bump' : ''}`}>{pkg.price}</div>
            </div>

            <div className="lp-ro-meta">
              <span>
                <b>{t(lang, 'ro.time')}</b> <span>{pick(pkg.timeline, lang)}</span>
              </span>
              <span>
                <b>{t(lang, 'ro.rev')}</b> <span>{pick(pkg.revisions, lang)}</span>
              </span>
            </div>

            <div className="lp-ro-acts">
              <a
                className="lp-btn lp-btn--pink"
                href={sendHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaWhatsapp />
                <span>{t(lang, 'ro.send')}</span>
              </a>
              <button className="lp-btn lp-btn--line" type="button" onClick={copySpec}>
                {t(lang, 'ro.copy')}
              </button>
            </div>
          </div>
        </div>

        <SitePreview trade={trade} feats={feats} lang={lang} />
      </div>

      <div className={`lp-toast ${toast ? 'is-on' : ''}`} role="status">
        {toast}
      </div>
    </>
  );
}
