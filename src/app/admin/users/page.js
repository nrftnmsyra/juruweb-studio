import { redirect } from 'next/navigation';
import { getServerSupabase, getCurrentAdmin } from '@/lib/supabaseServer';
import { ROLE_ADMIN, ROLE_OWNER, ROLE_LABELS, ROLE_HINTS, canManageUsers } from '@/lib/auth';
import AddAdminForm from './AddAdminForm';
import ResetPasswordButton from './ResetPasswordButton';
import { setAdminActive, removeAdmin } from './actions';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Admin Users · Juruweb Studio' };

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function UsersPage() {
  const me = await getCurrentAdmin();
  if (!canManageUsers(me)) redirect('/admin');

  const supabase = await getServerSupabase();
  const { data: admins } = await supabase
    .from('admins')
    .select('email, full_name, role, active, created_at, last_seen, created_by')
    .order('role', { ascending: true })
    .order('email', { ascending: true });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin users</h1>
          <p className="page-subtitle">
            Creating an admin here makes their sign-in account and adds them to this list. Anyone not
          listed is turned away, and the attempt is recorded in the audit log.
          </p>
        </div>
      </div>

      <AddAdminForm />

      <div className="card" style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
          <thead>
            <tr>
              {['Email', 'Name', 'Role', 'Last signed in', 'Added', ''].map((h) => (
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
            {(admins || []).map((a) => {
              const isMe = a.email === me.email;
              return (
                <tr key={a.email} style={{ opacity: a.active ? 1 : 0.5 }}>
                  <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 500 }}>
                    {a.email}
                    {isMe && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (you)</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    {a.full_name || '-'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <span
                      title={ROLE_HINTS[a.role]}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '99px',
                        background: a.role === ROLE_OWNER ? 'var(--brand-pink-glow)' : 'var(--bg-subtle)',
                        color: a.role === ROLE_OWNER ? 'var(--brand-pink-hover)' : 'var(--text-secondary)',
                      }}
                    >
                      {ROLE_LABELS[a.role] ?? a.role}
                    </span>
                    {!a.active && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        suspended
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {formatDate(a.last_seen)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {formatDate(a.created_at)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <ResetPasswordButton email={a.email} />
                      {!isMe && (
                        <>
                          <form action={setAdminActive}>
                            <input type="hidden" name="email" value={a.email} />
                            <input type="hidden" name="active" value={String(!a.active)} />
                            <button type="submit" className="btn btn-secondary btn-sm">
                              {a.active ? 'Suspend' : 'Restore'}
                            </button>
                          </form>
                          <form action={removeAdmin}>
                            <input type="hidden" name="email" value={a.email} />
                            <button type="submit" className="btn btn-danger btn-sm">
                              Remove
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem', lineHeight: 1.6 }}>
        You cannot suspend or remove your own account, that would leave nobody able to manage this
        list. {ROLE_LABELS[ROLE_ADMIN]}s can work on customers, orders, quotations, invoices and the
        ledger, but cannot see this page or the audit log.
      </p>
    </div>
  );
}
