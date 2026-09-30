'use client';

import { PACKAGES, pick } from '@/lib/landingData';
import { t } from '@/lib/landingCopy';

// The scale runs to the longest package, so every bar shares one axis.
const SCALE_DAYS = Math.max(...PACKAGES.map((p) => p.days));
const TICKS = [0, 2, 4, 6, 8, 10, 12, 14].filter((d) => d <= SCALE_DAYS);

/**
 * The three stages drawn against a real day scale, sized to the recommended
 * package, "7–14 working days" as a picture rather than a phrase.
 */
export default function BuildTimeline({ lang, tier }) {
  const pkg = PACKAGES[tier];
  const stages = [t(lang, 'proc.1.t'), t(lang, 'proc.2.t'), t(lang, 'proc.3.t')];
  const notes = [t(lang, 'g.1'), t(lang, 'g.2'), t(lang, 'g.3')];

  let cursor = 0;
  const bars = pkg.split.map((len) => {
    const bar = { left: (cursor / SCALE_DAYS) * 100, width: (len / SCALE_DAYS) * 100 };
    cursor += len;
    return bar;
  });

  const total = {
    en: `Live in ${pkg.days} working days`,
    ms: `Siap dalam ${pkg.days} hari bekerja`,
    zh: `${pkg.days} 个工作日上线`,
  };

  return (
    <div className="lp-gantt">
      <div className="lp-g-top">
        <span className="lp-g-for">
          {t(lang, 'g.for')} <b>{pkg.name}</b>
        </span>
        <span className="lp-g-total">{pick(total, lang)}</span>
      </div>

      <div className="lp-g-scale">
        {TICKS.map((d) => (
          <span key={d} className="lp-g-tick" style={{ left: `${(d / SCALE_DAYS) * 100}%` }}>
            <span>{d === 0 ? t(lang, 'g.day0') : d}</span>
          </span>
        ))}
      </div>

      <div className="lp-g-rows">
        {stages.map((stage, i) => (
          <div className="lp-g-row" key={stage}>
            <div className="lp-g-label">
              <b>{stage}</b>
              <span>{notes[i]}</span>
            </div>
            <div className="lp-g-track">
              <div
                className="lp-g-bar"
                style={{ left: `${bars[i].left}%`, width: `${bars[i].width}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="lp-g-note">{t(lang, 'g.note')}</p>
    </div>
  );
}
