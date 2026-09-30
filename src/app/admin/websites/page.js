import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MdInsights, MdChevronRight, MdLanguage } from 'react-icons/md';
import { getServerSupabase, getCurrentAdmin } from '@/lib/supabaseServer';
import MonitorTools from './MonitorTools';
import AddSiteForm from './AddSiteForm';
import ConfirmSubmit from '@/components/ConfirmSubmit';
import { toggleSite, removeSite } from './actions';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Manage websites · Juruweb Studio' };

const cell = { padding: '0.8rem 1rem', borderBottom: '1px solid var(--border-color)' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const head = {
  padding: '0.75rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border-color)',
  whiteSpace: 'nowrap',
};
const sub = { fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 400 };

/** Days left, coloured by how close it is to biting. */
function Expiry({ label, days, date }) {
  if (days === null || days === undefined) return null;
  const tone =
    days <= 14 ? 'var(--error)' : days <= 30 ? 'var(--warning)' : 'var(--text-secondary)';
  return (
    <div
      style={{ fontSize: '0.8rem', color: tone, fontWeight: days <= 30 ? 600 : 400 }}
      title={date ? new Date(date).toLocaleDateString('en-MY') : undefined}
    >
      {label} {days < 0 ? 'expired' : `${days}d`}
    </div>
  );
}

function SeoScore({ score }) {
  if (score === null || score === undefined) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>-</span>;
  }
  const tone = score >= 85 ? 'var(--success)' : score >= 65 ? 'var(--warning)' : 'var(--error)';
  return (
    <span style={{ color: tone, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{score}</span>
  );
}

/**
 * One page, one row per client website. Health and traffic used to live on two
 * separate pages listing the same sites, which meant reading one to know a site
 * was down and the other to know whether anyone had noticed. Adding a site is
 * here too, so the list you add to is the list you then look at.
 *
 * The numbers themselves stay on each site's own page: a figure summed across
 * every client at once answers no question anybody actually asks.
 */
export default async function ManageWebsites() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/login');

  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400000);

  const supabase = await getServerSupabase();
  const [{ data: sites }, { data: totals }, { data: customers }] = await Promise.all([
    supabase.from('site_status').select('*').order('domain'),
    supabase.rpc('site_view_totals', { p_from: from.toISOString(), p_to: to.toISOString() }),
    supabase.from('customers').select('id, name').order('name'),
  ]);

  const byDomain = new Map((totals || []).map((t) => [t.website, t]));
  const list = sites || [];

  const down = list.filter((s) => s.checked_at && !s.ok);
  const expiringSoon = list.filter(
    (s) =>
      (s.ssl_days_left !== null && s.ssl_days_left <= 30) ||
      (s.domain_days_left !== null && s.domain_days_left <= 30)
  );
  const neverChecked = list.filter((s) => !s.checked_at).length;
  const live = list.filter((s) => (byDomain.get(s.domain)?.views ?? 0) > 0).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage websites</h1>
          <p className="page-subtitle">
            Every live client site, checked once a day at 9am for uptime, certificate and domain
            expiry and SEO basics, beside the traffic our own tracker recorded. Open one for its
            full dashboard, its snippet and its dashboard users.
          </p>
        </div>
      </div>

      {(down.length > 0 || expiringSoon.length > 0) && (
        <div
          className="card"
          style={{
            padding: '1rem 1.15rem',
            marginBottom: '1.25rem',
            borderLeft: '3px solid var(--error)',
          }}
        >
          {down.length > 0 && (
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--error)' }}>
              {down.length} site{down.length > 1 ? 's' : ''} did not answer:{' '}
              {down.map((s) => s.domain).join(', ')}
            </p>
          )}
          {expiringSoon.length > 0 && (
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                marginTop: down.length ? '0.5rem' : 0,
              }}
            >
              Expiring within 30 days:{' '}
              {expiringSoon
                .map((s) => {
                  const which = s.ssl_days_left !== null && s.ssl_days_left <= 30 ? 'SSL' : 'domain';
                  const d = which === 'SSL' ? s.ssl_days_left : s.domain_days_left;
                  return `${s.domain} (${which}, ${d}d)`;
                })
                .join(' · ')}
            </p>
          )}
        </div>
      )}

      <MonitorTools siteCount={list.length} neverChecked={neverChecked} />

      <AddSiteForm customers={customers || []} />

      <div className="card" style={{ marginTop: '1.25rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead>
            <tr>
              <th style={{ ...head, textAlign: 'left' }}>Website</th>
              <th style={{ ...head, textAlign: 'left' }}>Client</th>
              <th style={{ ...head, textAlign: 'left' }}>Status</th>
              <th style={{ ...head, textAlign: 'left' }}>Expiry</th>
              <th style={{ ...head, textAlign: 'left' }}>SEO</th>
              <th style={{ ...head, textAlign: 'right' }}>Views (30d)</th>
              <th style={head} />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const t = byDomain.get(s.domain);
              const views = Number(t?.views ?? 0);
              const sessions = Number(t?.sessions ?? 0);
              const href = `/admin/websites/${encodeURIComponent(s.domain)}`;
              const hasExpiry = s.ssl_days_left !== null || s.domain_days_left !== null;

              return (
                <tr key={s.id} style={{ opacity: s.active ? 1 : 0.55 }}>
                  <td style={{ ...cell, fontWeight: 500 }}>
                    <Link
                      href={href}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}
                    >
                      <MdLanguage style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span>
                        {s.label || s.domain}
                        <span
                          style={{
                            ...sub,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            marginTop: '0.15rem',
                          }}
                        >
                          {/* Only when the label says something the domain does
                              not, otherwise the row prints the domain twice. */}
                          {s.label && s.label !== s.domain && <span>{s.domain}</span>}
                          {s.project_ref && (
                            <span
                              style={{
                                fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: 'var(--brand-pink-hover)',
                                background: 'var(--brand-pink-glow)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '5px',
                              }}
                            >
                              {s.project_ref}
                            </span>
                          )}
                          {!s.active && <span>Paused</span>}
                        </span>
                      </span>
                    </Link>
                  </td>

                  <td style={{ ...cell, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {s.customer_name || '-'}
                  </td>

                  <td style={cell}>
                    {!s.checked_at ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        Not checked yet
                      </span>
                    ) : (
                      <>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '99px',
                            background: s.ok ? 'var(--success-glow)' : 'var(--error-glow)',
                            color: s.ok ? 'var(--success)' : 'var(--error)',
                          }}
                          title={s.error || `HTTP ${s.status_code}`}
                        >
                          {s.ok ? `${s.response_ms}ms` : 'Down'}
                        </span>
                        <span style={{ ...sub, display: 'block', marginTop: '0.25rem' }}>
                          {new Date(s.checked_at).toLocaleString('en-MY', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </>
                    )}
                  </td>

                  <td style={cell}>
                    {hasExpiry ? (
                      <>
                        <Expiry label="SSL" days={s.ssl_days_left} date={s.ssl_expires_at} />
                        <Expiry
                          label="Domain"
                          days={s.domain_days_left}
                          date={s.domain_expires_at}
                        />
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>-</span>
                    )}
                  </td>

                  <td style={cell}>
                    <SeoScore score={s.seo_score} />
                  </td>

                  <td style={{ ...num, fontWeight: 600 }}>
                    {views ? (
                      <>
                        {views.toLocaleString('en-MY')}
                        <span style={{ ...sub, display: 'block', marginTop: '0.15rem' }}>
                          {sessions.toLocaleString('en-MY')} session{sessions === 1 ? '' : 's'}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>-</span>
                    )}
                  </td>

                  <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <Link href={href} className="btn btn-secondary btn-sm">
                        <MdInsights />
                        <span>Open</span>
                        <MdChevronRight />
                      </Link>
                      <form action={toggleSite}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="active" value={String(!s.active)} />
                        <button type="submit" className="btn btn-secondary btn-sm">
                          {s.active ? 'Pause' : 'Resume'}
                        </button>
                      </form>
                      <ConfirmSubmit
                        action={removeSite}
                        fields={{ id: s.id }}
                        title="Remove this website?"
                        message={`${s.domain} will stop being checked, and its entire check history goes with it. Monthly reports covering past months will lose this site. Pause it instead if you only want to stop the daily checks.`}
                      >
                        Remove
                      </ConfirmSubmit>
                    </div>
                  </td>
                </tr>
              );
            })}

            {list.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}
                >
                  No websites yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem', lineHeight: 1.6 }}>
        {live} of {list.length} site{list.length === 1 ? '' : 's'} recorded traffic in the last 30
        days. A dash under Views means the tracking snippet is not on that site yet, open the site to
        copy it. Domain expiry comes from RDAP, which not every registry runs. MYNIC, which handles
        .my, does not, so those show nothing. SSL expiry is read straight off the certificate and
        works everywhere.
      </p>
    </div>
  );
}
