'use client';

import { useActionState, useState } from 'react';
import { MdKey, MdContentCopy, MdCheck, MdDescription } from 'react-icons/md';
import { issueClientKey, revokeClientKey } from './keyActions';

/**
 * The note that travels with the key. A key on its own invites guesswork, and
 * the guess people make is to call it from the browser, which both fails and
 * puts the key in a public bundle.
 */
function setupNote(apiKey, website, origin) {
  return `Juruweb Studio analytics API

Endpoint: GET ${origin}/api/client/analytics
Header:   X-API-Key: ${apiKey}
Query:    period=7d | 30d | 90d  (default 30d)

IMPORTANT: call this from your SERVER, never the browser.
There are no CORS headers, so a browser request fails, and a key in
client-side code is readable by anyone who opens devtools.

Next.js example (Route Handler or Server Component):

  const res = await fetch(
    '${origin}/api/client/analytics?period=30d',
    { headers: { 'X-API-Key': process.env.JURUWEB_API_KEY }, cache: 'no-store' }
  );
  const { traffic, health } = await res.json();

Returns:
  traffic - pageviews, sessions, visitors, actions, daily, topPages,
            sources, devices, browsers
  health  - up, responseMs, sslDaysLeft, seoScore, checkedAt

This key is valid for ${website} only. Store it in an environment
variable, not in the repository.`;
}

/** Shown once, right after issuing, only the hash is stored, so it cannot be re-read. */
function KeyHandoff({ apiKey, website }) {
  const [copied, setCopied] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  const origin =
    typeof window === 'undefined' ? 'https://juruweb-studio.vercel.app' : window.location.origin;

  const copyNote = () => {
    navigator.clipboard?.writeText(setupNote(apiKey, website, origin));
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 1800);
  };

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
          <span>{copied ? 'Copied' : 'Copy key'}</span>
        </button>
      </div>

      {/* The key alone invites guesswork, and the guess people make is to call
          the API from the browser. This sends the instructions with it. */}
      <div
        style={{
          marginTop: '0.85rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid var(--success)',
        }}
      >
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Sending this to whoever builds the client dashboard? Copy the setup note instead. It
          carries the key, the endpoint, a working Next.js snippet, and the warning that this must
          be called from the server, never the browser.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ marginTop: '0.6rem' }}
          onClick={copyNote}
        >
          {copiedNote ? <MdCheck /> : <MdDescription />}
          <span>{copiedNote ? 'Note copied' : 'Copy setup note'}</span>
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
      {state?.apiKey && <KeyHandoff apiKey={state.apiKey} website={website} />}

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
