'use client';

import { useActionState, useState } from 'react';
import { MdKey, MdContentCopy, MdCheck } from 'react-icons/md';
import { issueClientKey, revokeClientKey } from './keyActions';

/** Shown once, right after issuing, only the hash is stored, so it cannot be re-read. */
function KeyHandoff({ apiKey }) {
  const [copied, setCopied] = useState(false);
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
      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>
        Copy this now, it is not shown again
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <code
          style={{
            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
            fontSize: '0.8rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.4rem 0.7rem',
            userSelect: 'all',
            wordBreak: 'break-all',
          }}
        >
          {apiKey}
        </code>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            navigator.clipboard?.writeText(apiKey);
            setCopied(true);
          }}
        >
          {copied ? <MdCheck /> : <MdContentCopy />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}

export default function ClientKeys({ website, keys }) {
  const [state, formAction, pending] = useActionState(issueClientKey, null);

  return (
    <div className="card" style={{ padding: '1.25rem', marginTop: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <MdKey style={{ color: 'var(--brand-pink-hover)' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Client dashboard access</span>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.6 }}>
        Issue a key so this client&apos;s own dashboard can read its traffic. The key is bound to{' '}
        <strong>{website}</strong> and returns nothing about any other site, and nothing about
        orders, invoices or the ledger.
      </p>

      <form action={formAction} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
        <input type="hidden" name="website" value={website} />
        <input
          id="key-label"
          name="label"
          type="text"
          placeholder="What is it for, e.g. Teratak dashboard"
          className="form-input form-input--sm"
          style={{ flex: '1 1 16rem', minWidth: 0 }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? 'Issuing…' : 'Issue key'}
        </button>
      </form>

      {state?.error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: '0.83rem', marginTop: '0.6rem' }}>
          {state.error}
        </p>
      )}
      {state?.apiKey && <KeyHandoff apiKey={state.apiKey} />}

      {keys.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} style={{ opacity: k.active ? 1 : 0.5 }}>
                <td style={{ padding: '0.6rem 0', borderTop: '1px solid var(--border-color)', fontSize: '0.84rem' }}>
                  {k.label || 'Unnamed key'}
                  <span
                    style={{
                      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)',
                      marginLeft: '0.5rem',
                    }}
                  >
                    ····{k.key_hint}
                  </span>
                </td>
                <td
                  style={{
                    padding: '0.6rem 0',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '0.76rem',
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                  }}
                >
                  {k.last_used_at
                    ? `used ${new Date(k.last_used_at).toLocaleDateString('en-MY')}`
                    : 'never used'}
                </td>
                <td style={{ padding: '0.6rem 0', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
                  {k.active && (
                    <form action={revokeClientKey}>
                      <input type="hidden" name="id" value={k.id} />
                      <input type="hidden" name="website" value={website} />
                      <button type="submit" className="btn btn-danger btn-sm">
                        Revoke
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
