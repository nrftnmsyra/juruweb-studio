'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  FiGrid, 
  FiUsers, 
  FiFileText, 
  FiCompass, 
  FiBriefcase, 
  FiLogOut 
} from 'react-icons/fi';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <FiGrid /> },
    { name: 'Customers', path: '/customers', icon: <FiUsers /> },
    { name: 'Orders', path: '/orders', icon: <FiBriefcase /> },
    { name: 'Quotations', path: '/quotations', icon: <FiFileText /> },
    { name: 'Invoices', path: '/invoices', icon: <FiCompass /> }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Image 
            src="/light-bg-logo.PNG" 
            alt="Juruweb Studio Logo" 
            width={120} 
            height={36} 
            style={{ objectFit: 'contain' }}
            priority
          />
        </Link>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Link 
              key={item.name} 
              href={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-link-icon" style={{ display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <span>V1.0.0</span>
          <span>Active</span>
        </div>
      </div>
    </aside>
  );
}
