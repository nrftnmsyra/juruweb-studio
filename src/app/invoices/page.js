'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dbService } from '@/lib/database';
import DatabaseSetupHelper from '@/components/DatabaseSetupHelper';
import { FiPlus, FiPrinter, FiDollarSign, FiTrash2, FiFileText, FiX, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Image from 'next/image';

function InvoicesContent() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbSetupRequired, setDbSetupRequired] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  // Generator states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState([
    { description: 'Standard Website Development - 50% Start Deposit', quantity: 1, unit_price: 499.50 }
  ]);

  // Payment Recording state
  const [activePaymentInvoice, setActivePaymentInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // PDF Preview State
  const [activeInvoice, setActiveInvoice] = useState(null);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
    const d = new Date();
    d.setDate(d.getDate() + 14); // 14 days payment terms
    setDueDate(d.toISOString().split('T')[0]);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const invoicesRes = await dbService.getInvoices();
      const custsRes = await dbService.getCustomers();
      const quotesRes = await dbService.getQuotations();

      if (invoicesRes.isDbSetupRequired || custsRes.isDbSetupRequired || quotesRes.isDbSetupRequired) {
        setDbSetupRequired(true);
      }

      setInvoices(invoicesRes.data || []);
      setCustomers(custsRes.data || []);
      setQuotations(quotesRes.data || []);
    } catch {
      toast.error('Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  }

  // Double trigger to copy line items from Quotation if matching
  const handleQuotationSelect = (e) => {
    const quoteId = e.target.value;
    setSelectedQuotationId(quoteId);

    if (!quoteId) return;
    const qNode = quotations.find(q => q.id === quoteId);
    if (!qNode) return;

    // Automatically set the customer ID
    setSelectedCustomerId(qNode.customer_id);

    // Prompt options: Does the user want the 50% deposit upfront invoice or full?
    // We will pre-populate the items assuming the 50% upfront deposit as standard, but offer full structure
    // Let's create two line items: e.g., the deposit of the quotation.
    const isDeposit = window.confirm(`Copy Quotation items?\nClick OK to generate a 50% deposit invoice (RM ${(qNode.total / 2).toFixed(2)}).\nClick Cancel to generate a full 100% amount invoice (RM ${qNode.total.toFixed(2)}).`);

    if (isDeposit) {
      const depositItems = qNode.items.map(item => ({
        description: `${item.description} - 50% Project Milestone Deposit`,
        quantity: item.quantity,
        unit_price: Number((item.unit_price / 2).toFixed(2))
      }));
      setLineItems(depositItems);
    } else {
      setLineItems(qNode.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price
      })));
    }
    toast.success('Items copied from Quotation!');
  };

  // Helper to load 50% balance
  const handleLoadBalance = (quote) => {
    setSelectedQuotationId(quote.id);
    setSelectedCustomerId(quote.customer_id);
    const balanceItems = quote.items.map(item => ({
      description: `${item.description} - 50% Project Completion Balance`,
      quantity: item.quantity,
      unit_price: Number((item.unit_price / 2).toFixed(2))
    }));
    setLineItems(balanceItems);
    toast.success('Appended 50% balance items!');
  };

  const handleAddLine = () => {
    setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0.00 }]);
  };

  const handleRemoveLine = (index) => {
    if (lineItems.length === 1) {
      toast.error('Must contain at least 1 item');
      return;
    }
    setLineItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleLineItemChange = (index, field, value) => {
    setLineItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
  const tax = 0.00;
  const total = subtotal + tax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error('Please select a customer first!');
      return;
    }

    const payload = {
      customer_id: selectedCustomerId,
      quotation_id: selectedQuotationId || null,
      items: lineItems,
      subtotal,
      tax,
      total,
      amount_paid: 0.00,
      status: 'Sent',
      due_date: dueDate
    };

    try {
      const res = await dbService.addInvoice(payload);
      if (res.isDbSetupRequired) {
        setDbSetupRequired(true);
      }
      toast.success('Invoice generated successfully!');
      setIsModalOpen(false);
      
      // Reset states
      setSelectedCustomerId('');
      setSelectedQuotationId('');
      setLineItems([{ description: 'Standard Website Development - 50% Start Deposit', quantity: 1, unit_price: 499.50 }]);
      loadData();
    } catch {
      toast.error('Failed to create invoice');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const parsedAmt = parseFloat(paymentAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      toast.error('Invalid payment amount!');
      return;
    }

    const outstanding = Number(activePaymentInvoice.total) - Number(activePaymentInvoice.amount_paid);
    if (parsedAmt > outstanding + 0.01) {
      toast.error(`Amount exceeding outstanding balance of RM ${outstanding.toFixed(2)}`);
      return;
    }

    const newPaid = Number(activePaymentInvoice.amount_paid) + parsedAmt;
    let newStatus = 'Partially Paid';
    if (Math.abs(newPaid - Number(activePaymentInvoice.total)) < 0.05) {
      newStatus = 'Paid';
    }

    try {
      await dbService.updateInvoicePayment(activePaymentInvoice.id, newPaid, newStatus);
      toast.success('Payment recorded successfully!');
      setActivePaymentInvoice(null);
      setPaymentAmount('');
      loadData();
    } catch {
      toast.error('Failed to update payments');
    }
  };

  const filteredInvoices = statusFilter === 'All' 
    ? invoices 
    : invoices.filter(i => i.status === statusFilter);

  return (
    <div className="page-container">
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

      <div className="page-header print-hide" style={{ display: activeInvoice ? 'none' : 'flex' }}>
        <div>
          <h1 className="page-title">Client Invoices</h1>
          <p className="page-subtitle">Manage client billings, verify deposit transactions, and update outstanding payments.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <FiPlus />
          <span>Create Invoice</span>
        </button>
      </div>

      {dbSetupRequired && !activeInvoice && <DatabaseSetupHelper />}

      {/* Status Bar */}
      {!activeInvoice && (
        <div className="card print-hide" style={{ marginBottom: '2rem', padding: '0.75rem', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          {['All', 'Sent', 'Partially Paid', 'Paid', 'Cancelled'].map((status) => (
            <button 
              key={status}
              className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setStatusFilter(status)}
              style={{ borderRadius: '8px', padding: '0.4rem 1rem' }}
            >
              {status}
            </button>
          ))}
        </div>
      )}

      {/* Main List */}
      {!activeInvoice && (
        <>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Loading statements...</p>
          ) : filteredInvoices.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No transactions found under "{statusFilter}" status.</p>
            </div>
          ) : (
            <div className="table-container print-hide">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Customer Name</th>
                    <th>Date Due</th>
                    <th>Invoice Total</th>
                    <th>Paid Amount</th>
                    <th>Balance Due</th>
                    <th>Payment Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => {
                    const outstanding = Number(inv.total) - Number(inv.amount_paid);
                    
                    let bgStatus = 'badge-draft';
                    if (inv.status === 'Sent') bgStatus = 'badge-sent';
                    else if (inv.status === 'Partially Paid') bgStatus = 'badge-partial';
                    else if (inv.status === 'Paid') bgStatus = 'badge-paid';

                    return (
                      <tr key={inv.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-pink)' }}>
                            JUR-INV-{inv.id.substr(0, 6).toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.customer?.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{inv.customer?.company || 'Personal'}</div>
                        </td>
                        <td>{new Date(inv.due_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td>RM {Number(inv.total).toFixed(2)}</td>
                        <td style={{ color: 'var(--success)' }}>RM {Number(inv.amount_paid).toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: outstanding > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                          RM {outstanding.toFixed(2)}
                        </td>
                        <td>
                          <span className={`badge ${bgStatus}`}>{inv.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setActiveInvoice(inv)}>
                              <FiFileText />
                              <span>PDF</span>
                            </button>
                            
                            {outstanding > 0.05 && (
                              <button className="btn btn-primary btn-sm" onClick={() => {
                                setActivePaymentInvoice(inv);
                                setPaymentAmount(outstanding.toFixed(2));
                              }} style={{ padding: '0.4rem 0.6rem' }}>
                                <FiDollarSign />
                                <span>Record Receipt</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* PDF Viewer Area */}
      {activeInvoice && (
        <div>
          <div className="print-hide" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyBetween: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setActiveInvoice(null)}>
              <span>← Back To Invoices</span>
            </button>
            <button className="btn btn-primary" onClick={() => window.print()} style={{ marginLeft: 'auto' }}>
              <FiPrinter />
              <span>Print or Save PDF</span>
            </button>
          </div>

          <div className="pdf-print-area pdf-preview">
            {/* Header info */}
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
                <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#18181b', textTransform: 'uppercase', letterSpacing: '-0.025em' }}>Tax Invoice</h2>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#18181b', lineHeight: '1.5' }}>
                  <div>Invoice Ref: <strong>JUR-INV-{activeInvoice.id.substr(0, 6).toUpperCase()}</strong></div>
                  <div>Issued Date: {new Date(activeInvoice.created_at).toLocaleDateString('en-MY')}</div>
                  <div>Payment Due: {new Date(activeInvoice.due_date).toLocaleDateString('en-MY')}</div>
                </div>
              </div>
            </div>

            {/* Billing names */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Invoiced To</h4>
                <div style={{ fontSize: '0.95rem', color: '#18181b', lineHeight: '1.4' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{activeInvoice.customer?.name}</strong>
                  {activeInvoice.customer?.company && <div>{activeInvoice.customer.company}</div>}
                  <div>{activeInvoice.customer?.email}</div>
                  <div>{activeInvoice.customer?.phone}</div>
                </div>
              </div>
              {activeInvoice.customer?.address && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Address Details</h4>
                  <div style={{ fontSize: '0.9rem', color: '#18181b', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                    {activeInvoice.customer.address}
                  </div>
                </div>
              )}
            </div>

            {/* Line items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #18181b' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b' }}>Payment Milestone Item</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '100px' }}>Quantity</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '150px' }}>Price (RM)</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '150px' }}>Total (RM)</th>
                </tr>
              </thead>
              <tbody>
                {activeInvoice.items ? (
                  activeInvoice.items.map((item, idx) => (
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
            <div style={{ display: 'flex', justifyBetween: 'space-between', marginTop: '1.5rem', borderTop: '1px solid #e4e4e7', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#71717a', maxWidth: '350px' }}>
                <strong style={{ color: '#18181b', display: 'block', marginBottom: '0.25rem' }}>Payment Status Alert</strong>
                {Number(activeInvoice.amount_paid) >= Number(activeInvoice.total) ? (
                  <span style={{ color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FiCheckCircle />
                    <span>Entire invoice value cleared. Thank you for your support!</span>
                  </span>
                ) : (
                  <span>
                    Outstanding balance of <strong>RM {(Number(activeInvoice.total) - Number(activeInvoice.amount_paid)).toFixed(2)}</strong> must be transfer-cleared before the final website release source code transfer.
                  </span>
                )}
              </div>

              <div style={{ width: '320px', fontSize: '0.95rem', color: '#18181b', lineHeight: '1.8', marginLeft: 'auto' }}>
                <div style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.4rem' }}>
                  <span>Gross Total:</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600 }}>RM {Number(activeInvoice.total).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.4rem', color: 'var(--success)' }}>
                  <span>Verified Payments (Paid):</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600 }}>- RM {Number(activeInvoice.amount_paid).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyBetween: 'space-between', paddingTop: '0.5rem', fontSize: '1.2rem', color: '#ff69b4', fontWeight: 800 }}>
                  <span>Total Amount Due:</span>
                  <span style={{ marginLeft: 'auto' }}>
                    RM {(Number(activeInvoice.total) - Number(activeInvoice.amount_paid)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank details */}
            <div style={{ marginTop: '4rem', padding: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', color: '#475569' }}>
              <strong style={{ color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>Juruweb Payment Transfer Accounts</strong>
              <div>Maybank Association Berhad: <strong>5123 4567 8910</strong></div>
              <div>Account Holder Name: <strong>Juruweb Studio Private Ltd.</strong></div>
              <div>Reference Code to use: <strong>QT-{activeInvoice.id.substr(0,4).toUpperCase()}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Recording Payment overlay modal */}
      {activePaymentInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Record Client Payment</h3>
              <button className="modal-close" onClick={() => setActivePaymentInvoice(null)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Provide the payment amount verified to update <strong>{activePaymentInvoice.customer?.name}</strong>'s invoice status.
                </p>
                <div className="form-group">
                  <label>Amount Received (RM)</label>
                  <input 
                    type="number" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    step="0.01"
                    min="0.01"
                    required
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPaymentAmount((Number(activePaymentInvoice.total) / 2).toFixed(2))}
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    >
                      Use 50% (Deposit)
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPaymentAmount((Number(activePaymentInvoice.total) - Number(activePaymentInvoice.amount_paid)).toFixed(2))}
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    >
                      Use 100% (Balance)
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActivePaymentInvoice(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generator Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 className="modal-title">New Invoiced Balance</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                
                {/* Select quote to load items */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label>Load from Client Quotation (Copies details)</label>
                  <select 
                    value={selectedQuotationId}
                    onChange={handleQuotationSelect}
                  >
                    <option value="">-- Direct copy from existing quotation file --</option>
                    {quotations.map(q => (
                      <option key={q.id} value={q.id}>
                        JUR-QT-{q.id.substr(0,5).toUpperCase()} - {q.customer?.name} (RM {Number(q.total).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  {/* Select client */}
                  <div className="form-group">
                    <label>Client Directory Account *</label>
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
                    <label>Invoiced Due Date *</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                  </div>
                </div>

                {/* Quick copy options */}
                {selectedQuotationId && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#1c1420', border: '1px dashed var(--brand-pink)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <strong>50/50 payment split options:</strong> Easily create 50% deposit and 50% final balance invoices from the loaded quotation.
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => {
                          const qNode = quotations.find(q => q.id === selectedQuotationId);
                          if (qNode) handleQuotationSelect({ target: { value: qNode.id } });
                        }}
                      >
                        Generate 50% Dep.
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const qNode = quotations.find(q => q.id === selectedQuotationId);
                          if (qNode) handleLoadBalance(qNode);
                        }}
                      >
                        Generate 50% Bal.
                      </button>
                    </div>
                  </div>
                )}

                {/* Line Items */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Invoiced Items</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLine}>
                      <FiPlus />
                      <span>Custom Item</span>
                    </button>
                  </div>

                  <table className="line-items-table">
                    <thead>
                      <tr>
                        <th>Item Description</th>
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
                              placeholder="e.g. 50% Project milestone deposit" 
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
                    <div style={{ color: 'var(--text-secondary)' }}>Invoice Total Valuation:</div>
                    <div style={{ fontSize: '1.5rem', color: 'var(--brand-pink)', fontWeight: 800 }}>RM {total.toFixed(2)}</div>
                  </div>
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save & Issue Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Loading Search Parameters...</p>}>
      <InvoicesContent />
    </Suspense>
  );
}
