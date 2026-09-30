'use client';

import { FaWhatsapp } from 'react-icons/fa';
import { CTA_LINK, PACKAGES, MATRIX, pick } from '@/lib/landingData';
import { t } from '@/lib/landingCopy';

/**
 * Packages as one comparison table rather than three cards, a visitor comparing
 * features reads down a single axis instead of scrolling between columns.
 * The column matching the Live Build recommendation is highlighted.
 */
export default function PackageMatrix({ lang, tier }) {
  const cell = (value) => {
    if (value === null) return { className: 'lp-no', text: '-' };
    if (value === true) return { className: 'lp-yes', text: t(lang, 'price.included') };
    return { className: 'lp-yes', text: pick(value, lang) };
  };

  return (
    <div className="lp-mx-scroll">
      <table className="lp-mx">
        <caption className="lp-sr-only">{t(lang, 'price.title')}</caption>
        <colgroup>
          <col />
          {PACKAGES.map((p, i) => (
            <col key={p.name} className={i === tier ? 'is-pick' : undefined} />
          ))}
        </colgroup>

        <thead>
          <tr>
            <th scope="col" className="lp-mx-row-h">
              {t(lang, 'price.colHead')}
            </th>
            {PACKAGES.map((p, i) => (
              <th scope="col" key={p.name} className={i === tier ? 'is-pick' : undefined}>
                <span className="lp-mx-flag">{t(lang, 'price.yourBuild')}</span>
                <span className="lp-mx-name">{p.name}</span>
                <span className="lp-mx-price">{p.price}</span>
                <span className="lp-mx-sub">{pick(p.sub, lang)}</span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {MATRIX.map((row) => (
            <tr key={row.label.en}>
              <th scope="row" className="lp-mx-row-h">
                {pick(row.label, lang)}
              </th>
              {row.cells.map((value, i) => {
                const c = cell(value);
                return (
                  <td key={PACKAGES[i].name} className={`${c.className} ${i === tier ? 'is-pick' : ''}`}>
                    {c.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr>
            <td />
            {PACKAGES.map((p, i) => (
              <td key={p.name} className={i === tier ? 'is-pick' : undefined}>
                <a
                  className="lp-btn lp-btn--line"
                  href={CTA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaWhatsapp />
                  <span>
                    {t(lang, 'price.choose')} {p.name}
                  </span>
                </a>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
