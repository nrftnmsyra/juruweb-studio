// Single source of truth for the landing page.
// The Live Build panel, the package matrix and the build timeline all read from
// here, so changing a price or a feature updates every one of them at once.

export const CTA_LINK = process.env.NEXT_PUBLIC_CTA_URL || 'https://linktr.ee/juruweb';

// Digits only, e.g. '60123456789'. When set, "Send this spec" opens WhatsApp with
// the visitor's build pre-filled. Empty falls back to CTA_LINK.
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

// Background photos for the two image-backed bands.
export const IMG_BAND =
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=60';
export const IMG_CTA =
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=60';

// Live client sites, tagged by trade so the wall can surface the visitor's own.
export const SITES = [
  { name: 'Cat Rumah', domain: 'catrumah.com.my', trade: 'home' },
  { name: 'Wall Panel', domain: 'wallpanel.my', trade: 'retail' },
  { name: 'Catering Service', domain: 'cateringservice.my', trade: 'food' },
  { name: 'Electrician 24 Hour', domain: 'electrician24hour.my', trade: 'home' },
  { name: 'Sleep Test', domain: 'sleeptest.my', trade: 'health' },
  { name: 'Kerusi Meja', domain: 'kerusimeja.my', trade: 'retail' },
  { name: 'Cat Boarding', domain: 'catboarding.my', trade: 'home' },
  { name: 'Plumbing Services', domain: 'plumbingservices.my', trade: 'home' },
  { name: 'Lori Kren', domain: 'lorikren.com.my', trade: 'rental' },
  { name: 'Concrete Mixer', domain: 'concretemixer.my', trade: 'rental' },
  { name: 'Ibnu Sina Care', domain: 'ibnusinacare.com.my', trade: 'health' },
  { name: 'Sewa Van Johor', domain: 'sewavanjohor.my', trade: 'rental' },
  { name: 'Oxygen Tank', domain: 'oxygentank.my', trade: 'rental' },
  { name: 'Air Compressor', domain: 'air-compressor.my', trade: 'rental' },
  { name: 'Cold Room Rental', domain: 'coldroomrental.my', trade: 'rental' },
  { name: 'Motor Sewa', domain: 'motorsewa.com.my', trade: 'rental' },
];

// Page skeletons drawn in the portfolio cards: [colSpan, rowSpan, kind].
// kind 'h' = hero block, 'a' = accent block, '' = plain.
export const WIREFRAMES = [
  [[6, 1, ''], [6, 3, 'h'], [2, 2, ''], [2, 2, 'a'], [2, 2, ''], [6, 1, '']],
  [[6, 1, ''], [3, 3, 'h'], [3, 3, 'a'], [3, 2, ''], [3, 2, ''], [6, 1, '']],
  [[6, 1, ''], [4, 3, 'h'], [2, 3, 'a'], [2, 2, ''], [2, 2, ''], [2, 2, ''], [6, 1, '']],
  [[6, 1, ''], [6, 2, 'h'], [3, 2, 'a'], [3, 2, ''], [2, 2, ''], [4, 2, ''], [6, 1, '']],
];

