import Image from 'next/image';
import Link from 'next/link';
import { MdLock } from 'react-icons/md';
import { FcGoogle } from 'react-icons/fc';
import { signInWithGoogle } from './actions';

const ERRORS = {
  not_allowed:
    'That Google account is not on the admin list. Ask the owner to add it, then try again.',
  missing_code: 'Google did not send a sign-in code back. Please try again.',
  access_denied: 'Sign-in was cancelled.',
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const raw = typeof params?.error === 'string' ? params.error : null;
  const message = raw ? (ERRORS[raw] ?? raw) : null;

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

      <form action={signInWithGoogle} className="login-card">
        <Image
          src="/dark-bg-logo.png"
          alt="Juruweb Studio"
          width={160}
          height={45}
          style={{ objectFit: 'contain' }}
          priority
        />

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'var(--brand-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#18181b',
              fontSize: '1.3rem',
              margin: '0 auto 1rem',
              boxShadow: '0 8px 20px rgba(255, 102, 196, 0.35)',
            }}
          >
            <MdLock />
          </div>
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
            Sign in with the Google account on the admin list.
          </p>
        </div>

        {message && (
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
            }}
          >
            {message}
          </p>
        )}

        <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
          <FcGoogle size={18} />
          <span>Continue with Google</span>
        </button>

        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          Sign-ins and changes to records are recorded in the audit log.
        </p>

        <Link href="/track" className="login-track-link">
          Are you a customer? Track your order &amp; payment &rarr;
        </Link>
      </form>
    </div>
  );
}
