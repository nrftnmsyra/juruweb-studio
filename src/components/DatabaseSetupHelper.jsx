'use client';

import { useState } from 'react';
import { MdStorage, MdContentCopy, MdCheck } from 'react-icons/md';

export default function DatabaseSetupHelper() {
  const [copied, setCopied] = useState(false);

  const sqlCode = `-- Juruweb Studio Dashboard: Supabase Database Schema

-- 1. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    company TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.customers FOR DELETE USING (true);

-- 2. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    package_type TEXT NOT NULL,
    status TEXT DEFAULT 'New'::text NOT NULL,
    eta_date DATE,
    start_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    total_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.orders FOR DELETE USING (true);

-- 3. QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    subtotal NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    tax NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    total NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    status TEXT DEFAULT 'Draft'::text NOT NULL,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Quotations
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.quotations FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.quotations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.quotations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.quotations FOR DELETE USING (true);

-- 4. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    subtotal NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    tax NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    total NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    amount_paid NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    deposit_percent NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'Draft'::text NOT NULL,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- For existing databases: add the deposit column if it's missing
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC(5, 2) DEFAULT 0 NOT NULL;

-- Enable RLS for Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.invoices FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.invoices FOR DELETE USING (true);

-- 5. LEDGER TABLE (company cash book: credit = money in, debit = money out)
CREATE TABLE IF NOT EXISTS public.ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL,
    amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    reference_no TEXT,
    description TEXT,
    entry_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Ledger
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.ledger FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.ledger FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.ledger FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.ledger FOR DELETE USING (true);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="db-alert">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="db-alert-title">
          <MdStorage />
          <span>Supabase Schema Configuration Required</span>
        </div>
        <button 
          onClick={copyToClipboard} 
          className="btn btn-sm btn-secondary"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          {copied ? <MdCheck style={{ color: 'var(--success)' }} /> : <MdContentCopy />}
          <span>{copied ? 'Copied SQL!' : 'Copy SQL Schema'}</span>
        </button>
      </div>
      <p className="db-alert-text">
        The database tables are missing in your Supabase project. To resolve this, open your 
        <strong> Supabase Dashboard</strong>, navigate to the <strong>SQL Editor</strong>, 
        create a new query, paste the SQL schema below, and run it. The dashboard will automatically 
        connect and update!
      </p>
      <pre className="db-alert-sql">
        <code>{sqlCode}</code>
      </pre>
    </div>
  );
}
