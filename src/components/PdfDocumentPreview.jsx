'use client';

import { useEffect, useRef, useState } from 'react';
import { MdDownload, MdPrint } from 'react-icons/md';
import toast from 'react-hot-toast';
import { renderElementToPages, downloadPagesAsPdf } from '@/lib/pdf';

// Renders a document (passed as children) off-screen, captures it into A4 page
// images, and shows those exact images as the preview — so the preview always
// matches the downloaded PDF, page for page. `docKey` re-triggers rendering
// whenever the underlying document changes.
export default function PdfDocumentPreview({ docKey, filename, docLabel, docTitle, onBack, backLabel = '← Back', children }) {
  const sourceRef = useRef(null);
  const [rendered, setRendered] = useState(null);
  const [building, setBuilding] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBuilding(true);
    setRendered(null);

    const run = async () => {
      // let the document lay out, then make sure its images are loaded
      // (guarded with a timeout so a stalled image can never hang the render)
      await new Promise((r) => setTimeout(r, 120));
      const imgs = Array.from(sourceRef.current?.querySelectorAll('img') || []);
      await Promise.all(
        imgs.map((im) => (im.complete && im.naturalWidth
          ? null
          : new Promise((res) => {
              im.addEventListener('load', res, { once: true });
              im.addEventListener('error', res, { once: true });
              setTimeout(res, 2500);
            }))),
      );
      try {
        const res = await renderElementToPages(sourceRef.current, { docLabel, docTitle });
        if (!cancelled) setRendered(res);
      } catch {
        if (!cancelled) toast.error('Could not render the document preview');
      } finally {
        if (!cancelled) setBuilding(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [docKey]);

  const handleDownload = async () => {
    if (!rendered) return;
    setDownloading(true);
    const t = toast.loading('Preparing PDF…');
    try {
      await downloadPagesAsPdf(rendered, filename);
      toast.success('PDF downloaded!', { id: t });
    } catch {
      toast.error('Could not generate the PDF', { id: t });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="pdf-toolbar print-hide">
        <button className="btn btn-secondary" onClick={onBack}>
          <span>{backLabel}</span>
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => window.print()}
          disabled={building || !rendered}
          style={{ marginLeft: 'auto' }}
        >
          <MdPrint />
          <span>Print</span>
        </button>
        <button className="btn btn-primary" onClick={handleDownload} disabled={building || downloading || !rendered}>
          <MdDownload />
          <span>{downloading ? 'Preparing…' : building ? 'Rendering…' : 'Download PDF'}</span>
        </button>
      </div>

      {/* Off-screen capture source — the real document, laid out for html2canvas */}
      <div className="pdf-capture-source" aria-hidden>
        <div ref={sourceRef} className="pdf-preview">
          {children}
        </div>
      </div>

      {/* Visible, paginated preview built from the exact page images */}
      <div className="pdf-pages">
        {building && (
          <div className="pdf-page pdf-page--loading">
            <span>Rendering preview…</span>
          </div>
        )}
        {!building && rendered?.pages.map((p, i) => (
          <div className="pdf-page" key={i}>
            <img src={p.img} alt={`Page ${i + 1}`} style={{ display: 'block', width: '100%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
