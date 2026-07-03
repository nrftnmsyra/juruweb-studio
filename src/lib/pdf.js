'use client';

// Deterministic client-side PDF export.
//
// Why not window.print()? Mobile/tablet browsers scale and paginate the print
// output based on their own viewport, which shrinks the A4 sheet and crops
// content that spills just past one page. Rendering the document to a canvas at
// a FIXED desktop width and laying it onto real A4 pages gives an identical,
// correctly-paginated result on every device.
export async function downloadElementAsPdf(element, filename) {
  if (!element) throw new Error('Nothing to export');

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2, // sharper text
    backgroundColor: '#ffffff',
    useCORS: true,
    // Force the desktop A4 layout regardless of the real device width, so the
    // mobile/tablet `@media screen` overrides don't leak into the export.
    windowWidth: 1200,
    onclone: (doc) => {
      // The status stamp is drawn with a CSS mask-image, which html2canvas
      // can't rasterise — hide the masked logo so it doesn't become a solid
      // block. The coloured border + PAID/UNPAID label remain.
      doc.querySelectorAll('.pdf-stamp-mark').forEach((n) => { n.style.display = 'none'; });
    },
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();   // 210mm
  const pageH = pdf.internal.pageSize.getHeight();  // 297mm
  const imgH = (canvas.height * pageW) / canvas.width;

  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  // First page, then shift the same tall image up one page height at a time.
  let heightLeft = imgH;
  let position = 0;
  pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH, undefined, 'FAST');
  heightLeft -= pageH;

  while (heightLeft > 0.5) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH, undefined, 'FAST');
    heightLeft -= pageH;
  }

  pdf.save(filename);
}
