'use client';

import { useActionState } from 'react';
import { MdKey, MdContentCopy } from 'react-icons/md';
import { resetPassword } from './actions';

/**
 * Sets a fresh password and shows it once. Deliberately not emailed: Supabase's
 * default SMTP is rate-limited and unreliable, so the owner hands it over.
 */
export default function ResetPasswordButton({ email }) {
  const [state, formAction, pending] = useActionState(resetPassword, null);

  return (
    <div style={{ display: 'inline-block', textAlign: 'right' }}>
      <form action={formAction}>
        <input type="hidden" name="email" value={email} />
        <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}>
          <MdKey />
          <span>{pending ? 'Resetting…' : 'Reset password'}</span>
        </button>
      </form>

      {state?.error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: '0.76rem', marginTop: '0.35rem' }}>
          {state.error}
        </p>
      )}

      {state?.password && (
        <div
          style={{
            marginTop: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            justifyContent: 'flex-end',
          }}
        >
          <code
            style={{
              fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: 'var(--success-glow)',
              border: '1px solid var(--success)',
              borderRadius: '6px',
              padding: '0.2rem 0.45rem',
              userSelect: 'all',
            }}
          >
            {state.password}
          </code>
          <button
            type="button"
            className="btn btn-secondary icon-btn"
            title="Copy password"
            onClick={() => navigator.clipboard?.writeText(state.password)}
          >
            <MdContentCopy />
          </button>
        </div>
      )}
    </div>
  );
}
