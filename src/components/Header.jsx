'use client';

import { MdSearch, MdLogout, MdMenu } from 'react-icons/md';
import { logoutAction } from '@/app/login/actions';
import { ROLE_LABELS } from '@/lib/auth';

/** Initials for the avatar: from the name if we have one, else the email. */
function initials(admin) {
  const source = admin?.full_name || admin?.email || '';
  if (!source) return 'JW';
  const parts = source.split(/[\s.@_-]+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join('') || 'JW').toUpperCase();
}

export default function Header({ onMenuClick = () => {}, admin = null }) {
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
        <button className="btn btn-secondary icon-btn hamburger" onClick={onMenuClick} aria-label="Open menu">
          <MdMenu />
        </button>
        <div className="header-search">
          <MdSearch style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search orders, customers..." />
        </div>
      </div>

      <div className="header-profile">
        {/* The notification and settings buttons had no onClick, they did
            nothing at all. A control that looks clickable and isn't is worse
            than no control, so they are gone until there is something for
            them to open. */}

        <div className="hide-sm" style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="avatar">{initials(admin)}</div>
          <div className="header-user-info" style={{ flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {admin?.full_name || admin?.email || 'Juruweb Admin'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {ROLE_LABELS[admin?.role] ?? 'Administrator'}
            </span>
          </div>
        </div>

        <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>

        <form action={logoutAction}>
          <button type="submit" className="btn btn-secondary icon-btn" title="Log out">
            <MdLogout />
          </button>
        </form>
      </div>
    </header>
  );
}
