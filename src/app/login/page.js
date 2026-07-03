'use client';

import { useRef, useState } from 'react';
import { useActionState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MdLock, MdArrowForward } from 'react-icons/md';
import { loginAction } from './actions';

const CODE_LENGTH = 6;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''));
  const inputsRef = useRef([]);

  const passcode = digits.join('');

  const handleChange = (index, value) => {
    const char = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);

    if (char && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

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

      <form
        action={formAction}
        onPaste={handlePaste}
        className="login-card"
      >
        <input type="hidden" name="passcode" value={passcode} />

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
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Enter your passcode to access the admin dashboard.
          </p>
        </div>

        <div className="passcode-inputs">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputsRef.current[index] = el)}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              autoFocus={index === 0}
              className="passcode-input"
            />
          ))}
        </div>

        {state?.error && (
          <p style={{ color: 'var(--error)', fontSize: '0.85rem', fontWeight: 500, marginTop: '-0.5rem' }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending || passcode.length !== CODE_LENGTH}
          style={{ width: '100%', opacity: pending || passcode.length !== CODE_LENGTH ? 0.6 : 1 }}
        >
          <span>{pending ? 'Verifying...' : 'Unlock Dashboard'}</span>
          {!pending && <MdArrowForward />}
        </button>

        <Link href="/track" className="login-track-link">
          Are you a customer? Track your order &amp; payment →
        </Link>
      </form>
    </div>
  );
}
