'use client';

import { useActionState } from 'react';
import { MdPersonAdd, MdContentCopy } from 'react-icons/md';
import { ROLE_ADMIN, ROLE_OWNER, ROLE_LABELS, ROLE_HINTS } from '@/lib/auth';
import { addAdmin } from './actions';

/** Shown once after a password is set — it is not stored anywhere readable. */
function PasswordHandoff({ label, password }) {
  return (
    <div
      style={{
        marginTop: '0.85rem',
        padding: '0.85rem 1rem',
        borderRadius: '10px',
        background: 'var(--success-glow)',
        border: '1px solid var(--success)',
      }}
    >
      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <code
          style={{
            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
            fontSize: '1rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.4rem 0.7rem',
            userSelect: 'all',
          }}
        >
          {password}
        </code>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigator.clipboard?.writeText(password)}
        >
          <MdContentCopy />
          <span>Copy</span>
        </button>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.6rem' }}>
        Send this to them now — it is not shown again. You can always reset it.
      </p>
    </div>
  );
}

export default function AddAdminForm() {
  const [state, formAction, pending] = useActionState(addAdmin, null);

  return (
    <form action={formAction} className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        <label style={{ flex: '2 1 15rem', minWidth: 0 }}>
          <span className="form-label">Email</span>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            placeholder="staff@juruweb.com"
            className="form-input"
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ flex: '1 1 9rem', minWidth: 0 }}>
          <span className="form-label">Name (optional)</span>
          <input
            id="admin-name"
            name="full_name"
            type="text"
            placeholder="Staff name"
            className="form-input"
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ flex: '1 1 10rem', minWidth: 0 }}>
          <span className="form-label">Password (optional)</span>
          <input
            id="admin-password"
            name="password"
            type="text"
            autoComplete="new-password"
            placeholder="Leave blank to generate"
            className="form-input"
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ flex: '0 1 8rem', minWidth: 0 }}>
          <span className="form-label">Role</span>
          <select
            id="admin-role"
            name="role"
            defaultValue={ROLE_ADMIN}
            className="form-input"
            style={{ width: '100%' }}
          >
            <option value={ROLE_ADMIN}>{ROLE_LABELS[ROLE_ADMIN]}</option>
            <option value={ROLE_OWNER}>{ROLE_LABELS[ROLE_OWNER]}</option>
          </select>
        </label>

        <button type="submit" className="btn btn-primary" disabled={pending}>
          <MdPersonAdd />
          <span>{pending ? 'Creating…' : 'Create account'}</span>
        </button>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
        Creates the sign-in account and adds them to the admin list in one step.{' '}
        {ROLE_HINTS[ROLE_OWNER]}
      </p>

      {state?.error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '0.6rem', fontWeight: 500 }}>
          {state.error}
        </p>
      )}

      {state?.ok && !state.password && (
        <p style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '0.6rem', fontWeight: 500 }}>
          {state.ok}
        </p>
      )}

      {state?.ok && state.password && (
        <PasswordHandoff label={state.ok} password={state.password} />
      )}
    </form>
  );
}
