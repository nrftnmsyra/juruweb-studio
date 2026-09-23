'use client';

import { FaWhatsapp } from 'react-icons/fa';
import { pick } from '@/lib/landingData';
import { t } from '@/lib/landingCopy';

/** One collapsible block of the mock site. Height animates via grid-template-rows. */
function Block({ on, heading, children }) {
  return (
    <div className={`lp-pb ${on ? 'is-on' : ''}`}>
      <div className="lp-pbi">
        {heading ? <div className="lp-s-h">{heading}</div> : null}
        {children}
      </div>
    </div>
  );
}

/**
 * The stage: a miniature website that assembles itself from the visitor's picks.
 * Everything is drawn in CSS, so it needs no images and stays sharp at any size.
 */
export default function SitePreview({ trade, feats, lang }) {
  return (
    <div className="lp-stage-side">
      <div className="lp-device">
        <div className="lp-dev-bar">
          <span className="lp-dev-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="lp-dev-url">
            https://<b>{trade.url}</b>
          </span>
        </div>

        <div className="lp-site">
          <div className="lp-s-nav">
            <span className="lp-s-logo" />
            <span className="lp-s-brand">{pick(trade.brand, lang)}</span>
            <u />
            <u />
            <u />
            <span className="lp-s-cta">{t(lang, 's.cta')}</span>
          </div>

          <div className="lp-s-body">
            <Block on>
              <div className="lp-s-hero-row">
                <div>
                  <div className="lp-s-title">{pick(trade.title, lang)}</div>
                  <div className="lp-s-lede">{pick(trade.lede, lang)}</div>
                  <span className="lp-s-btn">{t(lang, 's.book')}</span>
                </div>
                <div className="lp-s-hero-img" />
              </div>
            </Block>

            <Block on={feats.catalog} heading={t(lang, 's.catalog')}>
              <div className="lp-s-cards">
                {[0, 1, 2].map((i) => (
                  <div className="lp-s-card" key={i}>
                    <i />
                    <b />
                    <s />
                  </div>
                ))}
              </div>
            </Block>

            <Block on={feats.booking} heading={t(lang, 's.booking')}>
              <div className="lp-s-form">
                <i />
                <i />
                <span />
              </div>
            </Block>

            <Block on={feats.gallery} heading={t(lang, 's.gallery')}>
              <div className="lp-s-gal">
                <i />
                <i />
                <i />
                <i />
              </div>
            </Block>

            <Block on={feats.maps} heading={t(lang, 's.maps')}>
              <div className="lp-s-map" />
            </Block>

            <Block on={feats.social} heading={t(lang, 's.social')}>
              <div className="lp-s-social">
                <i />
                <i />
                <i />
                <i />
              </div>
            </Block>
          </div>

          <div className="lp-s-foot">
            <i />
            <i />
            <i />
          </div>

          <div className={`lp-s-wa ${feats.whatsapp ? 'is-on' : ''}`} aria-hidden="true">
            <FaWhatsapp />
          </div>
        </div>
      </div>
    </div>
  );
}
