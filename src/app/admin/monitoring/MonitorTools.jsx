'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MdRefresh, MdPictureAsPdf } from 'react-icons/md';
import { getMonthlyReport } from './actions';

/** Previous 12 months, newest first, as {value: 'YYYY-MM-01', label: 'Sep 2026'}. */
function recentMonths() {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      label: d.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' }),
    });
  }
  return out;
}

export default function MonitorTools({ siteCount, neverChecked }) {
  const router = useRouter();
  const months = recentMonths();
  const [month, setMonth] = useState(months[0].value);
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState(null);
  const [pending, startTransition] = useTransition();

  const runCheckNow = async () => {
    setBusy('check');
    setNote(null);
    try {
      const res = await fetch('/api/cron/monitor', { method: 'POST' });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || 'Check failed');
      setNote({
        tone: 'ok',
        text: `Checked ${body.checked} site${body.checked === 1 ? '' : 's'}${
          body.failed ? `, ${body.failed} did not answer` : ', all answered'
        }.`,
      });
      startTransition(() => router.refresh());
    } catch (err) {
      setNote({ tone: 'error', text: err.message });
    } finally {
      setBusy(null);
    }
  };

  const downloadPdf = async () => {
    setBusy('pdf');
    setNote(null);
    try {
      const report = await getMonthlyReport(month);
      if (report.error) throw new Error(report.error);
      if (!report.rows?.length) throw new Error('No sites to report on.');

      // Loaded on demand: jspdf is large and most visits never build a report.
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const label = months.find((m) => m.value === month)?.label ?? month;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

      doc.setFontSize(18);
      doc.text('Website Monitoring Report', 40, 48);
      doc.setFontSize(11);
      doc.setTextColor(110);
      doc.text(`${label} · Juruweb Studio`, 40, 68);

      autoTable(doc, {
        startY: 92,
        head: [['Website', 'Client', 'Uptime', 'Avg speed', 'SEO score', 'SSL left', 'Domain left']],
        body: report.rows.map((r) => [
          r.label || r.domain,
          r.customer_name || '—',
          r.uptime_pct != null ? `${r.uptime_pct}%` : 'No data',
          r.avg_response_ms != null ? `${r.avg_response_ms} ms` : '—',
          r.avg_seo_score != null
            ? `${r.avg_seo_score}${
                r.first_seo_score != null && r.last_seo_score != null
                  ? ` (${r.last_seo_score - r.first_seo_score >= 0 ? '+' : ''}${
                      r.last_seo_score - r.first_seo_score
                    })`
                  : ''
              }`
            : '—',
          r.ssl_days_left != null ? `${r.ssl_days_left} days` : '—',
          r.domain_days_left != null ? `${r.domain_days_left} days` : '—',
        ]),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [255, 102, 196], textColor: 20 },
        alternateRowStyles: { fillColor: [250, 245, 249] },
      });

      const tail = doc.lastAutoTable?.finalY ?? 92;
      doc.setFontSize(9);
      doc.setTextColor(130);
      doc.text(
        'Checked once daily. SEO score is out of 100; the figure in brackets is the change across the month.',
        40,
        tail + 24
      );
      doc.text(
        'A dash means no data was collected — for domain expiry this is normal on .my, whose registry has no RDAP service.',
        40,
        tail + 38
      );

      doc.save(`juruweb-monitoring-${month.slice(0, 7)}.pdf`);
      setNote({ tone: 'ok', text: `Report for ${label} downloaded.` });
    } catch (err) {
      setNote({ tone: 'error', text: err.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card" style={{ padding: '1rem 1.15rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={runCheckNow}
          disabled={busy !== null || siteCount === 0}
        >
          <MdRefresh />
          <span>{busy === 'check' ? 'Checking…' : 'Check now'}</span>
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
          {/* Sits beside the select rather than above it, so no bottom margin. */}
          <label htmlFor="report-month" className="form-label" style={{ margin: '0 0.15rem 0 0' }}>
            Monthly report
          </label>
          <select
            id="report-month"
            className="form-input"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ width: 'auto' }}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary"
            onClick={downloadPdf}
            disabled={busy !== null || siteCount === 0}
          >
            <MdPictureAsPdf />
            <span>{busy === 'pdf' ? 'Building…' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {neverChecked > 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.7rem' }}>
          {neverChecked} site{neverChecked === 1 ? ' has' : 's have'} never been checked. Press Check
          now rather than waiting for tonight.
        </p>
      )}

      {note && (
        <p
          role="status"
          style={{
            fontSize: '0.85rem',
            fontWeight: 500,
            marginTop: '0.7rem',
            color: note.tone === 'ok' ? 'var(--success)' : 'var(--error)',
          }}
        >
          {note.text}
        </p>
      )}
      {pending && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          Refreshing…
        </p>
      )}
    </div>
  );
}
