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

// The status stamp is drawn with a CSS mask html2canvas can't rasterise. We
// recolour the (monochrome) logo SVG to the stamp colour and paint it as a
// background-image instead, which html2canvas does render.
let _stampSvg = null;
let _stampTried = false;
async function loadStampSvg() {
  if (_stampTried) return _stampSvg;
  _stampTried = true;
  try {
    const res = await fetch('/stamp-logo.svg');
    _stampSvg = res.ok ? await res.text() : null;
  } catch {
    _stampSvg = null;
  }
  return _stampSvg;
}

export async function renderElementToPages(element, meta = {}) {
  if (!element) throw new Error('Nothing to render');
  const { default: html2canvas } = await import('html2canvas');
  const stampSvg = await loadStampSvg();

  // Measure the status stamp on the source (desktop layout) BEFORE capture. Its
  // logo is drawn with a CSS mask html2canvas can't rasterise, so we hide it in
  // the capture and paint the recoloured logo onto the page canvas ourselves.
  const srcRect0 = element.getBoundingClientRect();
  let stampRaw = null;
  const stampEl = element.querySelector('.pdf-stamp-mark');
  if (stampEl && stampSvg) {
    const r = stampEl.getBoundingClientRect();
    stampRaw = {
      cx: r.left + r.width / 2 - srcRect0.left, // centre (rotation-invariant), CSS px
      cy: r.top + r.height / 2 - srcRect0.top,
      w: stampEl.offsetWidth || 110, // unrotated size
      h: stampEl.offsetHeight || 26,
      color: getComputedStyle(stampEl).backgroundColor || '#dc2626',
      angle: -8, // matches the stamp box's rotate(-8deg)
    };
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    windowWidth: 1200, // force the desktop A4 layout regardless of device
    onclone: (doc) => {
      // Keep the layout (so our measurement stays valid) but render nothing —
      // the logo is drawn onto the canvas afterwards.
      doc.querySelectorAll('.pdf-stamp-mark').forEach((n) => { n.style.visibility = 'hidden'; });
    },
  });

  const W = canvas.width;
  const pxPerMm = W / PAGE_W_MM;
  const pageHpx = Math.round(PAGE_H_MM * pxPerMm);
  const marginTopPx = Math.round(MARGIN_TOP_MM * pxPerMm);
  const usableHpx = Math.floor((PAGE_H_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM) * pxPerMm);

  // Load the recoloured stamp logo (awaited, so drawImage always has it ready)
  let stampImg = null;
  let stamp = null;
  if (stampRaw) {
    const sx = W / (element.offsetWidth || W);
    const sy = canvas.height / (element.offsetHeight || canvas.height);
    const colored = stampSvg.replace(/#000000/gi, stampRaw.color);
    const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(colored);
    stampImg = await new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = uri;
    });
    stamp = { cx: stampRaw.cx * sx, cy: stampRaw.cy * sy, w: stampRaw.w * sx, h: stampRaw.h * sy, angle: stampRaw.angle };
  }

  // Keep-together blocks (terms, payment info, totals): their vertical ranges
  // in canvas px. A page break must not fall through the middle of one, so a
  // block that would be split is pushed whole onto the next page.
  const scaleY = canvas.height / (element.offsetHeight || canvas.height);
  const srcTop = element.getBoundingClientRect().top;
  const keepRanges = Array.from(element.querySelectorAll('.pdf-avoid-break'))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { top: (r.top - srcTop) * scaleY, bottom: (r.bottom - srcTop) * scaleY };
    })
    .filter((rng) => rng.bottom - rng.top <= usableHpx); // only if it fits a page

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
    let cut = Math.min(y + usableHpx, canvas.height);
    if (cut < canvas.height) {
      const minCut = y + Math.floor(usableHpx * 0.35);
      // don't split a keep-together block: pull the cut up to the block's top
      let target = cut;
      for (const rng of keepRanges) {
        if (rng.top >= minCut && rng.top < cut && rng.bottom > cut) {
          target = Math.min(target, rng.top);
        }
      }
      cut = Math.floor(target);
      // snap to a run of whitespace so rows/text aren't cut in half
      for (let t = cut; t >= minCut; t--) {
        if (isSafeRow(t)) { cut = t; break; }
      }
    }
    slices.push({ y, h: cut - y });
    y = cut;
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

    // Paint the recoloured status-stamp logo onto the page it lands on,
    // preserving its aspect ratio (contain) so it isn't squashed.
    if (stampImg && stamp && stamp.cy >= s.y && stamp.cy < s.y + s.h) {
      const natAspect = (stampImg.naturalWidth || 1) / (stampImg.naturalHeight || 1);
      const boxAspect = stamp.w / stamp.h;
      let dw = stamp.w;
      let dh = stamp.h;
      if (natAspect > boxAspect) dh = stamp.w / natAspect; // limited by width
      else dw = stamp.h * natAspect; // limited by height
      p.save();
      p.translate(stamp.cx, marginTopPx + (stamp.cy - s.y));
      p.rotate((stamp.angle * Math.PI) / 180);
      p.drawImage(stampImg, -dw / 2, -dh / 2, dw, dh);
      p.restore();
    }

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
