'use client';

import { SITES, WIREFRAMES } from '@/lib/landingData';

/**
 * Sixteen real client sites drawn as page skeletons. Hovering renders a card
 * block by block; the visitor's own trade sorts to the front.
 */
export default function PortfolioWall({ tradeId }) {
  return (
    <div className="lp-wall">
      {SITES.map((site, i) => {
        const match = site.trade === tradeId;
        return (
          <a
            key={site.domain}
            className={`lp-card ${match ? 'is-match' : 'is-dim'}`}
            style={{ order: match ? 0 : 1 }}
            href={`https://${site.domain}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="lp-wf">
              {WIREFRAMES[i % WIREFRAMES.length].map(([cols, rowSpan, kind], n) => (
                <div
                  key={n}
                  className="lp-wb"
                  data-k={kind || undefined}
                  style={{
                    gridColumn: `span ${cols}`,
                    gridRow: `span ${rowSpan}`,
                    '--i': n,
                  }}
                />
              ))}
            </div>
            <div className="lp-card-meta">
              <span className="lp-card-name">{site.name}</span>
              <span className="lp-card-dom">{site.domain}</span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
