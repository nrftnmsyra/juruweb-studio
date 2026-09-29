'use client';

import { useState } from 'react';
import { MdContentCopy, MdCheck } from 'react-icons/md';

/**
 * The one script tag a client site needs. Picking a site rewrites the
 * data-website attribute, because that value is what every event is keyed on.
 */
export default function TrackingSnippet({ sites }) {
  const [domain, setDomain] = useState(sites[0]?.domain || 'example.com');
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window === 'undefined' ? 'https://juruweb-studio.vercel.app' : window.location.origin;
  const snippet = `<script defer src="${origin}/t.js" data-website="${domain}"></script>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the text is selectable below */
    }
  };

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Tracking snippet</div>
        <select
          id="snippet-site"
          className="form-input"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          style={{ width: 'auto', marginLeft: 'auto' }}
        >
          {sites.map((s) => (
            <option key={s.domain} value={s.domain}>
              {s.label || s.domain}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
          {copied ? <MdCheck /> : <MdContentCopy />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <pre
        style={{
          marginTop: '0.85rem',
          padding: '0.85rem 1rem',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          fontSize: '0.78rem',
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          overflowX: 'auto',
          userSelect: 'all',
        }}
      >
        {snippet}
      </pre>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.7rem', lineHeight: 1.6 }}>
        Paste into the <code>&lt;head&gt;</code> of that site. WhatsApp, phone and outbound clicks
        are tracked automatically — no extra code. For anything else, call{' '}
        <code>jw(&apos;form_submit&apos;, {'{'} label: &apos;contact&apos; {'}'})</code>.
      </p>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.6 }}>
        To check it works: open the site, then the Network tab, filter for <code>track</code> and
        expect a <strong>204</strong>.
      </p>
    </div>
  );
}
