import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSupabase, getCurrentAdmin } from '@/lib/supabaseServer';
import {
  MdVisibility,
  MdTimeline,
  MdPeople,
  MdTouchApp,
  MdArticle,
  MdCallReceived,
  MdLabel,
  MdDevices,
  MdWeb,
  MdArrowBack,
} from 'react-icons/md';
import TrackingSnippet from './TrackingSnippet';
import ClientKeys from './ClientKeys';
import SiteLink from './SiteLink';
import ClientMembers from './ClientMembers';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Analytics · Juruweb Studio' };

const PERIODS = { '7d': 7, '30d': 30, '90d': 90 };

const cell = { padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-color)' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

/** Pink circle badge, sized to match the dashboard's other icon treatments. */
function CardIcon({ children }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        background: 'var(--brand-pink-glow)',
        color: 'var(--brand-pink-hover)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem',
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

function Stat({ label, value, hint, icon }) {
  return (
    <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <CardIcon>{icon}</CardIcon>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{label}</div>
      </div>
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

// Matches my_day() in SQL, which buckets in Malaysian time. Building the key
// from toISOString() would use UTC and shift every label by a day after 8am.
const MY_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

/**
 * Pageviews over time as an SVG line. Every day in the period is plotted, not
 * just the days that had traffic, so a gap reads as a quiet day rather than
 * being silently closed up.
 */
// endMs comes from the caller, which already resolved the period. Reading the
// clock in here would make the component impure.
function DailyChart({ daily, days, endMs }) {
  const byDay = new Map((daily || []).map((d) => [String(d.day), Number(d.views) || 0]));
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = MY_DAY.format(new Date(endMs - i * 86400000));
    series.push({ day: key, views: byDay.get(key) ?? 0 });
  }

  const peak = Math.max(1, ...series.map((s) => s.views));
  const W = 720;
  const H = 180;
  const PAD = 10;
  const xAt = (i) => (series.length < 2 ? W / 2 : PAD + (i * (W - PAD * 2)) / (series.length - 1));
  const yAt = (v) => H - PAD - (v / peak) * (H - PAD * 2);

  const line = series.map((s, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(s.views).toFixed(1)}`).join(' ');
  const area = `${line} L${xAt(series.length - 1).toFixed(1)},${H - PAD} L${xAt(0).toFixed(1)},${H - PAD} Z`;

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '0.75rem',
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pageviews per day</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          peak {peak.toLocaleString('en-MY')}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '180px', display: 'block', overflow: 'visible' }}
        role="img"
        aria-label={`Pageviews per day over the last ${days} days, peaking at ${peak}`}
      >
        <defs>
          <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-pink)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--brand-pink)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Baseline and midline, so the peak label has something to read against */}
        <line x1="0" y1={H - PAD} x2={W} y2={H - PAD} stroke="var(--border-color)" strokeWidth="1"
              vectorEffect="non-scaling-stroke" />
        <line x1="0" y1={yAt(peak / 2)} x2={W} y2={yAt(peak / 2)} stroke="var(--border-color)"
              strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />

        <path d={area} fill="url(#pvFill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--brand-pink)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* A single day cannot draw a line, so mark the point itself. */}
        {series.length < 2 || series.filter((s) => s.views > 0).length === 1 ? (
          series.map((s, i) =>
            s.views > 0 ? (
              <circle key={s.day} cx={xAt(i)} cy={yAt(s.views)} r="4" fill="var(--brand-pink)"
                      vectorEffect="non-scaling-stroke" />
            ) : null
          )
        ) : (
          <circle
            cx={xAt(series.length - 1)}
            cy={yAt(series[series.length - 1].views)}
            r="3.5"
            fill="var(--brand-pink)"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          marginTop: '0.5rem',
        }}
      >
        <span>{series[0]?.day}</span>
        <span>{series[series.length - 1]?.day}</span>
      </div>
    </div>
  );
}

function Breakdown({ title, rows, keyName, valueName, icon }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.9rem 1rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <CardIcon>{icon}</CardIcon>
        {title}
      </div>
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
                {r[keyName] || '-'}
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

export default async function SiteAnalyticsPage({ params: routeParams, searchParams }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/login');

  const { domain } = await routeParams;
  const website = decodeURIComponent(domain).toLowerCase();

  const params = await searchParams;
  const period = PERIODS[params?.period] ? params.period : '30d';
  const days = PERIODS[period];

  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);

  const supabase = await getServerSupabase();
  const [{ data: summary }, { data: sites }, { data: apiKeys }, { data: customers }, { data: orders }] =
    await Promise.all([
    supabase.rpc('analytics_summary', {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_website: website,
    }),
    supabase
      .from('site_status')
      .select('domain, label, customer_id, order_id, customer_name, project_ref, tracking_enabled')
      .eq('domain', website)
      .maybeSingle(),
    supabase
      .from('client_api_keys')
      .select('id, label, key_hint, active, last_used_at')
      .eq('website', website)
      .order('created_at', { ascending: false }),
    supabase.from('customers').select('id, name').order('name'),
    supabase
      .from('orders')
      .select('id, project_ref, package_type, status')
      .order('project_ref', { ascending: true }),
  ]);

  if (!sites) notFound();
  const site = sites;

  const s = summary || {};
  const totals = s.totals || {};
  const daily = s.daily || [];
  const hasData = (totals.events ?? 0) > 0;

  const mkHref = (next) =>
    `/admin/websites/${encodeURIComponent(website)}?period=${next.period ?? period}`;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link
            href="/admin/websites"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '0.3rem',
            }}
          >
            <MdArrowBack /> All websites
          </Link>
          <h1 className="page-title">{site.label || site.domain}</h1>
          <p className="page-subtitle">
            {site.domain}
            {site.customer_name ? ` · ${site.customer_name}` : ''}
            {site.project_ref ? ` · ${site.project_ref}` : ''}
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
      </div>

      {!hasData ? (
        // No outer card: TrackingSnippet is already one, and nesting them gave
        // two borders and two sets of padding that did not line up.
        <>
          <div style={{ marginBottom: '1.1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>No traffic recorded yet</h2>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                marginTop: '0.4rem',
                maxWidth: '64ch',
              }}
            >
              Nothing appears here until the tracking snippet is live on this site.
              The first visit shows up within seconds of adding it.
            </p>
          </div>
        </>
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
              icon={<MdVisibility />} label="Pageviews"
              value={Number(totals.views || 0).toLocaleString('en-MY')}
              hint={`over ${days} days`}
            />
            <Stat icon={<MdTimeline />} label="Sessions" value={Number(totals.sessions || 0).toLocaleString('en-MY')} />
            <Stat
              icon={<MdPeople />} label="Visitors"
              value={Number(totals.visitors || 0).toLocaleString('en-MY')}
              hint="unique, cookie-free"
            />
            <Stat
              icon={<MdTouchApp />} label="Clicks & actions"
              value={Number(totals.clicks || 0).toLocaleString('en-MY')}
              hint="WhatsApp, phone, outbound"
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <DailyChart daily={daily} days={days} endMs={to.getTime()} />
          </div>

          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            }}
          >
            <Breakdown icon={<MdArticle />} title="Top pages" rows={s.pages || []} keyName="path" valueName="views" />
            <Breakdown
              icon={<MdCallReceived />} title="Where visitors came from"
              rows={s.referrers || []}
              keyName="source"
              valueName="views"
            />
            <Breakdown
              icon={<MdLabel />} title="Clicks by label"
              rows={s.labels || []}
              keyName="label"
              valueName="count"
            />
            <Breakdown
              icon={<MdDevices />} title="Devices"
              rows={Object.entries(s.devices || {}).map(([k, v]) => ({ k, v }))}
              keyName="k"
              valueName="v"
            />
            <Breakdown
              icon={<MdWeb />} title="Browsers"
              rows={Object.entries(s.browsers || {}).map(([k, v]) => ({ k, v }))}
              keyName="k"
              valueName="v"
            />
          </div>

        </>
      )}

      {/* Outside the conditional on purpose: you link a site to its client and
          hand out its snippet before it has any traffic, not after. These used
          to sit in the hasData branch, so they were invisible on exactly the
          sites that still needed setting up. */}
      <div style={{ marginTop: '1.5rem' }}>
        <TrackingSnippet sites={[site]} />
        <SiteLink site={site} customers={customers || []} orders={orders || []} />
        <ClientMembers domain={site.domain} projectRef={site.project_ref} />
        <ClientKeys website={site.domain} keys={apiKeys || []} />
      </div>
    </div>
  );
}
