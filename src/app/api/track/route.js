import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * Public order lookup for /track.
 *
 * The browser used to query Supabase directly with the anon key, which only
 * worked because every table allowed public reads. Now that RLS requires a
 * signed-in admin, the lookup runs here instead: the service key stays on the
 * server, and this route returns only the columns a customer should see.
 */

// Deliberately narrow — no internal notes, cost or margin fields leave here.
const CUSTOMER_FIELDS = 'id, name, email, phone, company';
const ORDER_FIELDS = 'id, package_type, status, eta_date, start_date, created_at, total_amount';
const INVOICE_FIELDS =
  'id, order_id, quotation_id, customer_id, items, subtotal, tax, total, status, due_date, created_at';

/** An invoice without its own order_id inherits one from its quotation. */
function linkToProjects(invoices, quotations) {
  const byQuotation = {};
  (quotations || []).forEach((q) => {
    if (q?.order_id) byQuotation[q.id] = q.order_id;
  });
  return (invoices || []).map((inv) =>
    inv.order_id
      ? inv
      : { ...inv, order_id: (inv.quotation_id && byQuotation[inv.quotation_id]) || null }
  );
}

export async function POST(request) {
  let phone = '';
  try {
    ({ phone = '' } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with a phone number.' }, { status: 400 });
  }

  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 6) {
    return NextResponse.json({ data: null, invalid: true });
  }
  const tail = digits.slice(-8);

  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error('[track]', err.message);
    return NextResponse.json(
      { error: 'Order tracking is unavailable right now. Please contact us on WhatsApp.' },
      { status: 503 }
    );
  }

  try {
    const { data: matches, error } = await supabase
      .from('customers')
      .select(CUSTOMER_FIELDS)
      .ilike('phone', `%${tail}%`)
      .limit(1);
    if (error) throw error;

    const customer = (matches || [])[0];
    if (!customer) return NextResponse.json({ data: null });

    const [orders, invoices, quotations] = await Promise.all([
      supabase
        .from('orders')
        .select(ORDER_FIELDS)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('invoices')
        .select(INVOICE_FIELDS)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false }),
      supabase.from('quotations').select('id, order_id').eq('customer_id', customer.id),
    ]);

    return NextResponse.json({
      data: {
        customer,
        orders: orders.data || [],
        invoices: linkToProjects(invoices.data || [], quotations.data || []),
      },
    });
  } catch (err) {
    console.error('[track] lookup failed', err);
    return NextResponse.json(
      { error: 'Could not look that up right now. Please try again shortly.' },
      { status: 500 }
    );
  }
}
