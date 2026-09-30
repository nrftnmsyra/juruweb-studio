import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MdInsights, MdChevronRight, MdLanguage } from 'react-icons/md';
import { getServerSupabase, getCurrentAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Analytics · Juruweb Studio' };

const cell = { padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

/**
 * One row per client website. A combined dashboard across seventeen sites says
 * very little, you almost always want one client, so this lists them and the
 * numbers live on each site's own page.
 */
export default async function AnalyticsIndex() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/login');

  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400000);

  const supabase = await getServerSupabase();
  const [{ data: sites }, { data: totals }] = await Promise.all([
    supabase
      .from('site_status')
      .select('domain, label, customer_name, project_ref, active, tracking_enabled')
      .order('domain'),
    supabase.rpc('site_view_totals', { p_from: from.toISOString(), p_to: to.toISOString() }),
  ]);

  const byDomain = new Map((totals || []).map((t) => [t.website, t]));
  const list = sites || [];
  const live = list.filter((s) => (byDomain.get(s.domain)?.views ?? 0) > 0).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            Traffic from our own tracker, per client website. Pick one to see its dashboard.
          </p>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
          <thead>
            <tr>
              {['Website', 'Client', 'Project', 'Views (30d)', 'Sessions', ''].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: h.includes('(') || h === 'Sessions' ? 'right' : 'left',
                    padding: '0.75rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border-color)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const t = byDomain.get(s.domain);
              const views = Number(t?.views ?? 0);
              return (
                <tr key={s.domain} style={{ opacity: s.active ? 1 : 0.55 }}>
                  <td style={{ ...cell, fontWeight: 500 }}>
                    <Link
                      href={`/admin/analytics/${encodeURIComponent(s.domain)}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}
                    >
                      <MdLanguage style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span>
                        {s.label || s.domain}
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.74rem',
                            color: 'var(--text-muted)',
                            fontWeight: 400,
                          }}
                        >
                          {s.domain}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td style={{ ...cell, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {s.customer_name || '-'}
                  </td>
                  <td style={cell}>
                    {s.project_ref ? (
                      <span
                        style={{
                          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: 'var(--brand-pink-hover)',
                          background: 'var(--brand-pink-glow)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                        }}
                      >
                        {s.project_ref}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        Not linked
                      </span>
                    )}
                  </td>
                  <td style={{ ...num, fontWeight: 600 }}>
                    {views ? (
                      views.toLocaleString('en-MY')
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>-</span>
                    )}
                  </td>
                  <td style={{ ...num, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {Number(t?.sessions ?? 0).toLocaleString('en-MY') || '-'}
                  </td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    <Link
                      href={`/admin/analytics/${encodeURIComponent(s.domain)}`}
                      className="btn btn-secondary btn-sm"
                    >
                      <MdInsights />
                      <span>View</span>
                      <MdChevronRight />
                    </Link>
                  </td>
                </tr>
              );
            })}

            {list.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}
                >
                  No websites yet. Add one from Monitoring.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem', lineHeight: 1.6 }}>
        {live} of {list.length} sites have recorded traffic in the last 30 days. A dash means the
        tracking snippet is not on that site yet. Open the site to get its snippet.
      </p>
    </div>
  );
}
