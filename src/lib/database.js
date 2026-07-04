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

  async deleteCustomer(id) {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) {
        const check = handleDbError(error);
        if (check) {
          setLocalStorageData('juruweb_customers', getLocalStorageData('juruweb_customers').filter(c => c.id !== id));
          return { ...check };
        }
        throw error;
      }
      return { success: true };
    } catch {
      setLocalStorageData('juruweb_customers', getLocalStorageData('juruweb_customers').filter(c => c.id !== id));
      return { success: true };
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

  async deleteOrder(id) {
    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) {
        const check = handleDbError(error);
        if (check) {
          setLocalStorageData('juruweb_orders', getLocalStorageData('juruweb_orders').filter(o => o.id !== id));
          return { ...check };
        }
        throw error;
      }
      return { success: true };
    } catch {
      setLocalStorageData('juruweb_orders', getLocalStorageData('juruweb_orders').filter(o => o.id !== id));
      return { success: true };
    }
  },

  async updateOrderStatus(orderId, status) {
    return this.updateOrder(orderId, { status });
  },

  // Patch arbitrary order fields (status, notes/remark, …) with a localStorage fallback
  async updateOrder(orderId, fields) {
    const applyLocal = (extra = {}) => {
      const list = getLocalStorageData('juruweb_orders');
      const idx = list.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...fields };
        setLocalStorageData('juruweb_orders', list);
      }
      return { success: true, ...extra };
    };
    try {
      const { data, error } = await supabase.from('orders').update(fields).eq('id', orderId).select();
      if (error) {
        const check = handleDbError(error);
        if (check) return { data, ...applyLocal(check) };
        throw error;
      }
      return { data };
    } catch {
      return applyLocal();
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

  async deleteQuotation(id) {
    try {
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      if (error) {
        const check = handleDbError(error);
        if (check) {
          setLocalStorageData('juruweb_quotations', getLocalStorageData('juruweb_quotations').filter(q => q.id !== id));
          return { ...check };
        }
        throw error;
      }
      return { success: true };
    } catch {
      setLocalStorageData('juruweb_quotations', getLocalStorageData('juruweb_quotations').filter(q => q.id !== id));
      return { success: true };
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

  async deleteInvoice(id) {
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) {
        const check = handleDbError(error);
        if (check) {
          setLocalStorageData('juruweb_invoices', getLocalStorageData('juruweb_invoices').filter(i => i.id !== id));
          return { ...check };
        }
        throw error;
      }
      return { success: true };
    } catch {
      setLocalStorageData('juruweb_invoices', getLocalStorageData('juruweb_invoices').filter(i => i.id !== id));
      return { success: true };
    }
  },

  async addInvoice(invoice) {
    try {
      let { data, error } = await supabase.from('invoices').insert([invoice]).select();
      // Gracefully handle DBs where the optional deposit_percent column hasn't been added yet
      if (error && /deposit_percent/.test(error.message || '')) {
        const { deposit_percent, ...rest } = invoice;
        ({ data, error } = await supabase.from('invoices').insert([rest]).select());
      }
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
  },

  async updateInvoiceStatus(invoiceId, status) {
    try {
      const { data, error } = await supabase.from('invoices').update({ status }).eq('id', invoiceId).select();
      if (error) {
        const check = handleDbError(error);
        if (check) {
          const list = getLocalStorageData('juruweb_invoices');
          const idx = list.findIndex(i => i.id === invoiceId);
          if (idx !== -1) {
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
        list[idx].status = status;
        setLocalStorageData('juruweb_invoices', list);
      }
      return { success: true };
    }
  },

  // ---- PUBLIC CUSTOMER TRACKING (lookup by phone number) ----
  // Returns { data: { customer, orders, invoices } } or { data: null } when
  // no customer matches. Matches on the trailing digits so leading zeros and
  // country codes (e.g. 0123456789 vs +60123456789) still resolve.
  async getCustomerRecordByPhone(rawPhone) {
    const digits = (rawPhone || '').replace(/\D/g, '');
    if (digits.length < 6) return { data: null, invalid: true };
    const tail = digits.slice(-8);

    // Resolve each invoice's project: prefer its own order_id, else inherit the
    // order_id of the quotation it was generated from. Lets invoices group under
    // their project on the tracker even if the link wasn't set directly.
    const linkToProjects = (invs, quotes) => {
      const qOrder = {};
      (quotes || []).forEach((q) => { if (q && q.order_id) qOrder[q.id] = q.order_id; });
      return (invs || []).map((inv) =>
        inv.order_id ? inv : { ...inv, order_id: (inv.quotation_id && qOrder[inv.quotation_id]) || null }
      );
    };

    const buildLocal = (extra = {}) => {
      const custs = getLocalStorageData('juruweb_customers');
      const customer = custs.find(c => (c.phone || '').replace(/\D/g, '').includes(tail));
      if (!customer) return { data: null, ...extra };
      const orders = getLocalStorageData('juruweb_orders')
        .filter(o => o.customer_id === customer.id);
      const quotations = getLocalStorageData('juruweb_quotations')
        .filter(q => q.customer_id === customer.id);
      const invoices = linkToProjects(
        getLocalStorageData('juruweb_invoices').filter(i => i.customer_id === customer.id),
        quotations,
      );
      return { data: { customer, orders, invoices }, ...extra };
    };

    try {
      const { data: custs, error } = await supabase
        .from('customers')
        .select('*')
        .ilike('phone', `%${tail}%`);
      if (error) {
        if (handleDbError(error)) return buildLocal({ isDbSetupRequired: true });
        throw error;
      }
      const customer = (custs || [])[0];
      if (!customer) return { data: null };
      const [ordersRes, invoicesRes, quotesRes] = await Promise.all([
        supabase.from('orders').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
        supabase.from('quotations').select('id, order_id').eq('customer_id', customer.id),
      ]);
      const invoices = linkToProjects(invoicesRes.data || [], quotesRes.data || []);
      return { data: { customer, orders: ordersRes.data || [], invoices } };
    } catch {
      return buildLocal();
    }
  }
};
