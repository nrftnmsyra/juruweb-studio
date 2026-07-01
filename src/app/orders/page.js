'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dbService } from '@/lib/database';
import DatabaseSetupHelper from '@/components/DatabaseSetupHelper';
import { FiPlus, FiBriefcase, FiCalendar, FiClock, FiCheckCircle, FiChevronDown, FiAlertCircle, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

function OrdersContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbSetupRequired, setDbSetupRequired] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    package_type: 'Standard',
    eta_date: '',
    notes: '',
    total_amount: 999.00
  });

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
      const ordersRes = await dbService.getOrders();
      const custRes = await dbService.getCustomers();

      if (ordersRes.isDbSetupRequired || custRes.isDbSetupRequired) {
        setDbSetupRequired(true);
      }

      setOrders(ordersRes.data || []);
      setCustomers(custRes.data || []);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  // Pre-calculate prices based on selected package
  const handlePackageChange = (e) => {
    const pkg = e.target.value;
    let price = 0;
    
    // Set default timelines and prices based on the PDF pricing
    let defaultEtaOffsetDays = 5;
    if (pkg === 'Basic') {
      price = 699.00;
      defaultEtaOffsetDays = 4; // 3-5 working days
    } else if (pkg === 'Standard') {
      price = 999.00;
      defaultEtaOffsetDays = 6; // 5-7 working days
    } else if (pkg === 'Premium') {
      price = 1499.00;
      defaultEtaOffsetDays = 10; // 7-14 working days
    } else {
      price = 0;
    }

    // Pre-calculate ETA date
    const d = new Date();
    d.setDate(d.getDate() + defaultEtaOffsetDays);
    const etaStr = d.toISOString().split('T')[0];

    setFormData(prev => ({
      ...prev,
      package_type: pkg,
      total_amount: price,
      eta_date: etaStr
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) {
      toast.error('Please select a customer first!');
      return;
    }

    try {
      const res = await dbService.addOrder(formData);
      if (res.isDbSetupRequired) {
        setDbSetupRequired(true);
      }
      toast.success('Order created successfully!');
      setIsModalOpen(false);
      
      // Reset form
      setFormData({
        customer_id: '',
        package_type: 'Standard',
        eta_date: '',
        notes: '',
        total_amount: 999.00
      });
      loadData();
    } catch {
      toast.error('Error creating order');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await dbService.updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to: ${newStatus}`);
      loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Helper: Calculate project ETA progress bar percent
  const calculateProgress = (startDate, etaDateStr) => {
    if (!etaDateStr) return 0;
    const start = new Date(startDate).getTime();
    const end = new Date(etaDateStr).getTime();
    const now = new Date().getTime();

    if (now >= end) return 100;
    if (now <= start) return 0;

    const totalDuration = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
  };

  // Helper: Return how many days remaining
  const getDaysRemainingStr = (etaDateStr) => {
    if (!etaDateStr) return 'No target date';
    const end = new Date(etaDateStr);
    const now = new Date();
    // Reset hours
    end.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day(s)`;
    if (diffDays === 0) return 'Due today!';
    return `${diffDays} day(s) left`;
  };

  const filteredOrders = statusFilter === 'All' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Projects</h1>
          <p className="page-subtitle">Track project schedules, delivery ETAs, and progress statuses.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <FiPlus />
          <span>New Order</span>
        </button>
      </div>

      {dbSetupRequired && <DatabaseSetupHelper />}

      {/* Filter tab bar */}
      <div className="card" style={{ marginBottom: '2rem', padding: '0.75rem', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        {['All', 'New', 'In Progress', 'Review', 'Completed'].map((status) => (
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

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Loading project tracker...</p>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No orders found under "{statusFilter}" status.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredOrders.map((order) => {
            const progress = calculateProgress(order.start_date, order.eta_date);
            const daysLeft = getDaysRemainingStr(order.eta_date);
            const isCompleted = order.status === 'Completed';
            const isOverdue = daysLeft.includes('Overdue');

            return (
              <div className="card" key={order.id} style={{ borderLeft: isCompleted ? '4px solid var(--success)' : isOverdue ? '4px solid var(--error)' : '4px solid var(--brand-pink)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                  
                  {/* Left block: Customer & Package info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{order.customer?.name || 'Unknown Client'}</h3>
                      {order.customer?.company && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({order.customer.company})</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span>Package: <strong style={{ color: 'white' }}>{order.package_type} Plan</strong></span>
                      <span>•</span>
                      <span>Total Amount: <strong style={{ color: 'white' }}>RM {Number(order.total_amount).toFixed(2)}</strong></span>
                    </div>
                  </div>

                  {/* Middle block: ETA & Timeline */}
                  <div style={{ minWidth: '220px', flex: '0 1 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiCalendar />
                        <span>ETA: {order.eta_date ? new Date(order.eta_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}</span>
                      </span>
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverdue ? 'var(--error)' : isCompleted ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                        {isCompleted ? <FiCheckCircle /> : isOverdue ? <FiAlertCircle /> : <FiClock />}
                        <span>{isCompleted ? 'Finished' : daysLeft}</span>
                      </span>
                    </div>
                    
                    {!isCompleted && (
                      <div>
                        <div className="eta-progress-container">
                          <div className="eta-progress-bar" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Timeline usage: {progress}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right block: Action Status selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                      <select 
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        style={{ padding: '0.4rem 1.8rem 0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', appearance: 'none', backgroundPosition: 'right 0.5rem center' }}
                      >
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">Review</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <FiChevronDown style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.8rem', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </div>

                {order.notes && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#121214', borderRadius: '8px', border: '1px solid #202022', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <strong>Project Scope / Remarks:</strong> {order.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New Order Creation */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">New Client Project Order</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label>Select Customer *</label>
                  <select 
                    name="customer_id" 
                    value={formData.customer_id} 
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- Choose client directory account --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Package/Plan *</label>
                    <select 
                      name="package_type" 
                      value={formData.package_type}
                      onChange={handlePackageChange}
                    >
                      <option value="Basic">Basic Plan (RM 699)</option>
                      <option value="Standard">Standard Plan (RM 999)</option>
                      <option value="Premium">Premium Plan (RM 1,499)</option>
                      <option value="Custom">Custom Scope</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Project Price (RM) *</label>
                    <input 
                      type="number" 
                      name="total_amount" 
                      placeholder="Pricing amount"
                      value={formData.total_amount} 
                      onChange={handleInputChange}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>ETA Completion Deadline *</label>
                  <input 
                    type="date" 
                    name="eta_date" 
                    value={formData.eta_date} 
                    onChange={handleInputChange} 
                    required 
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Reference timeframe: Basic = 3–5 days, Standard = 5–7 days, Premium = 7–14 days.
                  </span>
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>Project Scope / Client Notes</label>
                  <textarea 
                    name="notes" 
                    rows="3" 
                    placeholder="Specific design instructions, add-ons requested, banner details, and core feature definitions."
                    value={formData.notes} 
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Order & Start Timer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Loading Search Parameters...</p>}>
      <OrdersContent />
    </Suspense>
  );
}
