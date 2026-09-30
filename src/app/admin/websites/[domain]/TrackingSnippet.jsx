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
      /* clipboard blocked, the text is selectable below */
    }
  };

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div className="toolbar">
        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Tracking snippet</div>
        {/* Grouped so the select and the button stay together when the row
            wraps on a phone, instead of the button dropping onto a line of
            its own. */}
        <div className="toolbar-end">
          <select
            id="snippet-site"
            className="form-input form-input--sm"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            style={{ maxWidth: '13rem' }}
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

      {/* Inline <code> inside flowing text wrapped mid-token and looked broken,
          so the details sit on their own lines instead. */}
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '0.9rem 0 0',
          display: 'grid',
          gap: '0.35rem',
          fontSize: '0.79rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}
      >
        <li>Paste it into the &lt;head&gt; of that site.</li>
        <li>WhatsApp, phone and outbound clicks are tracked automatically.</li>
        <li>To verify: open the site, Network tab, filter for “track”, expect 204.</li>
      </ul>
    </div>
  );
}
