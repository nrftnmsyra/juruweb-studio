import { redirect } from 'next/navigation';
import { getServerSupabase, getCurrentAdmin } from '@/lib/supabaseServer';
import TrackingSnippet from './TrackingSnippet';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Analytics — Juruweb Studio' };

const PERIODS = { '7d': 7, '30d': 30, '90d': 90 };

const cell = { padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-color)' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

function Stat({ label, value, hint }) {
  return (
    <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{label}</div>
      <div
        style={{
          fontSize: '1.9rem',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          marginTop: '0.25rem',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
          {hint}
        </div>
      )}
    </div>
  );
}

/** Bar chart drawn as divs — no library for eleven bars. */
function DailyChart({ daily }) {
  const max = Math.max(1, ...daily.map((d) => d.views));
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
        Pageviews per day
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '140px' }}>
        {daily.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${d.views} views, ${d.sessions} sessions`}
            style={{
              flex: 1,
              minWidth: '3px',
              height: `${Math.max(2, (d.views / max) * 100)}%`,
              background: 'var(--brand-pink)',
              opacity: d.views ? 1 : 0.25,
              borderRadius: '3px 3px 0 0',
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          marginTop: '0.5rem',
        }}
      >
        <span>{daily[0]?.day ?? ''}</span>
        <span>{daily[daily.length - 1]?.day ?? ''}</span>
      </div>
    </div>
  );
}

function Breakdown({ title, rows, keyName, valueName }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td style={{ ...cell, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Nothing yet
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={`${r[keyName]}-${i}`}>
              <td style={{ ...cell, fontSize: '0.85rem', wordBreak: 'break-all' }}>
                {r[keyName] || '—'}
              </td>
              <td style={{ ...num, fontSize: '0.85rem', fontWeight: 600, width: '5rem' }}>
                {Number(r[valueName]).toLocaleString('en-MY')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/login');

  const params = await searchParams;
  const period = PERIODS[params?.period] ? params.period : '30d';
  const website = params?.website || null;
  const days = PERIODS[period];

  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);

  const supabase = await getServerSupabase();
  const [{ data: summary }, { data: sites }] = await Promise.all([
    supabase.rpc('analytics_summary', {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_website: website,
    }),
    supabase.from('monitored_sites').select('domain, label, tracking_enabled').order('domain'),
  ]);

  const s = summary || {};
  const totals = s.totals || {};
  const daily = s.daily || [];
  const hasData = (totals.events ?? 0) > 0;

  const mkHref = (next) => {
    const q = new URLSearchParams();
    q.set('period', next.period ?? period);
    if (next.website ?? website) q.set('website', next.website ?? website);
    return `/admin/analytics?${q}`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            Traffic from our own tracker — no Google account involved. Days are counted in Malaysian
          time, and visitors are identified without cookies.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        {Object.keys(PERIODS).map((p) => (
          <a
            key={p}
            href={mkHref({ period: p })}
            className={`btn btn-sm ${p === period ? 'btn-primary' : 'btn-secondary'}`}
          >
            Last {PERIODS[p]} days
          </a>
        ))}

        <form style={{ marginLeft: 'auto' }}>
          <input type="hidden" name="period" value={period} />
          <select
            id="site-filter"
            name="website"
            defaultValue={website || ''}
            className="form-input"
            style={{ width: 'auto' }}
            // Native form submit on change keeps this a server component.
            suppressHydrationWarning
          >
            <option value="">All websites</option>
            {(sites || []).map((x) => (
              <option key={x.domain} value={x.domain}>
                {x.label || x.domain}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-secondary btn-sm" style={{ marginLeft: '0.5rem' }}>
            Filter
          </button>
        </form>
      </div>

      {!hasData ? (
        <div className="card" style={{ padding: '2rem 1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No traffic recorded yet</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Nothing will appear here until the tracking script is on at least one client site. Add
            the snippet below to the <code>&lt;head&gt;</code>, and the first visit shows up within
            seconds.
          </p>
          <TrackingSnippet sites={sites || []} />
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              marginBottom: '1.25rem',
            }}
          >
            <Stat
              label="Pageviews"
              value={Number(totals.views || 0).toLocaleString('en-MY')}
              hint={`over ${days} days`}
            />
            <Stat label="Sessions" value={Number(totals.sessions || 0).toLocaleString('en-MY')} />
            <Stat
              label="Visitors"
              value={Number(totals.visitors || 0).toLocaleString('en-MY')}
              hint="unique, cookie-free"
            />
            <Stat
              label="Clicks & actions"
              value={Number(totals.clicks || 0).toLocaleString('en-MY')}
              hint="WhatsApp, phone, outbound"
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <DailyChart daily={daily} />
          </div>

          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            }}
          >
            <Breakdown title="Top pages" rows={s.pages || []} keyName="path" valueName="views" />
            <Breakdown
              title="Where visitors came from"
              rows={s.referrers || []}
              keyName="source"
              valueName="views"
            />
            <Breakdown
              title="Websites"
              rows={s.sites || []}
              keyName="website"
              valueName="views"
            />
            <Breakdown
              title="Clicks by label"
              rows={s.labels || []}
              keyName="label"
              valueName="count"
            />
            <Breakdown
              title="Devices"
              rows={Object.entries(s.devices || {}).map(([k, v]) => ({ k, v }))}
              keyName="k"
              valueName="v"
            />
            <Breakdown
              title="Browsers"
              rows={Object.entries(s.browsers || {}).map(([k, v]) => ({ k, v }))}
              keyName="k"
              valueName="v"
            />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <TrackingSnippet sites={sites || []} />
          </div>
        </>
      )}
    </div>
  );
}
