'use client';

import { MdSearch, MdNotifications, MdSettings, MdLogout, MdMenu } from 'react-icons/md';
import { logoutAction } from '@/app/login/actions';

export default function Header({ onMenuClick = () => {} }) {
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
        <button className="btn btn-secondary icon-btn hide-sm">
          <MdNotifications />
        </button>
        <button className="btn btn-secondary icon-btn hide-sm">
          <MdSettings />
        </button>

        <div className="hide-sm" style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="avatar">JW</div>
          <div className="header-user-info" style={{ flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Juruweb Admin</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Administrator</span>
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
