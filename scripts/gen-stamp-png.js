const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const pub = path.join(__dirname, '..', 'public');
const names = ['paid', 'partial', 'unpaid', 'cancelled'];

(async () => {
  const log = [];
  for (const n of names) {
    const src = path.join(pub, `stamp-logo-${n}.svg`);
    const out = path.join(pub, `stamp-logo-${n}.png`);
    try {
      const buf = await sharp(src, { density: 400 }).resize({ width: 400 }).png().toBuffer();
      fs.writeFileSync(out, buf);
      log.push(`${n}: ${buf.length} bytes`);
    } catch (e) {
      log.push(`${n}: ERROR ${e.message}`);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'gen-stamp-png.out'), log.join('\n'));
})();
