'use client';

// Deterministic, WYSIWYG PDF export.
//
// We render the document element to a canvas ONCE at a fixed desktop A4 width
// (so phones/tablets produce identical output), then slice it into A4 page
// images. Both the on-screen preview AND the downloaded PDF are built from the
// SAME page images — so the preview page count always matches the download.
//
// Page breaks snap to a run of whitespace so rows/text are never cut in half,
// and each page keeps top/bottom margins (a proper footer gap).

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_TOP_MM = 8;
const MARGIN_BOTTOM_MM = 12;

export async function renderElementToPages(element) {
  if (!element) throw new Error('Nothing to render');
  const { default: html2canvas } = await import('html2canvas');

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    windowWidth: 1200, // force the desktop A4 layout regardless of device
    onclone: (doc) => {
      // The status stamp uses a CSS mask-image html2canvas can't rasterise;
      // hide the masked logo so it doesn't become a solid block (the coloured
      // border + PAID/UNPAID label remain).
      doc.querySelectorAll('.pdf-stamp-mark').forEach((n) => { n.style.display = 'none'; });
    },
  });

  const W = canvas.width;
  const pxPerMm = W / PAGE_W_MM;
  const usableHpx = Math.floor((PAGE_H_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM) * pxPerMm);

  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, W, canvas.height);
  const step = Math.max(1, Math.floor(W / 64));

  // A row is a safe place to cut if it has no dark (text/graphic) pixels.
  const isSafeRow = (y) => {
    if (y <= 0 || y >= canvas.height) return true;
    for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4;
      if (data[i] < 150 && data[i + 1] < 150 && data[i + 2] < 150) return false;
    }
    return true;
  };

  const pages = [];
  let y = 0;
  while (y < canvas.height) {
    let sliceH = Math.min(usableHpx, canvas.height - y);
    if (y + sliceH < canvas.height) {
      const minH = Math.floor(sliceH * 0.72);
      for (let t = sliceH; t >= minH; t--) {
        if (isSafeRow(y + t)) { sliceH = t; break; }
      }
    }
    const slice = document.createElement('canvas');
    slice.width = W;
    slice.height = sliceH;
    slice.getContext('2d').drawImage(canvas, 0, y, W, sliceH, 0, 0, W, sliceH);
    pages.push({ img: slice.toDataURL('image/jpeg', 0.92), heightMm: sliceH / pxPerMm });
    y += sliceH;
  }

  return {
    pages,
    pageWmm: PAGE_W_MM,
    pageHmm: PAGE_H_MM,
    marginTopMm: MARGIN_TOP_MM,
    marginBottomMm: MARGIN_BOTTOM_MM,
  };
}

export async function downloadPagesAsPdf(rendered, filename) {
  const { pages, pageWmm, marginTopMm } = rendered;
  if (!pages || !pages.length) throw new Error('Nothing to export');
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pages.forEach((p, idx) => {
    if (idx > 0) pdf.addPage();
    pdf.addImage(p.img, 'JPEG', 0, marginTopMm, pageWmm, p.heightMm, undefined, 'FAST');
  });
  pdf.save(filename);
}
