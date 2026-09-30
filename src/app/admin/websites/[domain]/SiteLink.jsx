'use client';

import { useActionState } from 'react';
import { MdLink } from 'react-icons/md';
import { linkSite } from './keyActions';

/**
 * Links a website to the client and the order it was built under. Without
 * this the analytics list shows "Not linked", because monitored_sites is
 * seeded from domains alone and knows nothing about who paid for them.
 */
export default function SiteLink({ site, customers, orders }) {
  const [state, formAction, pending] = useActionState(linkSite, null);
  const linked = site.customer_name || site.project_ref;

  return (
    <div className="card" style={{ padding: '1.25rem', marginTop: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <MdLink style={{ color: 'var(--brand-pink-hover)' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Client &amp; project</span>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.6 }}>
        {linked
          ? 'Change who this website belongs to, or which order it was built under.'
          : 'This website is not linked to a client yet, so the analytics list shows a dash. Pick them here.'}
      </p>

      <form action={formAction} className="panel-form">
        <input type="hidden" name="domain" value={site.domain} />

        <label className="panel-field">
          <span className="form-label">Client</span>
          <select
            id="link-customer"
            name="customer_id"
            defaultValue={site.customer_id || ''}
            className="form-input form-input--sm"
          >
            <option value="">Not linked</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="panel-field">
          <span className="form-label">Project</span>
          <select
            id="link-order"
            name="order_id"
            defaultValue={site.order_id || ''}
            className="form-input form-input--sm"
          >
            <option value="">Not linked</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.project_ref} · {o.package_type} ({o.status})
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      </form>

      {state?.error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: '0.83rem', marginTop: '0.6rem' }}>
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p style={{ color: 'var(--success)', fontSize: '0.83rem', marginTop: '0.6rem', fontWeight: 500 }}>
          {state.ok}
        </p>
      )}
    </div>
  );
}
