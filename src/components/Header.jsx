'use client';

import { FiSearch, FiBell, FiSettings } from 'react-icons/fi';

export default function Header() {
  return (
    <header className="header">
      <div className="header-search">
        <FiSearch style={{ color: 'var(--text-muted)' }} />
        <input type="text" placeholder="Search orders, customers..." />
      </div>

      <div className="header-profile">
        <button 
          className="btn btn-secondary btn-sm"
          style={{ height: '36px', width: '36px', padding: 0 }}
        >
          <FiBell />
        </button>
        <button 
          className="btn btn-secondary btn-sm"
          style={{ height: '36px', width: '36px', padding: 0 }}
        >
          <FiSettings />
        </button>
        
        <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="avatar">JW</div>
          <div style={{ display: 'none', flexDirection: 'column', md: { display: 'flex' } }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Juruweb Admin</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}
