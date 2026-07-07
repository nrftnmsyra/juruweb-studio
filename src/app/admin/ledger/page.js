'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dbService } from '@/lib/database';
import DatabaseSetupHelper from '@/components/DatabaseSetupHelper';
import ConfirmDialog from '@/components/ConfirmDialog';
import { MdAdd, MdClose, MdDelete, MdArrowDownward, MdArrowUpward, MdChevronRight } from 'react-icons/md';
import toast from 'react-hot-toast';

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  type: 'Credit',
  amount: '',
  reference_no: '',
  description: '',
  entry_date: todayStr(),
});

function LedgerContent() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbSetupRequired, setDbSetupRequired] = useState(false);
  const [typeFilter, setTypeFilter] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Mobile: tap a compact row to view the full entry details
  const [detailTarget, setDetailTarget] = useState(null);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const res = await dbService.getLedgerEntries();
      if (res.isDbSetupRequired) setDbSetupRequired(true);
      setEntries(res.data || []);
    } catch {
      toast.error('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter an amount greater than 0');
      return;
    }
    if (!formData.entry_date) {
      toast.error('Please pick a date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await dbService.addLedgerEntry({
        type: formData.type,
        amount,
        reference_no: formData.reference_no.trim(),
        description: formData.description.trim(),
        entry_date: formData.entry_date,
      });
      if (res.isDbSetupRequired) setDbSetupRequired(true);
      toast.success(`${formData.type} entry recorded!`);
      setIsModalOpen(false);
      setFormData(emptyForm());
      loadData();
    } catch {
      toast.error('Error recording entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dbService.deleteLedgerEntry(deleteTarget.id);
      toast.success('Entry deleted');
      setDeleteTarget(null);
      loadData();
    } catch {
      toast.error('Failed to delete entry');
    } finally {
      setDeleting(false);
    }
  };

  // Totals are always across the full ledger, independent of the active filter
  const totalCredit = entries
    .filter((e) => e.type === 'Credit')
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const totalDebit = entries
    .filter((e) => e.type === 'Debit')
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const balance = totalCredit - totalDebit;

  const filteredEntries =
    typeFilter === 'All' ? entries : entries.filter((e) => e.type === typeFilter);

  const fmt = (n) => `RM ${Number(n).toFixed(2)}`;
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ledger</h1>
          <p className="page-subtitle">Track credit and debit movements on your company account.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormData(emptyForm()); setIsModalOpen(true); }}>
          <MdAdd />
          <span>New Entry</span>
        </button>
      </div>

      {dbSetupRequired && <DatabaseSetupHelper />}

      {/* KPI row */}
      <div className="overview-stats overview-stats--3">
        <div className="overview-stat">
          <span className="overview-stat-label">Total Credit (In)</span>
          <span className="overview-stat-value" style={{ color: 'var(--success)' }}>{fmt(totalCredit)}</span>
        </div>
        <div className="overview-stat">
          <span className="overview-stat-label">Total Debit (Out)</span>
          <span className="overview-stat-value" style={{ color: 'var(--error)' }}>{fmt(totalDebit)}</span>
        </div>
        <div className="overview-stat">
          <span className="overview-stat-label">Balance</span>
          <span className="overview-stat-value" style={{ color: balance < 0 ? 'var(--error)' : 'var(--text-primary)' }}>{fmt(balance)}</span>
        </div>
      </div>

      {/* Type filter */}
      <div className="filter-bar ledger-filter">
        <label htmlFor="ledger-type-filter">Filter by type</label>
        <select
          id="ledger-type-filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          {['All', 'Credit', 'Debit'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Loading ledger...</p>
      ) : filteredEntries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            {typeFilter === 'All' ? 'No ledger entries yet. Add one to get started.' : `No "${typeFilter}" entries found.`}
          </p>
        </div>
      ) : (
        <>
        {/* Full table — desktop / tablet */}
        <div className="table-container ledger-table-wrap">
          <table className="data-table data-table--stack">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference No.</th>
                <th>Details</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => {
                const isCredit = entry.type === 'Credit';
                return (
                  <tr key={entry.id}>
                    <td data-label="Date" style={{ whiteSpace: 'nowrap' }}>{fmtDate(entry.entry_date)}</td>
                    <td data-label="Type">
                      <span className={`badge ${isCredit ? 'badge-paid' : 'badge-cancelled'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {isCredit ? <MdArrowDownward size={12} /> : <MdArrowUpward size={12} />}
                        {entry.type}
                      </span>
                    </td>
                    <td data-label="Reference No.">{entry.reference_no || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td data-label="Details">{entry.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td data-label="Amount" style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: isCredit ? 'var(--success)' : 'var(--error)' }}>
                      {isCredit ? '+' : '−'} {fmt(entry.amount)}
                    </td>
                    <td data-label="" style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary icon-btn-sm" onClick={() => setDeleteTarget(entry)} title="Delete entry">
                        <MdDelete />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Compact tappable rows — mobile */}
        <div className="ledger-compact">
          {filteredEntries.map((entry) => {
            const isCredit = entry.type === 'Credit';
            return (
              <button
                type="button"
                key={entry.id}
                className="ledger-compact-row"
                onClick={() => setDetailTarget(entry)}
              >
                <span className="ledger-compact-main">
                  <span className={`ledger-compact-icon ${isCredit ? 'ledger-compact-icon--credit' : 'ledger-compact-icon--debit'}`}>
                    {isCredit ? <MdArrowDownward /> : <MdArrowUpward />}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span className="ledger-compact-type">{entry.type}</span>
                    <span className="ledger-compact-date">{fmtDate(entry.entry_date)}</span>
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="ledger-compact-amount" style={{ color: isCredit ? 'var(--success)' : 'var(--error)' }}>
                    {isCredit ? '+' : '−'} {fmt(entry.amount)}
                  </span>
                  <MdChevronRight style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </span>
              </button>
            );
          })}
        </div>
        </>
      )}

      {/* Modal: Entry details (opened from the compact mobile list) */}
      {detailTarget && (
        <div className="modal-overlay" onClick={() => setDetailTarget(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Entry Details</h3>
              <button className="modal-close" onClick={() => setDetailTarget(null)}>
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: detailTarget.type === 'Credit' ? 'var(--success)' : 'var(--error)' }}>
                  {detailTarget.type === 'Credit' ? '+' : '−'} {fmt(detailTarget.amount)}
                </div>
                <span className={`badge ${detailTarget.type === 'Credit' ? 'badge-paid' : 'badge-cancelled'}`} style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  {detailTarget.type === 'Credit' ? <MdArrowDownward size={12} /> : <MdArrowUpward size={12} />}
                  {detailTarget.type}
                </span>
              </div>
              <div className="ledger-detail-row">
                <span className="ledger-detail-label">Date</span>
                <span className="ledger-detail-value">{fmtDate(detailTarget.entry_date)}</span>
              </div>
              <div className="ledger-detail-row">
                <span className="ledger-detail-label">Reference No.</span>
                <span className="ledger-detail-value">{detailTarget.reference_no || '—'}</span>
              </div>
              <div className="ledger-detail-row">
                <span className="ledger-detail-label">Details</span>
                <span className="ledger-detail-value">{detailTarget.description || '—'}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { const t = detailTarget; setDetailTarget(null); setDeleteTarget(t); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <MdDelete /> Delete
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setDetailTarget(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Ledger Entry */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">New Ledger Entry</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Type *</label>
                    <select name="type" value={formData.type} onChange={handleInputChange}>
                      <option value="Credit">Credit (money in)</option>
                      <option value="Debit">Debit (money out)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Amount (RM) *</label>
                    <input
                      type="number"
                      name="amount"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>Date *</label>
                  <input
                    type="date"
                    name="entry_date"
                    value={formData.entry_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>Reference No.</label>
                  <input
                    type="text"
                    name="reference_no"
                    placeholder="e.g. Bank transfer ref, receipt / transaction number"
                    value={formData.reference_no}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>Details / Remark</label>
                  <textarea
                    name="description"
                    rows="3"
                    placeholder="What was this payment for? (e.g. deposit received, hosting renewal, tools subscription)"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Record Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Ledger Entry"
        message={`Delete this ${deleteTarget?.type?.toLowerCase() || ''} entry of ${deleteTarget ? fmt(deleteTarget.amount) : ''}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        pending={deleting}
      />
    </div>
  );
}

export default function LedgerPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Loading Search Parameters...</p>}>
      <LedgerContent />
    </Suspense>
  );
}
