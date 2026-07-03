'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dbService } from '@/lib/database';
import { downloadElementAsPdf } from '@/lib/pdf';
import DatabaseSetupHelper from '@/components/DatabaseSetupHelper';
import { MdAdd, MdPrint, MdDownload, MdAttachMoney, MdDelete, MdDescription, MdClose } from 'react-icons/md';
import toast from 'react-hot-toast';
import Image from 'next/image';
import ConfirmDialog from '@/components/ConfirmDialog';

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
    { description: 'Standard Website Development', quantity: 1, unit_price: 999.00, discount: 0, discount_type: 'rm', remark: '' }
  ]);
  const [depositPercent, setDepositPercent] = useState(0);

  // Payment Recording state
  const [activePaymentInvoice, setActivePaymentInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // PDF Preview State
  const [activeInvoice, setActiveInvoice] = useState(null);
  const pdfRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!activeInvoice || !pdfRef.current) return;
    setDownloading(true);
    const t = toast.loading('Generating PDF…');
    try {
      const ref = `JUR-INV-${activeInvoice.id.substr(0, 6).toUpperCase()}`;
      await downloadElementAsPdf(pdfRef.current, `${ref}.pdf`);
      toast.success('PDF downloaded!', { id: t });
    } catch {
      toast.error('Could not generate the PDF', { id: t });
    } finally {
      setDownloading(false);
    }
  };

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

  // Copy the full line items from a quotation (prices stay at full value)
  const handleQuotationSelect = (e) => {
    const quoteId = e.target.value;
    setSelectedQuotationId(quoteId);

    if (!quoteId) return;
    const qNode = quotations.find(q => q.id === quoteId);
    if (!qNode) return;

    setSelectedCustomerId(qNode.customer_id);
    setLineItems(qNode.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount || 0,
      discount_type: item.discount_type || 'rm',
      remark: item.remark || ''
    })));
    toast.success('Items copied from quotation!');
  };

  const handleAddLine = () => {
    setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0.00, discount: 0.00, discount_type: 'rm', remark: '' }]);
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

  // Resolve a line item's discount to an RM amount (supports flat RM or percent)
  const lineDiscountAmount = (item) => {
    const gross = Number(item.quantity) * Number(item.unit_price);
    return item.discount_type === 'percent'
      ? gross * (Number(item.discount || 0) / 100)
      : Number(item.discount || 0);
  };

  const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
  const discountTotal = lineItems.reduce((acc, item) => acc + lineDiscountAmount(item), 0);
  const tax = 0.00;
  const total = subtotal - discountTotal + tax;
  const depositAmount = total * (Number(depositPercent) || 0) / 100;
  const balanceAmount = total - depositAmount;

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
      due_date: dueDate,
      deposit_percent: Number(depositPercent) || 0
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
      setDepositPercent(0);
      setLineItems([{ description: 'Standard Website Development', quantity: 1, unit_price: 999.00, discount: 0, discount_type: 'rm', remark: '' }]);
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dbService.deleteInvoice(deleteTarget.id);
      toast.success('Invoice deleted successfully!');
      setDeleteTarget(null);
      loadData();
    } catch {
      toast.error('Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const filteredInvoices = statusFilter === 'All'
    ? invoices 
    : invoices.filter(i => i.status === statusFilter);

  return (
    <div className="page-container">
      <div className="page-header print-hide" style={{ display: activeInvoice ? 'none' : 'flex' }}>
        <div>
          <h1 className="page-title">Client Invoices</h1>
          <p className="page-subtitle">Manage client billings, verify deposit transactions, and update outstanding payments.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <MdAdd />
          <span>Create Invoice</span>
        </button>
      </div>

      {dbSetupRequired && !activeInvoice && <DatabaseSetupHelper />}

      {/* Status Filter */}
      {!activeInvoice && (
        <div className="filter-bar print-hide">
          <label htmlFor="inv-status-filter">Filter by status</label>
          <select
            id="inv-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {['All', 'Sent', 'Partially Paid', 'Paid', 'Cancelled'].map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
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
                  <tr style={{ whiteSpace: 'nowrap' }}>
                    <th>Customer / Invoice</th>
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
                        <td data-label="Customer">
                          <div className="u-caps" style={{ fontWeight: 600 }}>{inv.customer?.name}</div>
                          <div className="u-caps" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{inv.customer?.company || 'Personal'}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--brand-pink)', marginTop: '0.2rem' }}>
                            JUR-INV-{inv.id.substr(0, 6).toUpperCase()}
                          </div>
                        </td>
                        <td data-label="Date Due" style={{ whiteSpace: 'nowrap' }}>{new Date(inv.due_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td data-label="Invoice Total" style={{ whiteSpace: 'nowrap' }}>RM {Number(inv.total).toFixed(2)}</td>
                        <td data-label="Paid" style={{ color: 'var(--success)', whiteSpace: 'nowrap' }}>RM {Number(inv.amount_paid).toFixed(2)}</td>
                        <td data-label="Balance Due" style={{ fontWeight: 700, whiteSpace: 'nowrap', color: outstanding > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                          RM {outstanding.toFixed(2)}
                        </td>
                        <td data-label="Status">
                          <span className={`badge ${bgStatus}`} style={{ whiteSpace: 'nowrap' }}>{inv.status}</span>
                        </td>
                        <td className="actions-cell">
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setActiveInvoice(inv)} title="View PDF" style={{ whiteSpace: 'nowrap' }}>
                              <MdDescription />
                              <span>PDF</span>
                            </button>

                            {outstanding > 0.05 && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  setActivePaymentInvoice(inv);
                                  setPaymentAmount(outstanding.toFixed(2));
                                }}
                                title="Record payment"
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                <MdAttachMoney />
                                <span>Receipt</span>
                              </button>
                            )}
                            <button className="btn btn-secondary icon-btn-sm" onClick={() => setDeleteTarget(inv)} title="Delete invoice">
                              <MdDelete />
                            </button>
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
          <div className="pdf-toolbar print-hide">
            <button className="btn btn-secondary" onClick={() => setActiveInvoice(null)}>
              <span>← Back To Invoices</span>
            </button>
            <button className="btn btn-secondary" onClick={() => window.print()} style={{ marginLeft: 'auto' }}>
              <MdPrint />
              <span>Print</span>
            </button>
            <button className="btn btn-primary" onClick={handleDownloadPdf} disabled={downloading}>
              <MdDownload />
              <span>{downloading ? 'Preparing…' : 'Download PDF'}</span>
            </button>
          </div>

          <div ref={pdfRef} className="pdf-print-area pdf-preview">
            {/* Header info */}
            <div className="pdf-head" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e4e4e7', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <div>
                <Image src="/dark-bg-logo.png" alt="Juruweb Studio" width={180} height={50} style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }} />
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
                  <div>Invoice Ref: <strong>JUR-INV-{activeInvoice.id.substr(0, 6).toUpperCase()}</strong></div>
                  <div>Issued Date: {new Date(activeInvoice.created_at).toLocaleDateString('en-MY')}</div>
                  <div>Payment Due: {new Date(activeInvoice.due_date).toLocaleDateString('en-MY')}</div>
                </div>
              </div>
            </div>

            {/* Billing names */}
            <div className="pdf-parties" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Invoiced To</h4>
                <div className="u-caps" style={{ fontSize: '0.95rem', color: '#18181b', lineHeight: '1.4' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{activeInvoice.customer?.name}</strong>
                  {activeInvoice.customer?.company && <div>{activeInvoice.customer.company}</div>}
                  <div className="u-nocaps">{activeInvoice.customer?.email}</div>
                  <div>{activeInvoice.customer?.phone}</div>
                </div>
              </div>
              {activeInvoice.customer?.address && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#71717a', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Address Details</h4>
                  <div className="u-caps" style={{ fontSize: '0.9rem', color: '#18181b', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                    {activeInvoice.customer.address}
                  </div>
                </div>
              )}
            </div>

            {/* Line items */}
            <table className="pdf-items" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #18181b' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b' }}>Description</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '80px' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '120px' }}>Price (RM)</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '120px' }}>Discount</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#52525b', width: '130px' }}>Total (RM)</th>
                </tr>
              </thead>
              <tbody>
                {activeInvoice.items ? (
                  activeInvoice.items.map((item, idx) => (
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
            <div className="pdf-summary pdf-avoid-break" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <div style={{ maxWidth: '350px', display: 'flex', alignItems: 'center' }}>
                {(() => {
                  const paid = Number(activeInvoice.amount_paid);
                  const tot = Number(activeInvoice.total);
                  let color = '#dc2626';
                  let label = 'Unpaid';
                  if (paid >= tot) { color = '#059669'; label = 'Paid'; }
                  else if (paid > 0) { color = '#d97706'; label = 'Partially Paid'; }
                  return (
                    <div style={{
                      border: `2px solid ${color}`,
                      borderRadius: '10px',
                      padding: '0.7rem 1.2rem',
                      transform: 'rotate(-8deg)',
                      opacity: 0.82,
                      mixBlendMode: 'multiply',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}>
                      <span
                        aria-label="Juruweb Studio"
                        className="pdf-stamp-mark"
                        style={{
                          display: 'block',
                          width: '110px',
                          height: '26px',
                          backgroundColor: color,
                          WebkitMaskImage: 'url(/stamp-logo.svg)',
                          maskImage: 'url(/stamp-logo.svg)',
                          WebkitMaskRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                          WebkitMaskSize: 'contain',
                          maskSize: 'contain',
                          WebkitMaskPosition: 'center',
                          maskPosition: 'center',
                        }}
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
                const sub = Number(activeInvoice.subtotal);
                const tot = Number(activeInvoice.total);
                const paid = Number(activeInvoice.amount_paid);
                const depPct = Number(activeInvoice.deposit_percent) || 0;
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

            {/* Bank details */}
            <div className="pdf-avoid-break" style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e4e4e7' }}>
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
                  <div style={{ fontWeight: 600, color: '#18181b' }}>INV-{activeInvoice.id.substr(0,4).toUpperCase()}</div>
                </div>
              </div>
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
                <MdClose />
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
                      onClick={() => {
                        const pct = Number(activePaymentInvoice.deposit_percent) || 50;
                        setPaymentAmount((Number(activePaymentInvoice.total) * pct / 100).toFixed(2));
                      }}
                    >
                      Use Deposit ({Number(activePaymentInvoice.deposit_percent) > 0 ? Number(activePaymentInvoice.deposit_percent) : 50}%)
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPaymentAmount((Number(activePaymentInvoice.total) - Number(activePaymentInvoice.amount_paid)).toFixed(2))}
                    >
                      Use Full Balance
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
                <MdClose />
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

                {/* Deposit option */}
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--brand-pink-glow)', border: '1px dashed var(--brand-pink)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Deposit invoice</strong>
                    <div>Items keep their full price; the document shows the deposit due now and the remaining balance.</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                    <button type="button" className={`btn btn-sm ${Number(depositPercent) === 0 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDepositPercent(0)}>
                      Full
                    </button>
                    <button type="button" className={`btn btn-sm ${Number(depositPercent) === 50 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDepositPercent(50)}>
                      50% Deposit
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="number"
                        value={depositPercent}
                        onChange={(e) => setDepositPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        style={{ width: '70px', height: 'var(--control-height-sm)', fontSize: '0.85rem', textAlign: 'right' }}
                        min="0"
                        max="100"
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>%</span>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Invoiced Items</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLine}>
                      <MdAdd />
                      <span>Custom Item</span>
                    </button>
                  </div>

                  <table className="line-items-table">
                    <thead>
                      <tr>
                        <th>Item Description</th>
                        <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Price (RM)</th>
                        <th style={{ width: '180px', textAlign: 'right' }}>Discount</th>
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
                          <td>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                              style={{ fontSize: '0.85rem', textAlign: 'center' }}
                              min="1"
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => handleLineItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0.00)}
                              style={{ fontSize: '0.85rem', textAlign: 'right' }}
                              step="0.01"
                              required
                            />
                          </td>
                          <td>
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
                          <td>
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
                    {Number(depositPercent) > 0 && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 600, marginTop: '0.25rem' }}>
                          <span>Deposit ({Number(depositPercent)}%)</span>
                          <span>RM {depositAmount.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>Balance</span>
                          <span>RM {balanceAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Invoice"
        message={`Are you sure you want to delete the invoice for "${deleteTarget?.customer?.name || 'this client'}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        pending={deleting}
      />
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
