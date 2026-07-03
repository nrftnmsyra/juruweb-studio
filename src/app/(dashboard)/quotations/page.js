'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dbService } from '@/lib/database';
import DatabaseSetupHelper from '@/components/DatabaseSetupHelper';
import PdfDocumentPreview from '@/components/PdfDocumentPreview';
import { MdAdd, MdDelete, MdDescription, MdClose, MdCheck } from 'react-icons/md';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import Image from 'next/image';

const ADDONS = [
  { label: 'Domain Registration (.com / .com.my)', price: 100.00 },
  { label: 'Monthly Website Management (per month)', price: 120.00 },
  { label: 'Extra Catalog Uploads (per 10 items)', price: 30.00 },
  { label: 'Additional Revision (per request)', price: 50.00 },
  { label: 'Additional Landing Page (per page)', price: 100.00 },
  { label: 'Brand Logo Design Configuration', price: 200.00 }
];

const PACKAGES = [
  { label: 'Basic Website Package (RM 699)', price: 699.00, desc: '1-page responsive website, whatsapp integration' },
  { label: 'Standard Website Package (RM 999)', price: 999.00, desc: 'Multi-section professional website, 5 revisions' },
  { label: 'Premium Website Package (RM 1499)', price: 1499.00, desc: 'Premium custom design, full catalog management, booking' }
];

