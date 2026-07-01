'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { dbService } from '@/lib/database';
import DatabaseSetupHelper from '@/components/DatabaseSetupHelper';
import { 
  FiUsers, 
  FiBriefcase, 
  FiFileText, 
  FiDollarSign, 
  FiPlus, 
  FiArrowRight 
} from 'react-icons/fi';

export default function Home() {
  const [stats, setStats] = useState({
    customersCount: 0,
    activeOrdersCount: 0,
    pendingInvoicesValue: 0,
    totalRevenueVal: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [dbSetupRequired, setDbSetupRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const customersRes = await dbService.getCustomers();
        const ordersRes = await dbService.getOrders();
        const invoicesRes = await dbService.getInvoices();

        // Check if database setup is required
        if (customersRes.isDbSetupRequired || ordersRes.isDbSetupRequired || invoicesRes.isDbSetupRequired) {
          setDbSetupRequired(true);
        }

        const customers = customersRes.data || [];
        const orders = ordersRes.data || [];
        const invoices = invoicesRes.data || [];

        // Calculate count of active orders (status != Completed)
        const activeOrders = orders.filter(o => o.status !== 'Completed');
        
        // Calculate pending invoices value (amount due = total - paid)
        const pendingValue = invoices.reduce((acc, inv) => {
          if (inv.status !== 'Paid' && inv.status !== 'Cancelled') {
            return acc + (Number(inv.total) - Number(inv.amount_paid));
          }
          return acc;
        }, 0);

        // Total received revenue
        const totalRevenue = invoices.reduce((acc, inv) => {
          return acc + Number(inv.amount_paid);
        }, 0);

        setStats({
          customersCount: customers.length,
          activeOrdersCount: activeOrders.length,
          pendingInvoicesValue: pendingValue,
          totalRevenueVal: totalRevenue,
        });

        // Set most recent 5 orders
        setRecentOrders(orders.slice(0, 5));
      } catch (err) {
        console.error('Error loading dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Dashboard Overview...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Welcome to Juruweb Studio project control panel.</p>
        </div>
      </div>

      {dbSetupRequired && <DatabaseSetupHelper />}

      {/* Stats Counter Grid */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title">Total Customers</span>
            <span className="stat-value">{stats.customersCount}</span>
          </div>
          <div className="stat-icon">
            <FiUsers />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title">Active Orders</span>
            <span className="stat-value">{stats.activeOrdersCount}</span>
          </div>
          <div className="stat-icon">
            <FiBriefcase />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title">Outstanding Balance</span>
            <span className="stat-value">RM {stats.pendingInvoicesValue.toFixed(2)}</span>
          </div>
          <div className="stat-icon">
            <FiFileText />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title">Revenue (Received)</span>
            <span className="stat-value">RM {stats.totalRevenueVal.toFixed(2)}</span>
          </div>
          <div className="stat-icon">
            <FiDollarSign />
          </div>
        </div>
      </div>

      {/* Main Grid: Orders & Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        {/* Recent Orders Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Recent Customer Orders</h2>
            <Link href="/orders" className="btn btn-secondary btn-sm" style={{ gap: '0.25rem' }}>
              <span>View All</span>
              <FiArrowRight />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>
              No orders found. Set up some clients first.
            </p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Package Plan</th>
                    <th>ETA Deadline</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    let badgeClass = 'badge-new';
                    if (order.status === 'In Progress') badgeClass = 'badge-progress';
                    else if (order.status === 'Review') badgeClass = 'badge-review';
                    else if (order.status === 'Completed') badgeClass = 'badge-completed';

                    return (
                      <tr key={order.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{order.customer?.name || 'Unknown'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {order.customer?.company || 'Personal'}
                          </div>
                        </td>
                        <td>{order.package_type} Plan</td>
                        <td>{order.eta_date ? new Date(order.eta_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}</td>
                        <td>
                          <span className={`badge ${badgeClass}`}>{order.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Quick Actions</h2>
            
            <Link href="/customers?new=true" className="btn btn-primary" style={{ width: '100%', justifyContent: 'flex-start' }}>
              <FiPlus />
              <span>Add New Client</span>
            </Link>

            <Link href="/orders?new=true" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
              <FiPlus />
              <span>Create Client Order</span>
            </Link>

            <Link href="/quotations?new=true" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
              <FiPlus />
              <span>Generate Quotation</span>
            </Link>

            <Link href="/invoices?new=true" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
              <FiPlus />
              <span>Create Sales Invoice</span>
            </Link>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'linear-gradient(to bottom, #1f1420, var(--bg-card))', borderColor: '#4a154b' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--brand-pink)', fontWeight: 700 }}>Package Details Quick-Ref</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <li style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <strong style={{ color: 'white' }}>Basic Plan (RM 699)</strong>
                <div style={{ color: 'var(--text-secondary)' }}>1-page website, whatsapp integration • ETA 3-5 days</div>
              </li>
              <li style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <strong style={{ color: 'white' }}>Standard Plan (RM 999)</strong>
                <div style={{ color: 'var(--text-secondary)' }}>Multi-section website, 5 revisions • ETA 5-7 days</div>
              </li>
              <li>
                <strong style={{ color: 'white' }}>Premium Plan (RM 1,499)</strong>
                <div style={{ color: 'var(--text-secondary)' }}>Full product catalog, Booking, Unlimited revs • ETA 7-14 days</div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
