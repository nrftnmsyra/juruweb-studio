'use client';

import Image from 'next/image';

// Resolve a line item's discount to an RM amount (flat RM or percent)
const lineDiscountAmount = (item) => {
  const gross = Number(item.quantity) * Number(item.unit_price);
  return item.discount_type === 'percent'
    ? gross * (Number(item.discount || 0) / 100)
    : Number(item.discount || 0);
};

// The printable A4 invoice document. Shared by the admin invoices page and the
// public client tracker so both render exactly the same PDF.
export default function InvoiceDocument({ invoice }) {
  const customer = invoice.customer || {};
  return (
    <>
      {/* Header info */}
      <div className="pdf-head" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e4e4e7', paddingBottom: '2rem', marginBottom: '2rem' }}>
        <div>
          <Image src="/dark-bg-logo.png" alt="Juruweb Studio" width={180} height={53} unoptimized priority style={{ display: 'block', width: '180px', maxWidth: '100%', height: 'auto' }} />
          <div style={{ fontSize: '0.85rem', color: '#71717a', marginTop: '0.5rem', lineHeight: '1.4' }}>
            <strong>Juruweb Studio</strong><br />
            Digitalization and System Engineering Services<br />
            Bandar Baru Sentul, 51000, Kuala Lumpur<br />
            Email: juruweb.info@gmail.com
          </div>
        </div>
        <div className="pdf-head-meta" style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#18181b', textTransform: 'uppercase', letterSpacing: '-0.025em' }}>Tax Invoice</h2>
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#18181b', lineHeight: '1.5' }}>
            <div>Invoice Ref: <strong>JUR-INV-{invoice.id.substr(0, 6).toUpperCase()}</strong></div>
            <div>Issued Date: {new Date(invoice.created_at).toLocaleDateString('en-MY')}</div>
            <div>Payment Due: {new Date(invoice.due_date).toLocaleDateString('en-MY')}</div>
          </div>
        </div>
      </div>

      {/* Billing names */}
      <div className="pdf-parties" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
        <div>
          <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Invoiced To</h4>
          <div className="u-caps" style={{ fontSize: '0.95rem', color: '#18181b', lineHeight: '1.4' }}>
            <strong style={{ fontSize: '1.1rem' }}>{customer.name}</strong>
            {customer.company && <div>{customer.company}</div>}
            <div className="u-nocaps">{customer.email}</div>
            <div>{customer.phone}</div>
          </div>
        </div>
        {customer.address && (
          <div>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Address Details</h4>
            <div className="u-caps" style={{ fontSize: '0.9rem', color: '#18181b', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
              {customer.address}
            </div>
          </div>
        )}
      </div>

      {/* Line items */}
      <table className="pdf-items" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #18181b' }}>
            <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b' }}>Item Description</th>
            <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '80px' }}>Qty</th>
            <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '120px' }}>Price (RM)</th>
            <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '120px' }}>Discount</th>
            <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '130px' }}>Total (RM)</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items ? (
            invoice.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e4e4e7' }}>
                <td style={{ padding: '1rem 0.5rem', fontSize: '0.95rem', color: '#18181b', fontWeight: 500 }}>
                  {item.description}
                  {item.remark && <div style={{ fontSize: '0.8rem', color: '#71717a', fontWeight: 400, marginTop: '0.2rem', whiteSpace: 'pre-line' }}>{item.remark}</div>}
                </td>
                <td style={{ padding: '1rem 0.5rem', fontSize: '0.95rem', color: '#18181b', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '1rem 0.5rem', fontSize: '0.95rem', color: '#18181b', textAlign: 'right' }}>RM {Number(item.unit_price).toFixed(2)}</td>
                <td style={{ padding: '1rem 0.5rem', fontSize: '0.95rem', color: '#18181b', textAlign: 'right' }}>{Number(item.discount || 0) > 0 ? (item.discount_type === 'percent' ? `${Number(item.discount).toFixed(0)}%` : `RM ${Number(item.discount).toFixed(2)}`) : '-'}</td>
                <td style={{ padding: '1rem 0.5rem', fontSize: '0.95rem', color: '#18181b', textAlign: 'right', fontWeight: 600 }}>RM {((Number(item.quantity) * Number(item.unit_price)) - lineDiscountAmount(item)).toFixed(2)}</td>
              </tr>
            ))
          ) : null}
        </tbody>
      </table>

      {/* Calculations summaries */}
      <div className="pdf-summary pdf-avoid-break" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
        <div style={{ maxWidth: '350px', display: 'flex', alignItems: 'center' }}>
          {(() => {
            const paid = Number(invoice.amount_paid);
            const tot = Number(invoice.total);
            const status = invoice.status;
            // The stamp follows the invoice status; Draft/Sent fall back to the paid amount.
            let color = '#dc2626';
            let label = 'Unpaid';
            let logo = '/stamp-logo-unpaid.png';
            if (status === 'Paid') {
              color = '#059669'; label = 'Paid'; logo = '/stamp-logo-paid.png';
            } else if (status === 'Partially Paid') {
              color = '#d97706'; label = 'Partially Paid'; logo = '/stamp-logo-partial.png';
            } else if (status === 'Cancelled') {
              color = '#6b7280'; label = 'Cancelled'; logo = '/stamp-logo-cancelled.png';
            } else if (paid >= tot && tot > 0) {
              color = '#059669'; label = 'Paid'; logo = '/stamp-logo-paid.png';
            } else if (paid > 0) {
              color = '#d97706'; label = 'Partially Paid'; logo = '/stamp-logo-partial.png';
            }
            return (
              <div style={{
                border: `2px solid ${color}`,
                borderRadius: '10px',
                padding: '0.7rem 1.2rem',
                transform: 'rotate(-8deg)',
                opacity: 0.82,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo}
                  alt="Juruweb Studio"
                  width={96}
                  height={32}
                  style={{ width: '96px', height: '32px', display: 'block' }}
                />
                <span style={{
                  color,
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}>
                  {label}
                </span>
              </div>
            );
          })()}
        </div>

        {(() => {
          const sub = Number(invoice.subtotal);
          const tot = Number(invoice.total);
          const paid = Number(invoice.amount_paid);
          const depPct = Number(invoice.deposit_percent) || 0;
          const deposit = tot * depPct / 100;
          const balance = tot - deposit;
          const due = (depPct > 0 ? deposit : tot) - paid;
          const rowStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '0.55rem' };
          const labelStyle = { color: '#71717a' };
          const valStyle = { fontWeight: 600, color: '#18181b' };
          return (
            <div className="pdf-totals" style={{ width: '300px', fontSize: '0.9rem', marginLeft: 'auto' }}>
              {(sub - tot) > 0.001 && (
                <>
                  <div style={rowStyle}>
                    <span style={labelStyle}>Subtotal</span>
                    <span style={valStyle}>RM {sub.toFixed(2)}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelStyle}>Discount</span>
                    <span style={{ ...valStyle, color: '#059669' }}>- RM {(sub - tot).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div style={rowStyle}>
                <span style={labelStyle}>Total</span>
                <span style={valStyle}>RM {tot.toFixed(2)}</span>
              </div>
              {depPct > 0 && (
                <>
                  <div style={rowStyle}>
                    <span style={labelStyle}>Deposit ({depPct}%)</span>
                    <span style={valStyle}>RM {deposit.toFixed(2)}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelStyle}>Balance</span>
                    <span style={valStyle}>RM {balance.toFixed(2)}</span>
                  </div>
                </>
              )}
              {paid > 0 && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Paid</span>
                  <span style={{ ...valStyle, color: '#059669' }}>- RM {paid.toFixed(2)}</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '2px solid #18181b',
              }}>
                <span style={{ fontWeight: 700, color: '#18181b' }}>
                  {depPct > 0 ? 'Deposit Due' : 'Amount Due'}
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#18181b' }}>
                  RM {due.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Terms & Conditions */}
      <div className="pdf-avoid-break" style={{ marginTop: '2.5rem', fontSize: '0.8rem', color: '#71717a', lineHeight: 1.5 }}>
        <h5 style={{ fontSize: '0.85rem', color: '#18181b', fontWeight: 700, marginBottom: '0.6rem' }}>Payment Terms &amp; Conditions</h5>
        {[
          `Payment is due by ${new Date(invoice.due_date).toLocaleDateString('en-MY')}.`,
          'Kindly transfer to the bank account below and email your payment receipt to juruweb.info@gmail.com.',
          `Please quote the invoice reference (INV-${invoice.id.substr(0, 4).toUpperCase()}) in your transfer.`,
          'All deliverables and services remain subject to Juruweb Studio SLA policies.',
        ].map((term, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontWeight: 700, color: '#18181b', flexShrink: 0 }}>{i + 1}.</span>
            <span>{term}</span>
          </div>
        ))}
      </div>

      {/* Bank details */}
      <div className="pdf-avoid-break" style={{ marginTop: '2rem' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a1a1aa', marginBottom: '0.85rem' }}>Payment Details</div>
        <div className="pdf-bank" style={{ display: 'flex', flexWrap: 'wrap', gap: '2.5rem', fontSize: '0.85rem' }}>
          <div>
            <div style={{ color: '#a1a1aa', fontSize: '0.72rem', marginBottom: '0.15rem' }}>Bank</div>
            <div style={{ fontWeight: 600, color: '#18181b' }}>Maybank</div>
          </div>
          <div>
            <div style={{ color: '#a1a1aa', fontSize: '0.72rem', marginBottom: '0.15rem' }}>Account Number</div>
            <div style={{ fontWeight: 600, color: '#18181b' }}>1644 7246 6013</div>
          </div>
          <div>
            <div style={{ color: '#a1a1aa', fontSize: '0.72rem', marginBottom: '0.15rem' }}>Account Holder</div>
            <div style={{ fontWeight: 600, color: '#18181b' }}>Helmi Ashraf Bin Ahmad</div>
          </div>
          <div>
            <div style={{ color: '#a1a1aa', fontSize: '0.72rem', marginBottom: '0.15rem' }}>Reference</div>
            <div style={{ fontWeight: 600, color: '#18181b' }}>INV-{invoice.id.substr(0, 4).toUpperCase()}</div>
          </div>
        </div>
      </div>
    </>
  );
}