export const TRADES = [
  {
    id: 'rental',
    url: 'sewaanda.my',
    label: { en: 'Rental & Equipment', ms: 'Sewaan & Peralatan', zh: '租赁与设备' },
    brand: { en: 'Sewa Van Johor', ms: 'Sewa Van Johor', zh: 'Sewa Van Johor' },
    title: {
      en: 'Van, Lorry & Equipment Rental',
      ms: 'Sewa Van, Lori & Peralatan',
      zh: '货车、罗里与设备租赁',
    },
    lede: {
      en: 'Daily and monthly rates across Johor. Book by WhatsApp and collect the same day.',
      ms: 'Kadar harian & bulanan seluruh Johor. Tempah melalui WhatsApp, ambil hari yang sama.',
      zh: '柔佛全州日租与月租。WhatsApp 预订，当天取车。',
    },
  },
  {
    id: 'home',
    url: 'servisanda.my',
    label: { en: 'Home Services', ms: 'Servis Rumah', zh: '家居服务' },
    brand: { en: 'Cat Rumah', ms: 'Cat Rumah', zh: 'Cat Rumah' },
    title: {
      en: 'Painting, Plumbing & Wiring',
      ms: 'Cat, Paip & Pendawaian',
      zh: '油漆、水管与电线',
    },
    lede: {
      en: 'Licensed workers, fixed quotes, and jobs finished on the day we promise.',
      ms: 'Pekerja berlesen, sebut harga tetap, kerja siap pada tarikh dijanjikan.',
      zh: '持证工人、固定报价、按约定日期完工。',
    },
  },
  {
    id: 'retail',
    url: 'kedaianda.my',
    label: { en: 'Retail & Shops', ms: 'Kedai & Retail', zh: '零售与店铺' },
    brand: { en: 'Kerusi Meja', ms: 'Kerusi Meja', zh: 'Kerusi Meja' },
    title: { en: 'Quality Chairs & Tables', ms: 'Kerusi & Meja Berkualiti', zh: '优质桌椅' },
    lede: {
      en: 'Browse the full catalog, check stock, and order straight through WhatsApp.',
      ms: 'Lihat katalog penuh, semak stok, dan pesan terus melalui WhatsApp.',
      zh: '浏览完整目录、查看库存，直接通过 WhatsApp 下单。',
    },
  },
  {
    id: 'food',
    url: 'kateringanda.my',
    label: { en: 'Food & Catering', ms: 'Makanan & Katering', zh: '餐饮与宴会' },
    brand: { en: 'Catering Service', ms: 'Catering Service', zh: 'Catering Service' },
    title: {
      en: 'Catering for Events & Offices',
      ms: 'Katering Majlis & Korporat',
      zh: '活动与企业餐饮',
    },
    lede: {
      en: 'Set menus from 50 to 1,000 pax. Send your date and we will hold the slot.',
      ms: 'Menu set dari 50 hingga 1,000 orang. Hantar tarikh anda, kami simpan slot.',
      zh: '50 至 1,000 人套餐。告知日期，我们为您保留档期。',
    },
  },
  {
    id: 'health',
    url: 'klinikanda.my',
    label: { en: 'Health & Care', ms: 'Kesihatan & Penjagaan', zh: '健康与护理' },
    brand: { en: 'Ibnu Sina Care', ms: 'Ibnu Sina Care', zh: 'Ibnu Sina Care' },
    title: {
      en: 'Home Healthcare & Equipment',
      ms: 'Penjagaan Kesihatan Di Rumah',
      zh: '居家护理与器材',
    },
    lede: {
      en: 'Trained carers and medical equipment delivered to your door.',
      ms: 'Penjaga terlatih & peralatan perubatan dihantar ke rumah anda.',
      zh: '专业护理人员与医疗器材送货到府。',
    },
  },
];

// `tier` is the package index that first carries the feature, taken from the
// pricing sheet. The recommendation is the highest tier the visitor's picks need.
export const FEATURES = [
  { id: 'catalog', tier: 0, label: { en: 'Product catalog', ms: 'Katalog produk', zh: '产品目录' } },
  { id: 'whatsapp', tier: 0, label: { en: 'WhatsApp ordering', ms: 'Pesanan WhatsApp', zh: 'WhatsApp 下单' } },
  { id: 'maps', tier: 0, label: { en: 'Google Maps', ms: 'Google Maps', zh: '谷歌地图' } },
  { id: 'multi', tier: 1, label: { en: 'Multi-section pages', ms: 'Halaman berbilang seksyen', zh: '多版块页面' } },
  { id: 'social', tier: 1, label: { en: 'Social media links', ms: 'Pautan media sosial', zh: '社交媒体链接' } },
  { id: 'booking', tier: 2, label: { en: 'Booking / order form', ms: 'Borang tempahan', zh: '预订/订单表单' } },
  { id: 'gallery', tier: 2, label: { en: 'Photo gallery', ms: 'Galeri gambar', zh: '照片相册' } },
  { id: 'ads', tier: 2, label: { en: 'Analytics & Google Ads', ms: 'Analitik & Google Ads', zh: '分析与谷歌广告' } },
];

