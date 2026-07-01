'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dbService } from '@/lib/database';
import DatabaseSetupHelper from '@/components/DatabaseSetupHelper';
import { FiPlus, FiPrinter, FiTrash2, FiFileText, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
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
    { description: 'Standard Website Package', quantity: 1, unit_price: 999.00 }
  ]);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  
  // PDF Preview State
  const [activeQuotation, setActiveQuotation] = useState(null);

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

  // Predefined package selection handler
  const handleSelectPackage = (pkg) => {
    setLineItems([
      { description: pkg.label.split(' (')[0], quantity: 1, unit_price: pkg.price }
    ]);
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
    setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0.00 }]);
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

  const subtotal = calculateSubtotal(lineItems);
  const tax = 0.00; // No tax by default
  const total = subtotal + tax;

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
      setLineItems([{ description: 'Standard Website Package', quantity: 1, unit_price: 999.00 }]);
      setSelectedCustomerId('');
      setSelectedOrderId('');
      loadData();
    } catch {
      toast.error('Failed to create quotation');
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="page-container">
      {/* Hide elements on printed PDF */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .pdf-print-area, .pdf-print-area * {
            visibility: visible;
          }
          .pdf-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>

      <div className="page-header print-hide" style={{ display: activeQuotation ? 'none' : 'flex' }}>
        <div>
          <h1 className="page-title">Client Quotations</h1>
          <p className="page-subtitle">Draft technical estimations, price catalogs, and client offers.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <FiPlus />
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
                    <th>Quote Reference</th>
                    <th>Client Name / Company</th>
                    <th>Valid Until</th>
                    <th>Total Valuation</th>
                    <th>Date Sent</th>
                    <th>View PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-pink)' }}>
                          JUR-QT-{q.id.substr(0, 6).toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{q.customer?.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{q.customer?.company || 'Personal'}</div>
                      </td>
                      <td>{new Date(q.valid_until).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={{ fontWeight: 700 }}>RM {Number(q.total).toFixed(2)}</td>
                      <td>{new Date(q.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => setActiveQuotation(q)}>
                          <FiFileText />
                          <span>View Doc</span>
                        </button>
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
        <div>
          <div className="print-hide" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyBetween: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setActiveQuotation(null)}>
              <span>← Back To List</span>
            </button>
            <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto' }}>
              <button className="btn btn-primary" onClick={triggerPrint}>
                <FiPrinter />
                <span>Print or Save PDF</span>
              </button>
            </div>
          </div>

          <div className="pdf-print-area pdf-preview">
            {/* PDF Main Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e4e4e7', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <div>
                <Image src="/dark-bg-logo.PNG" alt="Juruweb Studio" width={180} height={50} style={{ objectFit: 'contain' }} />
                <div style={{ fontSize: '0.85rem', color: '#71717a', marginTop: '0.5rem', lineHeight: '1.4' }}>
                  <strong>Juruweb Studio Private Ltd.</strong><br />
                  Digitalization and System Engineering Services<br />
                  Kuala Lumpur, Malaysia<br />
                  Email: hello@juruweb.co.my
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#18181b', textTransform: 'uppercase', letterSpacing: '-0.025em' }}>Quotation</h2>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#18181b', lineHeight: '1.5' }}>
                  <div>Quote Ref: <strong>JUR-QT-{activeQuotation.id.substr(0, 6).toUpperCase()}</strong></div>
                  <div>Issued Date: {new Date(activeQuotation.created_at).toLocaleDateString('en-MY')}</div>
                  <div>Valid Until: {new Date(activeQuotation.valid_until).toLocaleDateString('en-MY')}</div>
                </div>
              </div>
            </div>

            {/* Bill info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Customer Details</h4>
                <div style={{ fontSize: '0.95rem', color: '#18181b', lineHeight: '1.4' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{activeQuotation.customer?.name}</strong>
                  {activeQuotation.customer?.company && <div>{activeQuotation.customer.company}</div>}
                  <div>{activeQuotation.customer?.email}</div>
                  <div>{activeQuotation.customer?.phone}</div>
                </div>
              </div>
              {activeQuotation.customer?.address && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Customer Location</h4>
                  <div style={{ fontSize: '0.9rem', color: '#18181b', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                    {activeQuotation.customer.address}
                  </div>
                </div>
              )}
            </div>

            {/* Line items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #18181b' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b' }}>Project Scope Item Description</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '100px' }}>Quantity</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '150px' }}>Unit Price (RM)</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '150px' }}>Total (RM)</th>
                </tr>
              </thead>
              <tbody>
                {activeQuotation.items ? (
                  activeQuotation.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e4e4e7' }}>
                      <td style={{ padding: '1rem 0.5rem', fontSize: '0.95rem', color: '#18181b', fontWeight: 500 }}>{item.description}</td>
                      <td style={{ padding: '1rem 0.5rem', fontSize: '0.95rem', color: '#18181b', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '1rem 0.5rem', fontSize: '0.95rem', color: '#18181b', textAlign: 'right' }}>RM {Number(item.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '1rem 0.5rem', fontSize: '0.95rem', color: '#18181b', textAlign: 'right', fontWeight: 600 }}>RM {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</td>
                    </tr>
                  ))
                ) : null}
              </tbody>
            </table>

            {/* Calculations summaries */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <div style={{ width: '320px', fontSize: '0.95rem', color: '#18181b', lineHeight: '1.8' }}>
                <div style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.5rem' }}>
                  <span>Subtotal:</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600 }}>RM {Number(activeQuotation.subtotal).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid #e4e4e7', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
                  <span>Tax (0%):</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600 }}>RM {Number(activeQuotation.tax).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyBetween: 'space-between', paddingTop: '0.75rem', fontSize: '1.25rem', color: '#ff69b4', fontWeight: 800 }}>
                  <span>Final Total:</span>
                  <span style={{ marginLeft: 'auto' }}>RM {Number(activeQuotation.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Invoicing Deposit details and conditions */}
            <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '2px solid #e4e4e7', fontSize: '0.8rem', color: '#71717a', lineHeight: '1.6' }}>
              <h5 style={{ fontSize: '0.85rem', color: '#18181b', fontWeight: 700, marginBottom: '0.5rem' }}>Payment Terms & Conditions</h5>
              <ol style={{ paddingLeft: '1rem' }}>
                <li><strong>50% Outbound Deposit</strong> is required before any development start (RM {(Number(activeQuotation.total) / 2).toFixed(2)}).</li>
                <li>50% final balance to be cleared immediately upon staging staging approval.</li>
                <li>Please send transaction receipts/statements to hello@juruweb.co.my.</li>
                <li>All website deliveries are subject to standard Juruweb Studio SLA policies.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Generator Form Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 className="modal-title">New Estimate Quotation</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                
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

                {/* Quick select buttons */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Insert Packages (From Pricing PDF)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {PACKAGES.map(pkg => (
                      <button 
                        type="button" 
                        key={pkg.label}
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSelectPackage(pkg)}
                        style={{ borderStyle: 'dashed', borderColor: 'var(--brand-pink)' }}
                      >
                        <FiCheck style={{ marginRight: '0.2rem', color: 'var(--brand-pink)' }} />
                        <span>{pkg.label}</span>
                      </button>
                    ))}
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
                        <FiPlus />
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
                      <FiPlus />
                      <span>Custom Item</span>
                    </button>
                  </div>

                  <table className="line-items-table">
                    <thead>
                      <tr>
                        <th>Scoped Item / Description</th>
                        <th style={{ width: '80px', textAlignment: 'center' }}>Qty</th>
                        <th style={{ width: '120px', textAlignment: 'right' }}>Price (RM)</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <input 
                              type="text" 
                              placeholder="e.g. Logo Design, Extra product uploads" 
                              value={item.description}
                              onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                              style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                              required
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                              style={{ padding: '0.4rem 0.4rem', fontSize: '0.85rem', textAlignment: 'center' }}
                              min="1"
                              required
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              value={item.unit_price}
                              onChange={(e) => handleLineItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0.00)}
                              style={{ padding: '0.4rem 0.4rem', fontSize: '0.85rem', textAlignment: 'right' }}
                              step="0.01"
                              required
                            />
                          </td>
                          <td>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveLine(idx)} style={{ padding: '0.4rem' }}>
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal preview */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <div style={{ textAlign: 'right', width: '220px' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>Calculated Total Valuation:</div>
                    <div style={{ fontSize: '1.5rem', color: 'var(--brand-pink)', fontWeight: 800 }}>RM {total.toFixed(2)}</div>
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
