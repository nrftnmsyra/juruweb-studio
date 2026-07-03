'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dbService } from '@/lib/database';
import DatabaseSetupHelper from '@/components/DatabaseSetupHelper';
import ConfirmDialog from '@/components/ConfirmDialog';
import { MdAdd, MdSearch, MdMail, MdPhone, MdLocationOn, MdWork, MdClose, MdDelete } from 'react-icons/md';
import toast from 'react-hot-toast';

function CustomersContent() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbSetupRequired, setDbSetupRequired] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: ''
  });

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Check if '?new=true' is in the query params to auto-open the modal
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      setLoading(true);
      const res = await dbService.getCustomers();
      if (res.isDbSetupRequired) {
        setDbSetupRequired(true);
      }
      setCustomers(res.data || []);
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Name & Email are required!');
      return;
    }

    try {
      const res = await dbService.addCustomer(formData);
      if (res.isDbSetupRequired) {
        setDbSetupRequired(true);
      }
      toast.success('Customer added successfully!');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', company: '', address: '' });
      loadCustomers();
    } catch (error) {
      toast.error('Error adding customer');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dbService.deleteCustomer(deleteTarget.id);
      toast.success('Customer deleted successfully!');
      setDeleteTarget(null);
      loadCustomers();
    } catch {
      toast.error('Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  // Filter customers by search term
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Directory</h1>
          <p className="page-subtitle">Manage customer details and profiles.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <MdAdd />
          <span>Add Client</span>
        </button>
      </div>

      {dbSetupRequired && <DatabaseSetupHelper />}

      {/* Control bar */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '340px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <MdSearch style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          className="input-bare"
          type="text"
          placeholder="Search by name, email, or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ fontSize: '0.9rem' }}
        />
      </div>

      {/* Customers List */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Loading directory...</p>
      ) : filteredCustomers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No clients found matching the search criteria.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table data-table--stack">
            <thead>
              <tr>
                <th>Customer / Company</th>
                <th>Contact Details</th>
                <th>Address</th>
                <th>Date Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((cust) => (
                <tr key={cust.id}>
                  <td>
                    <div className="u-caps" style={{ fontWeight: 600, fontSize: '0.95rem' }}>{cust.name}</div>
                    {cust.company && (
                      <div className="u-caps" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
                        <MdWork size={12} />
                        <span>{cust.company}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                      <MdMail size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>{cust.email}</span>
                    </div>
                    {cust.phone && (
                      <div className="u-caps" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                        <MdPhone size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{cust.phone}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    {cust.address ? (
                      <div className="u-caps" style={{ display: 'flex', alignItems: 'start', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                        <MdLocationOn size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
                        <span>{cust.address}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {new Date(cust.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-secondary icon-btn-sm" onClick={() => setDeleteTarget(cust)} title="Delete customer">
                      <MdDelete />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register Customer</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input 
                      type="text" 
                      name="name" 
                      placeholder="e.g. John Doe"
                      value={formData.name} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Company Name</label>
                    <input 
                      type="text" 
                      name="company" 
                      placeholder="e.g. ABC Sdn Bhd"
                      value={formData.company} 
                      onChange={handleInputChange} 
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="e.g. client@example.com"
                      value={formData.email} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                      type="text" 
                      name="phone" 
                      placeholder="e.g. +60123456789"
                      value={formData.phone} 
                      onChange={handleInputChange} 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>Business Address</label>
                  <textarea 
                    name="address" 
                    rows="3" 
                    placeholder="Full invoice mailing address"
                    value={formData.address} 
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Client Details</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        pending={deleting}
      />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Loading Search Parameters...</p>}>
      <CustomersContent />
    </Suspense>
  );
}
