import { redirect } from 'next/navigation';
import { getServerSupabase, getCurrentAdmin } from '@/lib/supabaseServer';
import { canViewAudit } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Audit Log — Juruweb Studio' };

const PAGE_SIZE = 100;

const ACTION_STYLE = {
  INSERT: { label: 'Created', bg: 'var(--success-glow)', fg: 'var(--success)' },
  UPDATE: { label: 'Changed', bg: 'var(--info-glow)', fg: 'var(--info)' },
  DELETE: { label: 'Deleted', bg: 'var(--error-glow)', fg: 'var(--error)' },
  LOGIN: { label: 'Signed in', bg: 'var(--bg-subtle)', fg: 'var(--text-secondary)' },
  LOGOUT: { label: 'Signed out', bg: 'var(--bg-subtle)', fg: 'var(--text-muted)' },
  DENIED: { label: 'Refused', bg: 'var(--warning-glow)', fg: 'var(--warning)' },
};

/** Fields that actually differ between the old and new row. */
function changedFields(oldData, newData) {
  if (!oldData || !newData) return [];
  return Object.keys(newData)
    .filter((k) => k !== 'id' && JSON.stringify(oldData[k]) !== JSON.stringify(newData[k]))
    .slice(0, 6);
}

function describe(entry) {
  if (entry.action === 'DENIED') return `Sign-in refused for ${entry.detail || 'unknown account'}`;
  if (entry.action === 'LOGIN' || entry.action === 'LOGOUT') return '—';

  const row = entry.new_data || entry.old_data || {};
  const name = row.name || row.title || row.package_type || row.description || null;

  if (entry.action === 'UPDATE') {
    const fields = changedFields(entry.old_data, entry.new_data);
    if (fields.length) return `${name ? `${name} — ` : ''}${fields.join(', ')}`;
  }
  return name || (entry.row_id ? `${entry.row_id.slice(0, 8)}…` : '—');
}

export default async function AuditPage({ searchParams }) {
  const me = await getCurrentAdmin();
  if (!canViewAudit(me)) redirect('/admin');

  const params = await searchParams;
  const page = Math.max(0, parseInt(params?.page ?? '0', 10) || 0);

  const supabase = await getServerSupabase();
  const { data: entries, count } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('occurred_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const total = count ?? 0;
  const hasMore = (page + 1) * PAGE_SIZE < total;

  return (
    <div className="page-body">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Audit log</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
          Every record created, changed or deleted, plus sign-ins. Written by database triggers, so
          it also catches changes made outside this dashboard. Nothing here can be edited.
        </p>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
          <thead>
            <tr>
              {['When', 'Who', 'Action', 'Record', 'Detail'].map((h) => (
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
              ))}
            </tr>
          </thead>
          <tbody>
            {(entries || []).map((entry) => {
              const style = ACTION_STYLE[entry.action] ?? {
                label: entry.action,
                bg: 'var(--bg-subtle)',
                fg: 'var(--text-secondary)',
              };
              return (
                <tr key={entry.id}>
                  <td style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {new Date(entry.occurred_at).toLocaleString('en-MY', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    {entry.actor_email || <span style={{ color: 'var(--text-muted)' }}>system</span>}
                  </td>
                  <td style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '99px',
                        background: style.bg,
                        color: style.fg,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {style.label}
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {entry.table_name || '—'}
                  </td>
                  <td style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                    {describe(entry)}
                  </td>
                </tr>
              );
            })}

            {(!entries || entries.length === 0) && (
              <tr>
                <td colSpan={5} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Nothing recorded yet. Entries appear as soon as someone signs in or changes a
                  record.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {total.toLocaleString('en-MY')} {total === 1 ? 'entry' : 'entries'}
          {total > 0 && ` · showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)}`}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {page > 0 && (
            <a className="btn btn-secondary btn-sm" href={`/admin/audit?page=${page - 1}`}>
              Newer
            </a>
          )}
          {hasMore && (
            <a className="btn btn-secondary btn-sm" href={`/admin/audit?page=${page + 1}`}>
              Older
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
