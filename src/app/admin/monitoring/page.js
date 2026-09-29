import { redirect } from 'next/navigation';
import { getServerSupabase, getCurrentAdmin } from '@/lib/supabaseServer';
import MonitorTools from './MonitorTools';
import AddSiteForm from './AddSiteForm';
import { toggleSite, removeSite } from './actions';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Website Monitoring — Juruweb Studio' };

const cell = { padding: '0.8rem 1rem', borderBottom: '1px solid var(--border-color)' };

/** Days left, coloured by how close it is to biting. */
function Expiry({ days, date }) {
  if (days === null || days === undefined) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>;
  }
  const tone =
    days < 0 ? 'var(--error)' : days <= 14 ? 'var(--error)' : days <= 30 ? 'var(--warning)' : 'var(--text-secondary)';
  return (
    <span
      style={{ color: tone, fontSize: '0.85rem', fontWeight: days <= 30 ? 600 : 400 }}
      title={date ? new Date(date).toLocaleDateString('en-MY') : undefined}
    >
      {days < 0 ? 'Expired' : `${days}d`}
    </span>
  );
}

function SeoScore({ score }) {
  if (score === null || score === undefined) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>;
  }
  const tone = score >= 85 ? 'var(--success)' : score >= 65 ? 'var(--warning)' : 'var(--error)';
  return (
    <span style={{ color: tone, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{score}</span>
  );
}

export default async function MonitoringPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/login');

  const supabase = await getServerSupabase();
  const [{ data: sites }, { data: customers }] = await Promise.all([
    supabase.from('site_status').select('*').order('domain'),
    supabase.from('customers').select('id, name').order('name'),
  ]);

  const list = sites || [];
  const down = list.filter((s) => s.checked_at && !s.ok);
  const expiringSoon = list.filter(
    (s) =>
      (s.ssl_days_left !== null && s.ssl_days_left <= 30) ||
      (s.domain_days_left !== null && s.domain_days_left <= 30)
  );
  const neverChecked = list.filter((s) => !s.checked_at).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Website monitoring</h1>
          <p className="page-subtitle">
            Every live client site is checked once a day at 9am — certificate and domain expiry, SEO
          basics, and whether it answered at all.
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
                  const which =
                    s.ssl_days_left !== null && s.ssl_days_left <= 30 ? 'SSL' : 'domain';
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
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
          <thead>
            <tr>
              {['Website', 'Client', 'Status', 'SSL', 'Domain', 'SEO', 'Last checked', ''].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
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
                )
              )}
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} style={{ opacity: s.active ? 1 : 0.5 }}>
                <td style={{ ...cell, fontWeight: 500 }}>
                  <a
                    href={`https://${s.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {s.label || s.domain}
                  </a>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{s.domain}</div>
                </td>
                <td style={{ ...cell, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {s.customer_name || '—'}
                </td>
                <td style={cell}>
                  {!s.checked_at ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      Not checked yet
                    </span>
                  ) : (
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
                  )}
                </td>
                <td style={cell}>
                  <Expiry days={s.ssl_days_left} date={s.ssl_expires_at} />
                </td>
                <td style={cell}>
                  <Expiry days={s.domain_days_left} date={s.domain_expires_at} />
                </td>
                <td style={cell}>
                  <SeoScore score={s.seo_score} />
                </td>
                <td style={{ ...cell, fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {s.checked_at
                    ? new Date(s.checked_at).toLocaleString('en-MY', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </td>
                <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <form action={toggleSite}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={String(!s.active)} />
                      <button type="submit" className="btn btn-secondary btn-sm">
                        {s.active ? 'Pause' : 'Resume'}
                      </button>
                    </form>
                    <form action={removeSite}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="btn btn-danger btn-sm">
                        Remove
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}

            {list.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No sites yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem', lineHeight: 1.6 }}>
        Domain expiry comes from RDAP, which not every registry runs — MYNIC, which handles .my, does
        not, so those show a dash. SSL expiry is read straight off the certificate and works
        everywhere.
      </p>
    </div>
  );
}
