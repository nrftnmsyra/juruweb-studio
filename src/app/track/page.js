'use client';

import { useState } from 'react';
import Image from 'next/image';
import { dbService } from '@/lib/database';
import PdfDocumentPreview from '@/components/PdfDocumentPreview';
import InvoiceDocument from '@/components/InvoiceDocument';
import {
  MdSearch, MdCalendarToday, MdAccessTime, MdCheckCircle, MdError,
  MdReceiptLong, MdWork, MdAutorenew, MdDescription,
} from 'react-icons/md';

// Timeline progress for an order (mirrors the admin Orders view)
function calculateProgress(startDate, etaDateStr) {
  if (!etaDateStr) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(etaDateStr).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

function daysRemaining(etaDateStr) {
  if (!etaDateStr) return 'No target date';
  const end = new Date(etaDateStr);
  const now = new Date();
  end.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Overdue by ${Math.abs(diff)} day(s)`;
  if (diff === 0) return 'Due today';
  return `${diff} day(s) left`;
}

const orderBadge = (status) => {
  if (status === 'New') return 'badge-new';
  if (status === 'In Progress') return 'badge-progress';
  if (status === 'Review') return 'badge-review';
  if (status === 'Completed') return 'badge-completed';
  return 'badge-draft';
};

const invoiceBadge = (status) => {
  if (status === 'Sent') return 'badge-sent';
  if (status === 'Partially Paid') return 'badge-partial';
  if (status === 'Paid') return 'badge-paid';
  if (status === 'Cancelled') return 'badge-cancelled';
  return 'badge-draft';
};

const fmt = (n) => `RM ${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function TrackPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) {
      setError('Please enter a valid phone number.');
      return;
    }
    setError('');
    setLoading(true);
    setSearched(false);
    try {
      const res = await dbService.getCustomerRecordByPhone(phone);
      setRecord(res.data);
      setSearched(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalOutstanding = record
    ? record.invoices.reduce((acc, i) => {
        if (i.status === 'Cancelled') return acc;
        return acc + Math.max(0, Number(i.total) - Number(i.amount_paid));
      }, 0)
    : 0;

  // Group invoices under their project (order); anything unlinked goes to a
  // separate list. A customer/company can have several projects.
  const orders = record?.orders || [];
  const invoices = record?.invoices || [];
  const invoicesByOrder = {};
  const unlinkedInvoices = [];
  invoices.forEach((inv) => {
    const ord = inv.order_id && orders.find((o) => o.id === inv.order_id);
    if (ord) (invoicesByOrder[ord.id] = invoicesByOrder[ord.id] || []).push(inv);
    else unlinkedInvoices.push(inv);
  });
  const paymentSummary = (invs) =>
    invs.reduce((a, i) => {
      a.total += Number(i.total);
      a.paid += Number(i.amount_paid);
      if (i.status !== 'Cancelled') a.balance += Math.max(0, Number(i.total) - Number(i.amount_paid));
      return a;
    }, { total: 0, paid: 0, balance: 0 });

  // One invoice card with a "View invoice" preview action
  const renderInvoice = (inv) => {
    const balance = Math.max(0, Number(inv.total) - Number(inv.amount_paid));
    return (
      <div key={inv.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.9rem 1rem', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--brand-pink)' }}>
              JUR-INV-{String(inv.id).substr(0, 6).toUpperCase()}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Due: {fmtDate(inv.due_date)}</div>
          </div>
          <span className={`badge ${invoiceBadge(inv.status)}`}>{inv.status}</span>
        </div>

        <div className="track-invoice-figures track-inv-stack">
          <div><div className="track-fig-label">Paid</div><div className="track-fig-value" style={{ color: 'var(--success)' }}>{fmt(inv.amount_paid)}</div></div>
          <div><div className="track-fig-label">Balance</div><div className="track-fig-value" style={{ color: balance > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>{fmt(balance)}</div></div>
          <div className="track-inv-total"><div className="track-fig-label">Total</div><div className="track-fig-value">{fmt(inv.total)}</div></div>
        </div>

        <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.85rem' }} onClick={() => setPreviewInvoice(inv)}>
          <MdDescription /> <span>View invoice</span>
        </button>
      </div>
    );
  };

  // Full-screen invoice preview (same document + PDF export as the admin side)
  if (record && previewInvoice) {
    const ref = `JUR-INV-${String(previewInvoice.id).substr(0, 6).toUpperCase()}`;
    return (
      <div className="public-shell">
        <div className="public-container">
          <PdfDocumentPreview
            docKey={previewInvoice.id}
            filename={`${ref}.pdf`}
            docLabel={ref}
            docTitle="Tax Invoice"
            onBack={() => setPreviewInvoice(null)}
            backLabel="← Back to my projects"
          >
            <InvoiceDocument invoice={{ ...previewInvoice, customer: record.customer }} />
          </PdfDocumentPreview>
        </div>
      </div>
    );
  }

  return (
    <div className="public-shell">
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: -1,
          background:
            'radial-gradient(circle at 12% 10%, rgba(255, 102, 196, 0.14), transparent 45%), radial-gradient(circle at 88% 8%, rgba(255, 102, 196, 0.1), transparent 42%)',
        }}
      />

      <div className="public-container">
        {/* Header (masthead) */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
          <Image src="/dark-bg-logo.png" alt="Juruweb Studio" width={170} height={50} style={{ maxWidth: '60%', height: 'auto' }} priority />
        </header>

        {/* Intro + search */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Track your project</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
            Enter the phone number you registered with to see your order progress and payment balance.
          </p>

          <form onSubmit={handleSubmit} className="track-form">
            <input
              type="tel"
              inputMode="tel"
              placeholder="e.g. 012-345 6789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-label="Phone number"
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <MdSearch />
              <span>{loading ? 'Searching…' : 'Track'}</span>
            </button>
          </form>
          {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.75rem' }}>{error}</p>}
        </div>

        {/* No result */}
        {searched && !record && (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              We couldn&apos;t find any records for that phone number.<br />
              Please double-check the number, or contact us at <strong style={{ color: 'var(--text-primary)' }}>juruweb.info@gmail.com</strong>.
            </p>
          </div>
        )}

        {/* Results */}
        {record && (
          <>
            {/* Greeting + outstanding summary */}
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div className="u-caps" style={{ fontSize: '1.25rem', fontWeight: 700 }}>{record.customer?.name}</div>
                {record.customer?.company && (
                  <div className="u-caps" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{record.customer.company}</div>
                )}
              </div>
              <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total outstanding</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: totalOutstanding > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {fmt(totalOutstanding)}
                </div>
              </div>
            </div>

            {/* Projects — each with its own invoices & payment */}
            <h2 className="track-section-title"><MdWork /> My Projects</h2>
            {orders.length === 0 && unlinkedInvoices.length === 0 ? (
              <div className="card" style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No projects or invoices on record yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {orders.map((order) => {
                  const isMaintenance = order.package_type === 'Maintenance';
                  const progress = calculateProgress(order.start_date, order.eta_date);
                  const isCompleted = order.status === 'Completed';
                  const left = daysRemaining(order.eta_date);
                  const isOverdue = !isMaintenance && left.includes('Overdue');
                  const projInvoices = invoicesByOrder[order.id] || [];
                  const pay = paymentSummary(projInvoices);
                  return (
                    <div key={order.id} className="track-project-group">
                    {/* Project progress card */}
                    <div className="card" style={{ borderLeft: `4px solid ${isMaintenance ? 'var(--info)' : isCompleted ? 'var(--success)' : isOverdue ? 'var(--error)' : 'var(--brand-pink)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{order.package_type}{isMaintenance ? ' Retainer' : ' Package'}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{fmt(order.total_amount)}{isMaintenance ? ' / mo' : ''}</div>
                        </div>
                        {isMaintenance
                          ? <span className="badge badge-recurring"><MdAutorenew size={12} /> Recurring</span>
                          : <span className={`badge ${orderBadge(order.status)}`}>{order.status}</span>}
                      </div>

                      {isMaintenance ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--info)', fontWeight: 600, marginTop: '0.9rem' }}>
                          <MdAutorenew size={14} /> Renews monthly · Next billing {fmtDate(order.eta_date)}
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.9rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <MdCalendarToday /> ETA: {fmtDate(order.eta_date)}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, color: isCompleted ? 'var(--success)' : isOverdue ? 'var(--error)' : 'var(--warning)' }}>
                              {isCompleted ? <MdCheckCircle /> : isOverdue ? <MdError /> : <MdAccessTime />}
                              {isCompleted ? 'Delivered' : left}
                            </span>
                          </div>
                          {!isCompleted && (
                            <div style={{ marginTop: '0.6rem' }}>
                              <div className="eta-progress-container">
                                <div className="eta-progress-bar" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {order.notes && (
                        <div style={{ marginTop: '0.9rem', padding: '0.6rem 0.85rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>Remark:</strong> {order.notes}
                        </div>
                      )}

                    </div>

                      {/* Invoices grouped under this project */}
                      {projInvoices.length > 0 && (
                        <div className="track-project-invoices">
                          <div className="track-project-invoices-head">
                            <span><MdReceiptLong size={13} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />Invoices ({projInvoices.length})</span>
                            <span style={{ textTransform: 'none', letterSpacing: 0 }}>Balance: <strong style={{ color: pay.balance > 0 ? 'var(--warning)' : 'var(--success)' }}>{fmt(pay.balance)}</strong></span>
                          </div>
                          {projInvoices.map(renderInvoice)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {unlinkedInvoices.length > 0 && (
                  <div className="card">
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MdReceiptLong /> Other Invoices
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {unlinkedInvoices.map(renderInvoice)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment info footer */}
            {totalOutstanding > 0 && (
              <div className="card" style={{ marginTop: '1.5rem', background: 'var(--brand-pink-glow)', border: '1px dashed var(--brand-pink)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Ready to pay?</strong> Transfer to <strong>Maybank 1644 7246 6013</strong> (Helmi Ashraf Bin Ahmad),
                  then send your receipt to <strong>juruweb.info@gmail.com</strong>.
                </div>
              </div>
            )}
          </>
        )}

        <footer style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2.5rem' }}>
          © Juruweb Studio — Digitalization &amp; System Engineering
        </footer>
      </div>
    </div>
  );
}
