'use client';

import { useActionState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MdArrowForward } from 'react-icons/md';
import { signInAction } from './actions';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInAction, null);

  return (
    <div className="login-page">
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(circle at 15% 20%, rgba(255, 62, 165, 0.18), transparent 45%), radial-gradient(circle at 85% 15%, rgba(255, 62, 165, 0.12), transparent 42%)',
          zIndex: -1,
        }}
      />

      <form action={formAction} className="login-card">
        <Image
          src="/dark-bg-logo.png"
          alt="Juruweb Studio"
          width={160}
          height={45}
          style={{ objectFit: 'contain' }}
          priority
        />

        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Sign in to the admin dashboard.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '0.85rem', width: '100%' }}>
          <label style={{ display: 'block' }}>
            <span className="form-label">Email</span>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              placeholder="you@juruweb.com"
              className="form-input"
              style={{ width: '100%' }}
            />
          </label>

          <label style={{ display: 'block' }}>
            <span className="form-label">Password</span>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="form-input"
              style={{ width: '100%' }}
            />
          </label>
        </div>

        {state?.error && (
          <p
            role="alert"
            style={{
              color: 'var(--error)',
              background: 'var(--error-glow)',
              border: '1px solid var(--error)',
              borderRadius: '10px',
              padding: '0.7rem 0.9rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              lineHeight: 1.5,
              width: '100%',
            }}
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending}
          style={{ width: '100%', opacity: pending ? 0.6 : 1 }}
        >
          <span>{pending ? 'Signing in…' : 'Sign in'}</span>
          {!pending && <MdArrowForward />}
        </button>

        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          Forgot your password?
          <br />
          Ask the owner to reset it from Admin Users.
        </p>

        <Link href="/track" className="login-track-link">
          Are you a customer? Track your order &amp; payment &rarr;
        </Link>
      </form>
    </div>
  );
}