export const DEFAULT_FEATURES = {
  catalog: true,
  whatsapp: true,
  maps: true,
  multi: true,
  social: true,
  booking: false,
  gallery: false,
  ads: false,
};

// `split` is [plan, build, launch] in working days; they sum to `days`.
export const PACKAGES = [
  {
    name: 'Basic',
    price: 'RM 699',
    days: 5,
    split: [1, 3, 1],
    sub: {
      en: 'Perfect for small stalls & new businesses.',
      ms: 'Sesuai untuk gerai kecil & bisnes baharu.',
      zh: '适合小档口与新创业者。',
    },
    revisions: { en: '2 minor revisions', ms: '2 pindaan kecil', zh: '2 次小修改' },
    timeline: { en: '3–5 working days', ms: '3–5 hari bekerja', zh: '3–5 个工作日' },
  },
  {
    name: 'Standard',
    price: 'RM 999',
    days: 7,
    split: [1, 5, 1],
    sub: {
      en: 'For growing businesses that want a professional presence.',
      ms: 'Untuk bisnes membesar yang mahu kehadiran profesional.',
      zh: '适合追求专业形象的成长型企业。',
    },
    revisions: { en: '5 revisions', ms: '5 pindaan', zh: '5 次修改' },
    timeline: { en: '5–7 working days', ms: '5–7 hari bekerja', zh: '5–7 个工作日' },
  },
  {
    name: 'Premium',
    price: 'RM 1,499',
    days: 14,
    split: [2, 10, 2],
    sub: {
      en: 'For businesses that want advanced features & branding.',
      ms: 'Untuk bisnes yang mahu ciri lanjutan & penjenamaan.',
      zh: '适合需要进阶功能与品牌塑造的企业。',
    },
    revisions: { en: 'Unlimited revisions', ms: 'Pindaan tanpa had', zh: '无限次修改' },
    timeline: { en: '7–14 working days', ms: '7–14 hari bekerja', zh: '7–14 个工作日' },
  },
];

