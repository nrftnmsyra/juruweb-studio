'use client';

import { supabase } from './supabase';

// Helper to determine if we should fall back to LocalStorage
const getLocalStorageData = (key, defaultVal = []) => {
  if (typeof window === 'undefined') return defaultVal;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};

const setLocalStorageData = (key, data) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
};

// Initial Mock Data to wow the user straight out of the box!
const mockCustomers = [
  { id: 'c1', name: 'John Doe', email: 'john@example.com', phone: '+60123456789', company: 'JD Tech Solutions', address: '12, Jalan Ampang, Kuala Lumpur', created_at: new Date().toISOString() },
  { id: 'c2', name: 'Siti Aminah', email: 'siti@catering.co.my', phone: '+60176543210', company: 'Siti Catering Services', address: '45, Jalan Gurney, Penang', created_at: new Date().toISOString() },
];

const mockOrders = [
  { id: 'o1', customer_id: 'c1', package_type: 'Standard', status: 'In Progress', eta_date: '2026-07-15', start_date: '2026-07-01', notes: 'Growing technology site, requires custom banner', total_amount: 999.00, created_at: new Date().toISOString() },
  { id: 'o2', customer_id: 'c2', package_type: 'Basic', status: 'New', eta_date: '2026-07-08', start_date: '2026-07-01', notes: 'WhatsApp integration needed', total_amount: 699.00, created_at: new Date().toISOString() },
];

const mockQuotations = [
  {
    id: 'q1',
    order_id: 'o1',
    customer_id: 'c1',
    items: [
      { description: 'Standard Package - Multi-section website', quantity: 1, unit_price: 999.00 },
      { description: 'Extra Revision', quantity: 2, unit_price: 50.00 }
    ],
    subtotal: 1099.00,
    tax: 0.00,
    total: 1099.00,
    status: 'Sent',
    valid_until: '2026-07-31',
    created_at: new Date().toISOString()
  }
];

const mockInvoices = [
  {
    id: 'i1',
    order_id: 'o1',
    customer_id: 'c1',
    quotation_id: 'q1',
    items: [
      { description: 'Standard Package - 50% Deposit upfront', quantity: 1, unit_price: 499.50 }
    ],
    subtotal: 499.50,
    tax: 0.00,
    total: 499.50,
    amount_paid: 499.50,
    status: 'Paid',
    due_date: '2026-07-05',
    created_at: new Date().toISOString()
  }
];

// Initialize localStorage if empty
if (typeof window !== 'undefined') {
  if (!localStorage.getItem('juruweb_customers')) setLocalStorageData('juruweb_customers', mockCustomers);
  if (!localStorage.getItem('juruweb_orders')) setLocalStorageData('juruweb_orders', mockOrders);
  if (!localStorage.getItem('juruweb_quotations')) setLocalStorageData('juruweb_quotations', mockQuotations);
  if (!localStorage.getItem('juruweb_invoices')) setLocalStorageData('juruweb_invoices', mockInvoices);
}

// Error handling helper to detect if a table is missing
const handleDbError = (err) => {
  if (err && (err.code === 'PGRST205' || err.message?.includes('relation') || err.message?.includes('does not exist'))) {
    return { isDbSetupRequired: true };
  }
  return null;
};

