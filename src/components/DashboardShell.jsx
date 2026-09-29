'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardShell({ children, admin = null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} admin={admin} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <main className="main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} admin={admin} />
        <div style={{ flex: 1 }}>{children}</div>
      </main>
    </div>
  );
}