// Comparison rows. `true` renders as "Included", `null` as a dash.
export const MATRIX = [
  {
    label: { en: 'Pages', ms: 'Halaman', zh: '页面' },
    cells: [
      { en: '1-page responsive', ms: '1 halaman responsif', zh: '单页响应式' },
      { en: 'Multi-section', ms: 'Berbilang seksyen', zh: '多版块' },
      { en: 'Premium custom design', ms: 'Reka bentuk khas premium', zh: '高级定制设计' },
    ],
  },
  {
    label: { en: 'Product catalog', ms: 'Katalog produk', zh: '产品目录' },
    cells: [true, true, { en: 'Full management', ms: 'Pengurusan penuh', zh: '完整管理' }],
  },
  {
    label: { en: 'WhatsApp', ms: 'WhatsApp', zh: 'WhatsApp' },
    cells: [
      { en: 'Integration', ms: 'Integrasi', zh: '集成' },
      { en: 'Marketing integration', ms: 'Integrasi pemasaran', zh: '营销集成' },
      { en: 'Marketing setup', ms: 'Persediaan pemasaran', zh: '营销配置' },
    ],
  },
  { label: { en: 'Google Maps', ms: 'Google Maps', zh: '谷歌地图' }, cells: [true, true, true] },
  {
    label: { en: 'SEO', ms: 'SEO', zh: 'SEO' },
    cells: [
      { en: 'Basic setup', ms: 'Persediaan asas', zh: '基础设置' },
      { en: 'Optimization', ms: 'Pengoptimuman', zh: '优化' },
      { en: 'Full optimization', ms: 'Pengoptimuman penuh', zh: '全面优化' },
    ],
  },
  {
    label: { en: 'Google Business Profile', ms: 'Profil Google Business', zh: '谷歌商家资料' },
    cells: [true, true, { en: 'Optimized', ms: 'Dioptimumkan', zh: '已优化' }],
  },
  { label: { en: 'Contact form', ms: 'Borang hubungi', zh: '联系表单' }, cells: [null, true, true] },
  { label: { en: 'Social media links', ms: 'Pautan media sosial', zh: '社交媒体链接' }, cells: [null, true, true] },
  { label: { en: 'Booking / order form', ms: 'Borang tempahan', zh: '预订/订单表单' }, cells: [null, null, true] },
  { label: { en: 'Gallery section', ms: 'Seksyen galeri', zh: '相册版块' }, cells: [null, null, true] },
  { label: { en: 'Analytics & Google Ads', ms: 'Analitik & Google Ads', zh: '分析与谷歌广告' }, cells: [null, null, true] },
  { label: { en: 'Speed optimization', ms: 'Pengoptimuman kelajuan', zh: '速度优化' }, cells: [null, null, true] },
  { label: { en: 'Hosting & domain setup', ms: 'Persediaan hosting & domain', zh: '主机与域名设置' }, cells: [true, true, true] },
  {
    label: { en: 'Revisions', ms: 'Pindaan', zh: '修改次数' },
    cells: [
      { en: '2 minor revisions', ms: '2 pindaan kecil', zh: '2 次小修改' },
      { en: '5 revisions', ms: '5 pindaan', zh: '5 次修改' },
      { en: 'Unlimited revisions', ms: 'Pindaan tanpa had', zh: '无限次修改' },
    ],
  },
  {
    label: { en: 'Timeline', ms: 'Tempoh', zh: '周期' },
    cells: [
      { en: '3–5 working days', ms: '3–5 hari bekerja', zh: '3–5 个工作日' },
      { en: '5–7 working days', ms: '5–7 hari bekerja', zh: '5–7 个工作日' },
      { en: '7–14 working days', ms: '7–14 hari bekerja', zh: '7–14 个工作日' },
    ],
  },
  {
    label: { en: 'Bonus', ms: 'Bonus', zh: '赠送' },
    cells: [
      null,
      { en: 'Banner/poster design · faster support', ms: 'Reka banner/poster · sokongan lebih pantas', zh: '横幅/海报设计 · 更快支持' },
      { en: 'Promo posters · priority support', ms: 'Poster promosi · sokongan keutamaan', zh: '宣传海报 · 优先支持' },
    ],
  },
];

export const ADDONS = [
  { label: 'Domain (.com / .com.my)', price: 'RM 60–120/year' },
  { label: 'Monthly website management', price: 'RM 80–150/month' },
  { label: 'Extra product upload', price: 'RM 30 / 10 items' },
  { label: 'Extra revision', price: 'RM 50' },
  { label: 'Additional page', price: 'RM 100/page' },
  { label: 'Logo design', price: 'RM 100–300' },
];

export const REVIEWS = [
  { name: 'Hafiz', role: 'Logistics', quoteKey: 'q1' },
  { name: 'Nurul', role: 'Catering', quoteKey: 'q2' },
  { name: 'Lim', role: 'Retail SME', quoteKey: 'q3' },
  { name: 'Jason', role: 'Rental', quoteKey: 'q4' },
  { name: 'Kumar', role: 'Services', quoteKey: 'q5' },
  { name: 'Zul', role: 'Workshop', quoteKey: 'q6' },
];

export const LANGS = [
  ['en', 'EN'],
  ['ms', 'MS'],
  ['zh', '中文'],
];

/** Pick the current language out of a {en,ms,zh} bundle, falling back to English. */
export function pick(bundle, lang) {
  if (!bundle) return '';
  return bundle[lang] || bundle.en || '';
}

/** The highest package tier the chosen features require. */
export function tierFor(feats) {
  return FEATURES.reduce((top, f) => (feats[f.id] && f.tier > top ? f.tier : top), 0);
}
