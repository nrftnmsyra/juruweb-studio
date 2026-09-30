'use client';

import { useActionState } from 'react';
import { MdAddLink } from 'react-icons/md';
import { addSite } from './actions';

export default function AddSiteForm({ customers }) {
  const [state, formAction, pending] = useActionState(addSite, null);

  return (
    <form action={formAction} className="card" style={{ padding: '1.25rem', marginTop: '1.25rem' }}>
      <div className="panel-form" style={{ gap: '0.75rem', marginTop: 0 }}>
        <label className="panel-field panel-field--wide">
          <span className="form-label">Website</span>
          <input
            id="site-domain"
            name="domain"
            type="text"
            required
            placeholder="catrumah.com.my"
            className="form-input"
          />
        </label>

        <label className="panel-field">
          <span className="form-label">Label (optional)</span>
          <input
            id="site-label"
            name="label"
            type="text"
            placeholder="Cat Rumah"
            className="form-input"
          />
        </label>

        <label className="panel-field">
          <span className="form-label">Client (optional)</span>
          <select id="site-customer" name="customer_id" defaultValue="" className="form-input">
            <option value="">Not linked</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="btn btn-primary" disabled={pending}>
          <MdAddLink />
          <span>{pending ? 'Adding…' : 'Watch site'}</span>
        </button>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.7rem' }}>
        Paste a full URL if it is easier. The scheme, www and any path are stripped automatically.
        Linking a client lets the monthly report name them.
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
