'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  MdSpaceDashboard, 
  MdPeople, 
  MdDescription, 
  MdReceiptLong,
  MdWork,
  MdAccountBalanceWallet,
  MdLogout
} from 'react-icons/md';

export default function Sidebar({ open = false, onClose = () => {} }) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: <MdSpaceDashboard /> },
    { name: 'Customers', path: '/admin/customers', icon: <MdPeople /> },
    { name: 'Orders', path: '/admin/orders', icon: <MdWork /> },
    { name: 'Quotations', path: '/admin/quotations', icon: <MdDescription /> },
    { name: 'Invoices', path: '/admin/invoices', icon: <MdReceiptLong /> },
    { name: 'Ledger', path: '/admin/ledger', icon: <MdAccountBalanceWallet /> }
  ];

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <Link href="/admin" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Image
            src="/dark-bg-logo.png"
            alt="Juruweb Studio Logo"
            width={160}
            height={48}
            style={{ objectFit: 'contain' }}
            priority
          />
        </Link>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              href={item.path}
              onClick={onClose}
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
