'use client';

// Deterministic, WYSIWYG PDF export.
//
// The document is rendered to a canvas ONCE at a fixed desktop A4 width (so
// phones/tablets produce identical output), then composited into full A4 page
// images: each page = white A4 sheet + a slice of the content + a running
// header (continuation pages) and footer (every page). The preview AND the
// download use these exact images, so the preview page count always matches.
//
// Page breaks snap to whitespace so rows/text are never cut in half.

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_TOP_MM = 14;
const MARGIN_BOTTOM_MM = 16;
const SIDE_MM = 18;

export async function renderElementToPages(element, meta = {}) {
  if (!element) throw new Error('Nothing to render');
  const { default: html2canvas } = await import('html2canvas');

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    windowWidth: 1200, // force the desktop A4 layout regardless of device
    onclone: (doc) => {
      // The status stamp uses a CSS mask-image html2canvas can't rasterise;
      // hide the masked logo so it doesn't become a solid block.
      doc.querySelectorAll('.pdf-stamp-mark').forEach((n) => { n.style.display = 'none'; });
    },
  });

  const W = canvas.width;
  const pxPerMm = W / PAGE_W_MM;
  const pageHpx = Math.round(PAGE_H_MM * pxPerMm);
  const marginTopPx = Math.round(MARGIN_TOP_MM * pxPerMm);
  const usableHpx = Math.floor((PAGE_H_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM) * pxPerMm);

  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, W, canvas.height);
  const step = Math.max(1, Math.floor(W / 64));
  const isSafeRow = (y) => {
    if (y <= 0 || y >= canvas.height) return true;
    for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4;
      if (data[i] < 150 && data[i + 1] < 150 && data[i + 2] < 150) return false;
    }
    return true;
  };

  // 1) work out the content slice for each page
  const slices = [];
  let y = 0;
  while (y < canvas.height) {
    let sliceH = Math.min(usableHpx, canvas.height - y);
    if (y + sliceH < canvas.height) {
      const minH = Math.floor(sliceH * 0.72);
      for (let t = sliceH; t >= minH; t--) {
        if (isSafeRow(y + t)) { sliceH = t; break; }
      }
    }
    slices.push({ y, h: sliceH });
    y += sliceH;
  }

  // 2) composite each slice onto a full A4 page with header/footer
  const total = slices.length;
  const sidePx = Math.round(SIDE_MM * pxPerMm);
  const fontPx = Math.max(10, Math.round(2.4 * pxPerMm));
  const font = `${fontPx}px 'Google Sans', -apple-system, Arial, sans-serif`;
  const brand = meta.brand || 'Juruweb Studio';
  const docLabel = meta.docLabel || '';
  const docTitle = meta.docTitle || '';

  const pages = slices.map((s, i) => {
    const page = document.createElement('canvas');
    page.width = W;
    page.height = pageHpx;
    const p = page.getContext('2d');
    p.fillStyle = '#ffffff';
    p.fillRect(0, 0, W, pageHpx);
    p.drawImage(canvas, 0, s.y, W, s.h, 0, marginTopPx, W, s.h);

    p.textBaseline = 'alphabetic';
    p.font = font;
    p.fillStyle = '#9ca3af';
    p.strokeStyle = '#e4e4e7';
    p.lineWidth = Math.max(1, Math.round(0.3 * pxPerMm));

    // Footer on every page: brand · ref (left), Page N of M (right)
    const footY = pageHpx - Math.round(7 * pxPerMm);
    const footRule = pageHpx - Math.round(10 * pxPerMm);
    p.beginPath(); p.moveTo(sidePx, footRule); p.lineTo(W - sidePx, footRule); p.stroke();
    p.textAlign = 'left';
    p.fillText([brand, docLabel].filter(Boolean).join('   ·   '), sidePx, footY);
    p.textAlign = 'right';
    p.fillText(`Page ${i + 1} of ${total}`, W - sidePx, footY);

    // Running header on continuation pages: title — continued (left), ref (right)
    if (i > 0) {
      const hY = Math.round(9 * pxPerMm);
      const hRule = Math.round(11 * pxPerMm);
      p.textAlign = 'left';
      p.fillText([docTitle, 'continued'].filter(Boolean).join(' — '), sidePx, hY);
      p.textAlign = 'right';
      p.fillText(docLabel, W - sidePx, hY);
      p.beginPath(); p.moveTo(sidePx, hRule); p.lineTo(W - sidePx, hRule); p.stroke();
    }

    return { img: page.toDataURL('image/jpeg', 0.92) };
  });

  return { pages, pageWmm: PAGE_W_MM, pageHmm: PAGE_H_MM };
}

export async function downloadPagesAsPdf(rendered, filename) {
  const { pages, pageWmm, pageHmm } = rendered;
  if (!pages || !pages.length) throw new Error('Nothing to export');
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pages.forEach((p, idx) => {
    if (idx > 0) pdf.addPage();
    pdf.addImage(p.img, 'JPEG', 0, 0, pageWmm, pageHmm, undefined, 'FAST');
  });
  pdf.save(filename);
}
