'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { dbService } from '@/lib/database';
import DatabaseSetupHelper from '@/components/DatabaseSetupHelper';
import { MdAdd, MdArrowForward } from 'react-icons/md';

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
        <p style={{ color: 'var(--text-secondary)' }}>Loading overview...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Welcome to Juruweb Studio project control panel.</p>
        </div>
      </div>

      {dbSetupRequired && <DatabaseSetupHelper />}

      {/* KPI row */}
      <div className="overview-stats">
        <div className="overview-stat">
          <span className="overview-stat-label">Customers</span>
          <span className="overview-stat-value">{stats.customersCount}</span>
        </div>
        <div className="overview-stat">
          <span className="overview-stat-label">Active Orders</span>
          <span className="overview-stat-value">{stats.activeOrdersCount}</span>
        </div>
        <div className="overview-stat">
          <span className="overview-stat-label">Outstanding</span>
          <span className="overview-stat-value">RM {stats.pendingInvoicesValue.toFixed(2)}</span>
        </div>
        <div className="overview-stat">
          <span className="overview-stat-label">Revenue</span>
          <span className="overview-stat-value">RM {stats.totalRevenueVal.toFixed(2)}</span>
        </div>
      </div>

      {/* Recent orders */}
      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Orders</h2>
          <Link href="/orders" className="link-subtle">
            <span>View all</span>
            <MdArrowForward />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No orders yet. Add a client to get started.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table data-table--stack">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Package</th>
                  <th>ETA</th>
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
                        <div className="u-caps" style={{ fontWeight: 600 }}>{order.customer?.name || 'Unknown'}</div>
                        <div className="u-caps" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {order.customer?.company || 'Personal'}
                        </div>
                      </td>
                      <td data-label="Package">{order.package_type} Plan</td>
                      <td data-label="ETA" style={{ whiteSpace: 'nowrap' }}>{order.eta_date ? new Date(order.eta_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}</td>
                      <td data-label="Status">
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

      {/* Quick actions */}
      <div style={{ marginTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Quick Actions</h2>
        <div className="overview-actions">
          <Link href="/customers?new=true" className="overview-action">
            <span className="quick-action-icon"><MdAdd /></span>
            <span>Add Client</span>
          </Link>
          <Link href="/orders?new=true" className="overview-action">
            <span className="quick-action-icon"><MdAdd /></span>
            <span>New Order</span>
          </Link>
          <Link href="/quotations?new=true" className="overview-action">
            <span className="quick-action-icon"><MdAdd /></span>
            <span>New Quotation</span>
          </Link>
          <Link href="/invoices?new=true" className="overview-action">
            <span className="quick-action-icon"><MdAdd /></span>
            <span>New Invoice</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
