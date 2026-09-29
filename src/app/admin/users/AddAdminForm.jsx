'use client';

import { useActionState } from 'react';
import { MdPersonAdd } from 'react-icons/md';
import { ROLE_ADMIN, ROLE_OWNER, ROLE_LABELS, ROLE_HINTS } from '@/lib/auth';
import { addAdmin } from './actions';

export default function AddAdminForm() {
  const [state, formAction, pending] = useActionState(addAdmin, null);

  return (
    <form action={formAction} className="card" style={{ padding: '1.25rem' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'flex-end',
        }}
      >
        <label style={{ flex: '2 1 16rem', minWidth: 0 }}>
          <span className="form-label">Google account email</span>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            placeholder="name@gmail.com"
            className="form-input"
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ flex: '1 1 10rem', minWidth: 0 }}>
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

        <label style={{ flex: '0 1 9rem', minWidth: 0 }}>
          <span className="form-label">Role</span>
          <select id="admin-role" name="role" defaultValue={ROLE_ADMIN} className="form-input" style={{ width: '100%' }}>
            <option value={ROLE_ADMIN}>{ROLE_LABELS[ROLE_ADMIN]}</option>
            <option value={ROLE_OWNER}>{ROLE_LABELS[ROLE_OWNER]}</option>
          </select>
        </label>

        <button type="submit" className="btn btn-primary" disabled={pending}>
          <MdPersonAdd />
          <span>{pending ? 'Adding…' : 'Add admin'}</span>
        </button>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
        {ROLE_HINTS[ROLE_OWNER]}
      </p>

      {state?.error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '0.6rem', fontWeight: 500 }}>
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '0.6rem', fontWeight: 500 }}>
          {state.ok}
        </p>
      )}
    </form>
  );
}