function QuotationsContent() {
  const searchParams = useSearchParams();
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbSetupRequired, setDbSetupRequired] = useState(false);
  
  // Generator states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [lineItems, setLineItems] = useState([
    { description: 'Standard Website Package', quantity: 1, unit_price: 999.00, discount: 0, discount_type: 'rm', remark: '' }
  ]);
  const [selectedPackage, setSelectedPackage] = useState('Standard Website Package (RM 999)');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  
  // PDF Preview State
  const [activeQuotation, setActiveQuotation] = useState(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
    const d = new Date();
    d.setDate(d.getDate() + 30); // 30 days validity
    setValidUntil(d.toISOString().split('T')[0]);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const quotesRes = await dbService.getQuotations();
      const custsRes = await dbService.getCustomers();
      const ordersRes = await dbService.getOrders();

      if (quotesRes.isDbSetupRequired || custsRes.isDbSetupRequired || ordersRes.isDbSetupRequired) {
        setDbSetupRequired(true);
      }

      setQuotations(quotesRes.data || []);
      setCustomers(custsRes.data || []);
      setOrders(ordersRes.data || []);
    } catch {
      toast.error('Failed to load data page');
    } finally {
      setLoading(false);
    }
  }

  // Predefined package selection handler (single-select; keeps any added add-ons)
  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg.label);
    const pkgItem = { description: pkg.label.split(' (')[0], quantity: 1, unit_price: pkg.price, discount: 0, discount_type: 'rm', remark: '' };
    setLineItems(prev => [pkgItem, ...prev.slice(1)]);
  };

  // Add Addon line item
  const handleSelectAddOn = (addon) => {
    // Check if item is already added to prevent duplicates
    if (lineItems.some(i => i.description === addon.label)) {
      toast.error('Line item already added!');
      return;
    }
    setLineItems(prev => [
      ...prev,
      { description: addon.label, quantity: 1, unit_price: addon.price }
    ]);
    toast.success('Add-on appended!');
  };

  const handleAddCustomLine = () => {
    setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0.00, discount: 0.00, discount_type: 'rm', remark: '' }]);
  };

  const handleRemoveLine = (index) => {
    if (lineItems.length === 1) {
      toast.error('Must contain at least 1 line item');
      return;
    }
    setLineItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleLineItemChange = (index, field, value) => {
    setLineItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        let updated = { ...item, [field]: value };
        return updated;
      }
      return item;
    }));
  };

  const calculateSubtotal = (items) => {
    return items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
  };

  // Resolve a line item's discount to an RM amount (supports flat RM or percent)
  const lineDiscountAmount = (item) => {
    const gross = Number(item.quantity) * Number(item.unit_price);
    return item.discount_type === 'percent'
      ? gross * (Number(item.discount || 0) / 100)
      : Number(item.discount || 0);
  };

  const subtotal = calculateSubtotal(lineItems);
  const discountTotal = lineItems.reduce((acc, item) => acc + lineDiscountAmount(item), 0);
  const tax = 0.00; // No tax by default
  const total = subtotal - discountTotal + tax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error('Client selection required!');
      return;
    }
    if (lineItems.some(i => !i.description.trim())) {
      toast.error('All line items must have descriptions');
      return;
    }

    const payload = {
      customer_id: selectedCustomerId,
      order_id: selectedOrderId || null,
      items: lineItems,
      subtotal,
      tax,
      total,
      status: 'Sent',
      valid_until: validUntil
    };

    try {
      const res = await dbService.addQuotation(payload);
      if (res.isDbSetupRequired) {
        setDbSetupRequired(true);
      }
      toast.success('Quotation generated successfully!');
      setIsModalOpen(false);
      
      // Reset form
      setLineItems([{ description: 'Standard Website Package', quantity: 1, unit_price: 999.00, discount: 0, discount_type: 'rm', remark: '' }]);
      setSelectedPackage('Standard Website Package (RM 999)');
      setSelectedCustomerId('');
      setSelectedOrderId('');
      setNotes('');
      loadData();
    } catch {
      toast.error('Failed to create quotation');
    }
  };


  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dbService.deleteQuotation(deleteTarget.id);
      toast.success('Quotation deleted successfully!');
      setDeleteTarget(null);
      loadData();
    } catch {
      toast.error('Failed to delete quotation');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header print-hide" style={{ display: activeQuotation ? 'none' : 'flex' }}>
        <div>
          <h1 className="page-title">Client Quotations</h1>
          <p className="page-subtitle">Draft technical estimations, price catalogs, and client offers.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <MdAdd />
          <span>New Quotation</span>
        </button>
      </div>

      {dbSetupRequired && !activeQuotation && <DatabaseSetupHelper />}

      {/* Main List Table (Hidden when preview is active) */}
      {!activeQuotation && (
        <>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Loading documents...</p>
          ) : quotations.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No offers/quotations generated yet.</p>
            </div>
          ) : (
            <div className="table-container print-hide">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client / Reference</th>
                    <th>Valid Until</th>
                    <th>Total Valuation</th>
                    <th>Date Sent</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id}>
                      <td data-label="Client">
                        <div className="u-caps" style={{ fontWeight: 600 }}>{q.customer?.name}</div>
                        <div className="u-caps" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{q.customer?.company || 'Personal'}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--brand-pink)', marginTop: '0.2rem' }}>
                          JUR-QT-{q.id.substr(0, 6).toUpperCase()}
                        </div>
                      </td>
                      <td data-label="Valid Until" style={{ whiteSpace: 'nowrap' }}>{new Date(q.valid_until).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td data-label="Total" style={{ fontWeight: 700 }}>RM {Number(q.total).toFixed(2)}</td>
                      <td data-label="Date Sent" style={{ whiteSpace: 'nowrap' }}>{new Date(q.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="actions-cell">
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setActiveQuotation(q)}>
                            <MdDescription />
                            <span>View Doc</span>
                          </button>
                          <button className="btn btn-secondary icon-btn-sm" onClick={() => setDeleteTarget(q)} title="Delete quotation">
                            <MdDelete />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* activeQuotation Preview Visualizer */}
      {activeQuotation && (
        <PdfDocumentPreview
          docKey={activeQuotation.id}
          filename={`JUR-QT-${activeQuotation.id.substr(0, 6).toUpperCase()}.pdf`}
          docLabel={`JUR-QT-${activeQuotation.id.substr(0, 6).toUpperCase()}`}
          docTitle="Quotation"
          onBack={() => setActiveQuotation(null)}
          backLabel="← Back To List"
        >
          {/* PDF Main Header */}
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
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#18181b', textTransform: 'uppercase', letterSpacing: '-0.025em' }}>Quotation</h2>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#18181b', lineHeight: '1.5' }}>
                  <div>Quote Ref: <strong>JUR-QT-{activeQuotation.id.substr(0, 6).toUpperCase()}</strong></div>
                  <div>Issued Date: {new Date(activeQuotation.created_at).toLocaleDateString('en-MY')}</div>
                  <div>Valid Until: {new Date(activeQuotation.valid_until).toLocaleDateString('en-MY')}</div>
                </div>
              </div>
            </div>

            {/* Bill info */}
            <div className="pdf-parties" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Customer Details</h4>
                <div className="u-caps" style={{ fontSize: '0.95rem', color: '#18181b', lineHeight: '1.4' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{activeQuotation.customer?.name}</strong>
                  {activeQuotation.customer?.company && <div>{activeQuotation.customer.company}</div>}
                  <div className="u-nocaps">{activeQuotation.customer?.email}</div>
                  <div>{activeQuotation.customer?.phone}</div>
                </div>
              </div>
              {activeQuotation.customer?.address && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Customer Location</h4>
                  <div className="u-caps" style={{ fontSize: '0.9rem', color: '#18181b', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                    {activeQuotation.customer.address}
                  </div>
                </div>
              )}
            </div>

            {/* Line items table */}
            <table className="pdf-items" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #18181b' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b' }}>Project Scope Item Description</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '70px' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '120px' }}>Unit Price (RM)</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '110px' }}>Discount</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '130px' }}>Total (RM)</th>
                </tr>
              </thead>
              <tbody>
                {activeQuotation.items ? (
                  activeQuotation.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e4e4e7' }}>
                      <td style={{ padding: '1rem 0.5rem', fontSize: '0.95rem', color: '#18181b', fontWeight: 500 }}>
                        {item.description}
                        {item.remark && <div style={{ fontSize: '0.8rem', color: '#71717a', fontWeight: 400, marginTop: '0.2rem' }}>{item.remark}</div>}
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
            <div className="pdf-summary pdf-avoid-break" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              {(() => {
                const sub = Number(activeQuotation.subtotal);
                const tot = Number(activeQuotation.total);
                const rowStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '0.55rem' };
                const labelStyle = { color: '#71717a' };
                const valStyle = { fontWeight: 600, color: '#18181b' };
                return (
                  <div className="pdf-totals" style={{ width: '300px', fontSize: '0.9rem' }}>
                    <div style={rowStyle}>
                      <span style={labelStyle}>Subtotal</span>
                      <span style={valStyle}>RM {sub.toFixed(2)}</span>
                    </div>
                    {(sub - tot) > 0.001 && (
                      <div style={rowStyle}>
                        <span style={labelStyle}>Discount</span>
                        <span style={{ ...valStyle, color: '#059669' }}>- RM {(sub - tot).toFixed(2)}</span>
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
                      <span style={{ fontWeight: 700, color: '#18181b' }}>Total</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#18181b' }}>RM {tot.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Invoicing Deposit details and conditions */}
            <div className="pdf-avoid-break" style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '2px solid #e4e4e7', fontSize: '0.8rem', color: '#71717a', lineHeight: '1.6' }}>
              <h5 style={{ fontSize: '0.85rem', color: '#18181b', fontWeight: 700, marginBottom: '0.5rem' }}>Payment Terms & Conditions</h5>
              <ol style={{ paddingLeft: '1rem' }}>
                <li><strong>50% Outbound Deposit</strong> is required before any development start (RM {(Number(activeQuotation.total) / 2).toFixed(2)}).</li>
                <li>50% final balance to be cleared immediately upon staging staging approval.</li>
                <li>Please send transaction receipts/statements to juruweb.info@gmail.com.</li>
                <li>All website deliveries are subject to standard Juruweb Studio SLA policies.</li>
              </ol>
            </div>

            {/* Bank details */}
            <div className="pdf-avoid-break" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e4e4e7' }}>
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
                  <div style={{ fontWeight: 600, color: '#18181b' }}>QT-{activeQuotation.id.substr(0,4).toUpperCase()}</div>
                </div>
              </div>
            </div>
        </PdfDocumentPreview>
      )}

      {/* Generator Form Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 className="modal-title">New Estimate Quotation</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                
                {/* Select client */}
                <div className="form-grid">
                  <div className="form-group">
                    <label>Assigned Client *</label>
                    <select 
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose target customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Link to Project (Optional)</label>
                    <select 
                      value={selectedOrderId}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                    >
                      <option value="">-- Specify active project order --</option>
                      {orders
                        .filter(o => !selectedCustomerId || o.customer_id === selectedCustomerId)
                        .map(o => (
                          <option key={o.id} value={o.id}>{o.package_type} Project (Order: {o.id.substr(0,4)})</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Validity Scope (Expiration Date) *</label>
                  <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
                </div>

                {/* Package selector (single-select) */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Select Package (choose one)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {PACKAGES.map(pkg => {
                      const active = selectedPackage === pkg.label;
                      return (
                        <button
                          type="button"
                          key={pkg.label}
                          className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => handleSelectPackage(pkg)}
                        >
                          {active && <MdCheck style={{ marginRight: '0.2rem' }} />}
                          <span>{pkg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Available Service Add-Ons</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {ADDONS.map(addon => (
                      <button 
                        type="button" 
                        key={addon.label}
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSelectAddOn(addon)}
                        style={{ fontSize: '0.75rem' }}
                      >
                        <MdAdd />
                        <span>{addon.label.split(' (')[0]} (RM {addon.price})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Items Creator */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Quoted Scope Line Items</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddCustomLine}>
                      <MdAdd />
                      <span>Custom Item</span>
                    </button>
                  </div>

                  <table className="line-items-table">
                    <thead>
                      <tr>
                        <th>Scoped Item / Description</th>
                        <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Price (RM)</th>
                        <th style={{ width: '180px', textAlign: 'right' }}>Discount</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr key={idx}>
                          <td data-label="Scoped Item / Description">
                            <input
                              type="text"
                              placeholder="e.g. Logo Design, Extra product uploads"
                              value={item.description}
                              onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                              style={{ fontSize: '0.85rem' }}
                              required
                            />
                            <input
                              type="text"
                              placeholder="Add a remark (optional)"
                              value={item.remark || ''}
                              onChange={(e) => handleLineItemChange(idx, 'remark', e.target.value)}
                              style={{ fontSize: '0.78rem', marginTop: '0.35rem', color: 'var(--text-secondary)' }}
                            />
                          </td>
                          <td data-label="Qty">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                              style={{ fontSize: '0.85rem', textAlign: 'center' }}
                              min="1"
                              required
                            />
                          </td>
                          <td data-label="Price (RM)">
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => handleLineItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0.00)}
                              style={{ fontSize: '0.85rem', textAlign: 'right' }}
                              step="0.01"
                              required
                            />
                          </td>
                          <td data-label="Discount">
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <input
                                type="number"
                                value={item.discount ?? 0}
                                onChange={(e) => handleLineItemChange(idx, 'discount', parseFloat(e.target.value) || 0.00)}
                                style={{ fontSize: '0.85rem', textAlign: 'right', minWidth: 0 }}
                                step="0.01"
                                min="0"
                              />
                              <select
                                value={item.discount_type || 'rm'}
                                onChange={(e) => handleLineItemChange(idx, 'discount_type', e.target.value)}
                                style={{ width: '78px', flexShrink: 0, fontSize: '0.8rem', paddingLeft: '0.6rem', paddingRight: '1.5rem', backgroundPosition: 'right 0.45rem center' }}
                              >
                                <option value="rm">RM</option>
                                <option value="percent">%</option>
                              </select>
                            </div>
                          </td>
                          <td className="line-remove">
                            <button type="button" className="btn btn-danger icon-btn-sm" onClick={() => handleRemoveLine(idx)}>
                              <MdDelete />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal preview */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Subtotal</span>
                      <span>RM {subtotal.toFixed(2)}</span>
                    </div>
                    {discountTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                        <span>Discount</span>
                        <span>- RM {discountTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>Total</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>RM {total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save & Register Quotation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Quotation"
        message={`Are you sure you want to delete the quotation for "${deleteTarget?.customer?.name || 'this client'}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        pending={deleting}
      />
    </div>
  );
}

export default function QuotationsPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Loading Search Parameters...</p>}>
      <QuotationsContent />
    </Suspense>
  );
}