// Database APIs
export const dbService = {
  // ---- CUSTOMERS ----
  async getCustomers() {
    try {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (error) {
        const check = handleDbError(error);
        if (check) return { data: getLocalStorageData('juruweb_customers'), ...check };
        throw error;
      }
      return { data };
    } catch {
      return { data: getLocalStorageData('juruweb_customers'), error: true };
    }
  },

  async addCustomer(customer) {
    try {
      const { data, error } = await supabase.from('customers').insert([customer]).select();
      if (error) {
        const check = handleDbError(error);
        if (check) {
          const list = getLocalStorageData('juruweb_customers');
          const newCust = { ...customer, id: 'c_' + Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
          list.unshift(newCust);
          setLocalStorageData('juruweb_customers', list);
          return { data: [newCust], ...check };
        }
        throw error;
      }
      return { data };
    } catch {
      const list = getLocalStorageData('juruweb_customers');
      const newCust = { ...customer, id: 'c_' + Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      list.unshift(newCust);
      setLocalStorageData('juruweb_customers', list);
      return { data: [newCust] };
    }
  },

  // ---- ORDERS ----
  async getOrders() {
    try {
      const { data, error } = await supabase.from('orders').select('*, customer:customers(*)').order('created_at', { ascending: false });
      if (error) {
        const check = handleDbError(error);
        if (check) {
          const localOrders = getLocalStorageData('juruweb_orders');
          const localCusts = getLocalStorageData('juruweb_customers');
          const dataWithCust = localOrders.map(o => ({
            ...o,
            customer: localCusts.find(c => c.id === o.customer_id) || {}
          }));
          return { data: dataWithCust, ...check };
        }
        throw error;
      }
      return { data };
    } catch {
      const localOrders = getLocalStorageData('juruweb_orders');
      const localCusts = getLocalStorageData('juruweb_customers');
      const dataWithCust = localOrders.map(o => ({
        ...o,
        customer: localCusts.find(c => c.id === o.customer_id) || {}
      }));
      return { data: dataWithCust, error: true };
    }
  },

  async addOrder(order) {
    try {
      const { data, error } = await supabase.from('orders').insert([order]).select();
      if (error) {
        const check = handleDbError(error);
        if (check) {
          const list = getLocalStorageData('juruweb_orders');
          const newOrder = { ...order, id: 'o_' + Math.random().toString(36).substr(2, 9), start_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString() };
          list.unshift(newOrder);
          setLocalStorageData('juruweb_orders', list);
          return { data: [newOrder], ...check };
        }
        throw error;
      }
      return { data };
    } catch {
      const list = getLocalStorageData('juruweb_orders');
      const newOrder = { ...order, id: 'o_' + Math.random().toString(36).substr(2, 9), start_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString() };
      list.unshift(newOrder);
      setLocalStorageData('juruweb_orders', list);
      return { data: [newOrder] };
    }
  },

  async updateOrderStatus(orderId, status) {
    try {
      const { data, error } = await supabase.from('orders').update({ status }).eq('id', orderId).select();
      if (error) {
        const check = handleDbError(error);
        if (check) {
          const list = getLocalStorageData('juruweb_orders');
          const idx = list.findIndex(o => o.id === orderId);
          if (idx !== -1) {
            list[idx].status = status;
            setLocalStorageData('juruweb_orders', list);
          }
          return { data, ...check };
        }
        throw error;
      }
      return { data };
    } catch {
      const list = getLocalStorageData('juruweb_orders');
      const idx = list.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        list[idx].status = status;
        setLocalStorageData('juruweb_orders', list);
      }
      return { success: true };
    }
  },

  // ---- QUOTATIONS ----
  async getQuotations() {
    try {
      const { data, error } = await supabase.from('quotations').select('*, customer:customers(*)').order('created_at', { ascending: false });
      if (error) {
        const check = handleDbError(error);
        if (check) {
          const localQuotes = getLocalStorageData('juruweb_quotations');
          const localCusts = getLocalStorageData('juruweb_customers');
          const dataWithCust = localQuotes.map(q => ({
            ...q,
            customer: localCusts.find(c => c.id === q.customer_id) || {}
          }));
          return { data: dataWithCust, ...check };
        }
        throw error;
      }
      return { data };
    } catch {
      const localQuotes = getLocalStorageData('juruweb_quotations');
      const localCusts = getLocalStorageData('juruweb_customers');
      const dataWithCust = localQuotes.map(q => ({
        ...q,
        customer: localCusts.find(c => c.id === q.customer_id) || {}
      }));
      return { data: dataWithCust, error: true };
    }
  },

  async addQuotation(quotation) {
    try {
      const { data, error } = await supabase.from('quotations').insert([quotation]).select();
      if (error) {
        const check = handleDbError(error);
        if (check) {
          const list = getLocalStorageData('juruweb_quotations');
          const newQuote = { ...quotation, id: 'q_' + Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
          list.unshift(newQuote);
          setLocalStorageData('juruweb_quotations', list);
          return { data: [newQuote], ...check };
        }
        throw error;
      }
      return { data };
    } catch {
      const list = getLocalStorageData('juruweb_quotations');
      const newQuote = { ...quotation, id: 'q_' + Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      list.unshift(newQuote);
      setLocalStorageData('juruweb_quotations', list);
      return { data: [newQuote] };
    }
  },

  // ---- INVOICES ----
  async getInvoices() {
    try {
      const { data, error } = await supabase.from('invoices').select('*, customer:customers(*)').order('created_at', { ascending: false });
      if (error) {
        const check = handleDbError(error);
        if (check) {
          const localInvs = getLocalStorageData('juruweb_invoices');
          const localCusts = getLocalStorageData('juruweb_customers');
          const dataWithCust = localInvs.map(i => ({
            ...i,
            customer: localCusts.find(c => c.id === i.customer_id) || {}
          }));
          return { data: dataWithCust, ...check };
        }
        throw error;
      }
      return { data };
    } catch {
      const localInvs = getLocalStorageData('juruweb_invoices');
      const localCusts = getLocalStorageData('juruweb_customers');
      const dataWithCust = localInvs.map(i => ({
        ...i,
        customer: localCusts.find(c => c.id === i.customer_id) || {}
      }));
      return { data: dataWithCust, error: true };
    }
  },

  async addInvoice(invoice) {
    try {
      const { data, error } = await supabase.from('invoices').insert([invoice]).select();
      if (error) {
        const check = handleDbError(error);
        if (check) {
          const list = getLocalStorageData('juruweb_invoices');
          const newInv = { ...invoice, id: 'i_' + Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
          list.unshift(newInv);
          setLocalStorageData('juruweb_invoices', list);
          return { data: [newInv], ...check };
        }
        throw error;
      }
      return { data };
    } catch {
      const list = getLocalStorageData('juruweb_invoices');
      const newInv = { ...invoice, id: 'i_' + Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      list.unshift(newInv);
      setLocalStorageData('juruweb_invoices', list);
      return { data: [newInv] };
    }
  },

  async updateInvoicePayment(invoiceId, amountPaid, status) {
    try {
      const { data, error } = await supabase.from('invoices').update({ amount_paid: amountPaid, status }).eq('id', invoiceId).select();
      if (error) {
        const check = handleDbError(error);
        if (check) {
          const list = getLocalStorageData('juruweb_invoices');
          const idx = list.findIndex(i => i.id === invoiceId);
          if (idx !== -1) {
            list[idx].amount_paid = amountPaid;
            list[idx].status = status;
            setLocalStorageData('juruweb_invoices', list);
          }
          return { data, ...check };
        }
        throw error;
      }
      return { data };
    } catch {
      const list = getLocalStorageData('juruweb_invoices');
      const idx = list.findIndex(i => i.id === invoiceId);
      if (idx !== -1) {
        list[idx].amount_paid = amountPaid;
        list[idx].status = status;
        setLocalStorageData('juruweb_invoices', list);
      }
      return { success: true };
    }
  }
};
