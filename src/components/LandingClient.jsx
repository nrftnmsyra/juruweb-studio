'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { FaWhatsapp } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import {
  MdArrowForward,
  MdCheckCircle,
  MdAutorenew,
  MdAccessTime,
  MdCardGiftcard,
  MdDevices,
  MdStorefront,
  MdRocketLaunch,
  MdHub,
  MdBolt,
  MdSavings,
  MdVerified,
  MdFormatQuote,
  MdStar,
} from 'react-icons/md';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

const CTA_LINK = process.env.NEXT_PUBLIC_CTA_URL || 'https://linktr.ee/juruweb';
const shot = (d) => `https://s.wordpress.com/mshots/v1/${encodeURIComponent('https://' + d)}?w=640&h=420`;

// Background images (shown under a dark overlay).
const IMG_WORKSPACE = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=60';
const IMG_HERO = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=60';

// ---- Localised copy (EN / MS / ZH) ----
const T = {
  en: {
    nav: { services: 'Services', work: 'Portfolio', pricing: 'Pricing', reviews: 'Reviews', cta: "Let's Talk" },
    hero: {
      eyebrow: 'AI-era websites for Malaysian SMEs',
      title: 'Websites that make your business look world-class',
      sub: 'Juruweb Studio builds fast, affordable, mobile-first websites — with WhatsApp, catalog, SEO and booking, from RM699.',
      primary: 'Get Your Website',
      secondary: 'View Packages',
    },
    stats: [['20+', 'Websites Launched'], ['3-14', 'Days to Launch'], ['100%', 'SME Focused']],
    offer: { label: 'Limited launch offer ends in', cta: 'Claim Your Slot' },
    solutions: {
      title: 'What we build',
      tagline: 'Clean, modern websites designed to win customers.',
      items: [
        { icon: <MdDevices />, title: 'Business Websites', desc: 'Fast, responsive sites with a professional, modern design.' },
        { icon: <MdStorefront />, title: 'Catalog & Booking', desc: 'Product catalogs, booking and enquiry forms built in.' },
        { icon: <MdRocketLaunch />, title: 'Growth Ready', desc: 'SEO, WhatsApp, Google Business and analytics from day one.' },
      ],
    },
    work: { title: 'Recent work', tagline: 'Live websites we’ve built for Malaysian businesses.', visit: 'Visit site' },
    pricing: {
      title: 'Simple, transparent packages',
      tagline: 'Website & Digital Marketing packages, priced for SME budgets.',
      popular: 'Most Popular',
      revisions: 'Revisions',
      timeline: 'Timeline',
      bonus: 'Bonus',
      choose: 'Choose',
      addonsTitle: 'Additional services',
      terms: 'Payment: 50% deposit to start, 50% on completion before launch. Bank Transfer / DuitNow / TNG eWallet.',
    },
    why: {
      title: 'Your trusted local partner',
      tagline: 'Premium quality, built and supported by real people.',
      items: [
        { icon: <MdHub />, title: 'All-In-One', desc: 'Design, build, SEO and support — handled in one place.' },
        { icon: <MdVerified />, title: 'Custom-Built', desc: 'Real code and strategy, never a bought template.' },
        { icon: <MdBolt />, title: 'Fast Turnaround', desc: 'Launched on schedule, in as little as 3 days.' },
        { icon: <MdSavings />, title: 'SME Pricing', desc: 'Corporate-level quality at local business prices.' },
      ],
    },
    process: {
      title: 'How it works',
      steps: [
        { title: 'Discuss & Plan', desc: 'We learn your business and map out the website.' },
        { title: 'Design & Build', desc: 'We design and develop your site with real code.' },
        { title: 'Launch & Support', desc: 'We launch on schedule and keep it running smoothly.' },
      ],
    },
    reviews: { title: 'Loved by local businesses' },
    finalCta: {
      title: 'Ready to grow your business?',
      body: 'Let’s build a website that works as hard as you do.',
      button: 'Talk to Us on WhatsApp',
    },
    footer: { copy: '© 2026 Juruweb Studio. Affordable websites for Malaysian SMEs.', admin: 'Admin', contact: 'Contact' },
  },
  ms: {
    nav: { services: 'Servis', work: 'Portfolio', pricing: 'Harga', reviews: 'Ulasan', cta: 'Hubungi Kami' },
    hero: {
      eyebrow: 'Laman web era AI untuk PKS Malaysia',
      title: 'Laman web yang buat bisnes anda nampak bertaraf dunia',
      sub: 'Juruweb Studio bina laman web pantas, mampu milik & mesra mudah alih — dengan WhatsApp, katalog, SEO & tempahan, bermula RM699.',
      primary: 'Dapatkan Laman Web',
      secondary: 'Lihat Pakej',
    },
    stats: [['20+', 'Laman Web Siap'], ['3-14', 'Hari Siap'], ['100%', 'Fokus PKS']],
    offer: { label: 'Tawaran pelancaran tamat dalam', cta: 'Tempah Slot Anda' },
    solutions: {
      title: 'Apa yang kami bina',
      tagline: 'Laman web moden & kemas yang menarik pelanggan.',
      items: [
        { icon: <MdDevices />, title: 'Laman Web Bisnes', desc: 'Laman pantas & responsif dengan reka bentuk profesional.' },
        { icon: <MdStorefront />, title: 'Katalog & Tempahan', desc: 'Katalog produk, tempahan dan borang pertanyaan disediakan.' },
        { icon: <MdRocketLaunch />, title: 'Sedia Berkembang', desc: 'SEO, WhatsApp, Google Business & analitik dari hari pertama.' },
      ],
    },
    work: { title: 'Kerja terkini', tagline: 'Laman web sebenar yang kami bina untuk bisnes Malaysia.', visit: 'Lawati laman' },
    pricing: {
      title: 'Pakej mudah & telus',
      tagline: 'Pakej Laman Web & Pemasaran Digital, sesuai untuk bajet PKS.',
      popular: 'Paling Popular',
      revisions: 'Pindaan',
      timeline: 'Tempoh',
      bonus: 'Bonus',
      choose: 'Pilih',
      addonsTitle: 'Servis tambahan',
      terms: 'Bayaran: 50% deposit untuk mula, 50% baki sebelum dilancarkan. Bank Transfer / DuitNow / TNG eWallet.',
    },
    why: {
      title: 'Rakan tempatan yang dipercayai',
      tagline: 'Kualiti premium, dibina & disokong oleh orang sebenar.',
      items: [
        { icon: <MdHub />, title: 'Semua Dalam Satu', desc: 'Reka bentuk, bina, SEO & sokongan — di satu tempat.' },
        { icon: <MdVerified />, title: 'Dibina Khas', desc: 'Kod & strategi sebenar, bukan templat beli siap.' },
        { icon: <MdBolt />, title: 'Siap Pantas', desc: 'Dilancarkan ikut jadual, seawal 3 hari.' },
        { icon: <MdSavings />, title: 'Harga PKS', desc: 'Kualiti korporat pada harga bisnes tempatan.' },
      ],
    },
    process: {
      title: 'Cara ia berfungsi',
      steps: [
        { title: 'Bincang & Rancang', desc: 'Kami fahami bisnes anda & rangka laman web.' },
        { title: 'Reka & Bina', desc: 'Kami reka & bangunkan laman anda dengan kod sebenar.' },
        { title: 'Lancar & Sokong', desc: 'Kami lancarkan ikut jadual & pastikan ia lancar.' },
      ],
    },
    reviews: { title: 'Disukai oleh bisnes tempatan' },
    finalCta: {
      title: 'Sedia untuk kembangkan bisnes anda?',
      body: 'Mari bina laman web yang bekerja sekuat anda.',
      button: 'Hubungi Kami di WhatsApp',
    },
    footer: { copy: '© 2026 Juruweb Studio. Laman web mampu milik untuk PKS Malaysia.', admin: 'Admin', contact: 'Hubungi' },
  },
  zh: {
    nav: { services: '服务', work: '作品', pricing: '配套', reviews: '评价', cta: '联系我们' },
    hero: {
      eyebrow: '为马来西亚中小企业打造 AI 时代网站',
      title: '让您的生意看起来世界级的网站',
      sub: 'Juruweb Studio 打造快速、实惠、移动优先的网站 — 集成 WhatsApp、产品目录、SEO 与预订，RM699 起。',
      primary: '获取您的网站',
      secondary: '查看配套',
    },
    stats: [['20+', '已上线网站'], ['3-14', '天上线'], ['100%', '专注中小企业']],
    offer: { label: '限时优惠倒计时', cta: '立即预订名额' },
    solutions: {
      title: '我们打造什么',
      tagline: '简洁现代的网站，助您赢得客户。',
      items: [
        { icon: <MdDevices />, title: '企业网站', desc: '快速响应式网站，专业现代的设计。' },
        { icon: <MdStorefront />, title: '目录与预订', desc: '内置产品目录、预订与询问表单。' },
        { icon: <MdRocketLaunch />, title: '助力增长', desc: '从第一天起集成 SEO、WhatsApp、Google 商家与分析。' },
      ],
    },
    work: { title: '近期作品', tagline: '我们为马来西亚企业打造的真实网站。', visit: '访问网站' },
    pricing: {
      title: '简单透明的配套',
      tagline: '网站与数字营销配套，为中小企业预算而设。',
      popular: '最受欢迎',
      revisions: '修改',
      timeline: '周期',
      bonus: '赠送',
      choose: '选择',
      addonsTitle: '附加服务',
      terms: '付款：50% 订金开工，完成上线前付清 50%。Bank Transfer / DuitNow / TNG eWallet。',
    },
    why: {
      title: '值得信赖的本地伙伴',
      tagline: '优质品质，由真实团队打造与支持。',
      items: [
        { icon: <MdHub />, title: '一站式', desc: '设计、开发、SEO 与支持 — 一站搞定。' },
        { icon: <MdVerified />, title: '量身定制', desc: '真实代码与策略，绝非现成模板。' },
        { icon: <MdBolt />, title: '快速交付', desc: '按时上线，最快 3 天。' },
        { icon: <MdSavings />, title: '中小企价格', desc: '企业级品质，本地生意价格。' },
      ],
    },
    process: {
      title: '流程',
      steps: [
        { title: '沟通与规划', desc: '我们了解您的业务并规划网站。' },
        { title: '设计与开发', desc: '我们用真实代码设计并开发您的网站。' },
        { title: '上线与支持', desc: '我们按时上线并保持网站顺畅运行。' },
      ],
    },
    reviews: { title: '深受本地企业喜爱' },
    finalCta: {
      title: '准备好发展您的生意了吗？',
      body: '让我们打造一个和您一样努力的网站。',
      button: '通过 WhatsApp 联系我们',
    },
    footer: { copy: '© 2026 Juruweb Studio。为马来西亚中小企业提供实惠网站。', admin: '管理', contact: '联系' },
  },
};

// Website packages — exactly from the Juruweb pricing sheet.
const packages = [
  {
    name: 'Basic', price: 'RM 699',
    taglineKey: 'basic',
    features: ['1-page responsive website', 'Product catalog', 'WhatsApp integration', 'Google Maps integration', 'Basic SEO setup', 'Mobile-friendly design', 'Google Business Profile setup', 'Free Vercel hosting setup', 'Domain connection setup'],
    revisions: '2 minor revisions',
    timeline: '3-5 working days',
    bonus: [],
    featured: false,
  },
  {
    name: 'Standard', price: 'RM 999',
    taglineKey: 'standard',
    features: ['Multi-section professional website', 'Product catalog', 'WhatsApp marketing integration', 'Google Maps integration', 'Basic SEO optimization', 'Social media links integration', 'Google Business Profile setup', 'Contact form', 'Mobile & tablet responsive', 'Free Vercel hosting setup', 'Domain connection setup'],
    revisions: '5 revisions',
    timeline: '5-7 working days',
    bonus: ['Basic banner/poster design', 'Faster support response'],
    featured: true,
  },
  {
    name: 'Premium', price: 'RM 1,499',
    taglineKey: 'premium',
    features: ['Premium custom website design', 'Full product catalog management', 'WhatsApp marketing setup', 'Google Business Profile optimization', 'SEO optimization', 'Booking/order inquiry form', 'Social media integration', 'Gallery section', 'Google Maps integration', 'Speed optimization', 'Free Vercel hosting setup', 'Domain connection setup', 'Google integration (Analytics & Ads)'],
    revisions: 'Unlimited revisions',
    timeline: '7-14 working days',
    bonus: ['Social media promotional posters', 'Priority support'],
    featured: false,
  },
];

const pkgTaglines = {
  basic: { en: 'Perfect for small stalls & new businesses.', ms: 'Sesuai untuk gerai kecil & bisnes baharu.', zh: '适合小档口与新创业者。' },
  standard: { en: 'For growing businesses that want a professional presence.', ms: 'Untuk bisnes membesar yang mahu kehadiran profesional.', zh: '适合追求专业形象的成长型企业。' },
  premium: { en: 'For businesses that want advanced features & branding.', ms: 'Untuk bisnes yang mahu ciri lanjutan & penjenamaan.', zh: '适合需要进阶功能与品牌塑造的企业。' },
};

const addons = [
  { label: 'Domain (.com / .com.my)', price: 'RM 60-120/year' },
  { label: 'Monthly website management', price: 'RM 80-150/month' },
  { label: 'Extra product upload', price: 'RM 30 / 10 items' },
  { label: 'Extra revision', price: 'RM 50' },
  { label: 'Additional page', price: 'RM 100/page' },
  { label: 'Logo design', price: 'RM 100-300' },
];

// Live client sites — 16 previews (title shown on hover).
const portfolio = [
  { title: 'Cat Rumah', domain: 'catrumah.com.my' },
  { title: 'Wall Panel', domain: 'wallpanel.my' },
  { title: 'Catering Service', domain: 'cateringservice.my' },
  { title: 'Electrician 24 Hour', domain: 'electrician24hour.my' },
  { title: 'Sleep Test', domain: 'sleeptest.my' },
  { title: 'Kerusi Meja', domain: 'kerusimeja.my' },
  { title: 'Cat Boarding', domain: 'catboarding.my' },
  { title: 'Plumbing Services', domain: 'plumbingservices.my' },
  { title: 'Lori Kren', domain: 'lorikren.com.my' },
  { title: 'Concrete Mixer', domain: 'concretemixer.my' },
  { title: 'Ibnu Sina Care', domain: 'ibnusinacare.com.my' },
  { title: 'Sewa Van Johor', domain: 'sewavanjohor.my' },
  { title: 'Oxygen Tank', domain: 'oxygentank.my' },
  { title: 'Air Compressor', domain: 'air-compressor.my' },
  { title: 'Cold Room Rental', domain: 'coldroomrental.my' },
  { title: 'Motor Sewa', domain: 'motorsewa.com.my' },
];

// Feature bullets for the "What we build" cards (technical terms kept in English).
const solutionBullets = [
  ['Responsive & mobile-first', 'Custom brand design', 'Fast, SEO-ready pages'],
  ['Product catalog', 'Booking & enquiry forms', 'WhatsApp order button'],
  ['Google Business & Maps', 'Basic SEO setup', 'Analytics & Ads ready'],
];

// Reviews split into two marquee rows.
const reviewsRow1 = [
  { name: 'Hafiz', role: 'Logistics', quote: 'Juruweb built exactly what we needed and delivered ahead of time.' },
  { name: 'Sarah', role: 'Boutique', quote: 'After the redesign, enquiries started coming in every week.' },
  { name: 'Lim', role: 'Retail SME', quote: 'Very fast, responsive, and no hidden charges. Honest team.' },
  { name: 'Aisyah', role: 'Founder', quote: 'Launched within a tight deadline without any stress.' },
  { name: 'David', role: 'F&B Chain', quote: 'Our foot traffic grew noticeably after the new site.' },
  { name: 'Wei Jie', role: 'Real Estate', quote: 'The landing pages convert far better than before.' },
];
const reviewsRow2 = [
  { name: 'Nurul', role: 'Catering', quote: 'Bookings are so much easier now. Customers love the site.' },
  { name: 'Kumar', role: 'Services', quote: 'Professional look at an SME price. Highly recommended.' },
  { name: 'Farah', role: 'Beauty', quote: 'Beautiful design and they really understood my brand.' },
  { name: 'Jason', role: 'Rental', quote: 'WhatsApp enquiries doubled after going live.' },
  { name: 'Aina', role: 'Home Biz', quote: 'Affordable, fast, and the support is fantastic.' },
  { name: 'Zul', role: 'Workshop', quote: 'Finally look professional online. Worth every ringgit.' },
];

const LANGS = [['en', 'gb', 'English'], ['ms', 'my', 'Bahasa Melayu'], ['zh', 'cn', '中文']];

export default function LandingClient() {
  const [lang, setLang] = useState('en');
  const t = T[lang];

  return (
    <div className={`lp ${inter.variable}`}>
      {/* Nav */}
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link href="/" className="lp-brand">
            <Image src="/light-bg-logo.png" alt="Juruweb Studio" width={150} height={44} style={{ objectFit: 'contain' }} priority />
          </Link>
          <nav className="lp-nav-links">
            <a href="#solutions">{t.nav.services}</a>
            <a href="#work">{t.nav.work}</a>
            <a href="#pricing">{t.nav.pricing}</a>
            <a href="#reviews">{t.nav.reviews}</a>
          </nav>
          <div className="lp-lang" role="group" aria-label="Language">
            {LANGS.map(([code, flag, label]) => (
              <button
                key={code}
                type="button"
                className={`lp-lang-btn ${lang === code ? 'active' : ''}`}
                onClick={() => setLang(code)}
                title={label}
                aria-label={label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://flagcdn.com/w40/${flag}.png`} alt="" width={24} height={24} loading="lazy" />
              </button>
            ))}
          </div>
          <a href={CTA_LINK} className="btn btn-whatsapp lp-nav-cta" target="_blank" rel="noopener noreferrer">
            <FaWhatsapp />
            <span>{t.nav.cta}</span>
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero" style={{ backgroundImage: `linear-gradient(rgba(11,11,20,0.72), rgba(11,11,20,0.9)), url(${IMG_HERO})` }}>
        <div className="lp-container lp-hero-inner">
          <h1 className="lp-hero-title">{t.hero.title}</h1>
          <p className="lp-hero-sub">{t.hero.sub}</p>
          <div className="lp-hero-actions">
            <a href={CTA_LINK} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
              <FaWhatsapp /><span>{t.hero.primary}</span>
            </a>
            <a href="#pricing" className="btn lp-btn-ghost"><span>{t.hero.secondary}</span><MdArrowForward /></a>
          </div>
          <div className="lp-stats">
            {t.stats.map(([v, l]) => (
              <div key={l} className="lp-stat"><span className="lp-stat-value"><CountUp value={v} /></span><span className="lp-stat-label">{l}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* FOMO — red urgency bar with live countdown + CTA */}
      <FomoBar offer={t.offer} />

      {/* Solutions */}
      <section id="solutions" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-section-title">{t.solutions.title}</h2>
            <p className="lp-section-tagline">{t.solutions.tagline}</p>
          </div>
          <div className="lp-grid-3">
            {t.solutions.items.map((s, i) => (
              <div key={s.title} className="lp-card lp-solution">
                <span className="lp-card-icon">{s.icon}</span>
                <h3 className="lp-card-title">{s.title}</h3>
                <p className="lp-card-desc">{s.desc}</p>
                <ul className="lp-list">
                  {solutionBullets[i].map((b) => (
                    <li key={b}><MdCheckCircle /> <span>{b}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-section-title">{t.pricing.title}</h2>
            <p className="lp-section-tagline">{t.pricing.tagline}</p>
          </div>
          <div className="lp-grid-3">
            {packages.map((p) => (
              <div key={p.name} className={`lp-price-card ${p.featured ? 'lp-price-card--featured' : ''}`}>
                {p.featured && <span className="lp-badge-value">{t.pricing.popular}</span>}
                <h3 className="lp-card-title">{p.name}</h3>
                <div className="lp-price-amount">{p.price}</div>
                <p className="lp-price-tagline">{pkgTaglines[p.taglineKey][lang]}</p>
                <ul className="lp-list">
                  {p.features.map((f) => (
                    <li key={f}><MdCheckCircle /> <span>{f}</span></li>
                  ))}
                </ul>
                <div className="lp-price-meta">
                  <div className="lp-price-meta-row"><MdAutorenew /><span>{t.pricing.revisions}: <strong>{p.revisions}</strong></span></div>
                  <div className="lp-price-meta-row"><MdAccessTime /><span>{t.pricing.timeline}: <strong>{p.timeline}</strong></span></div>
                </div>
                {p.bonus.length > 0 && (
                  <div className="lp-price-bonus">
                    <div className="lp-price-bonus-head"><MdCardGiftcard /> {t.pricing.bonus}</div>
                    {p.bonus.map((b) => <div key={b}>{b}</div>)}
                  </div>
                )}
                <a href={CTA_LINK} className="btn btn-whatsapp" style={{ width: '100%', marginTop: '1.25rem' }} target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp /><span>{t.pricing.choose} {p.name}</span>
                </a>
              </div>
            ))}
          </div>

          <div className="lp-addons">
            <h3 className="lp-addons-title">{t.pricing.addonsTitle}</h3>
            <div className="lp-addons-grid">
              {addons.map((a) => (
                <div key={a.label} className="lp-addon"><span>{a.label}</span><strong>{a.price}</strong></div>
              ))}
            </div>
            <p className="lp-terms">{t.pricing.terms}</p>
          </div>
        </div>
      </section>

      {/* Why us — split, attractive dark band */}
      <section id="why" className="lp-why">
        <div className="lp-container lp-why-grid">
          <div className="lp-why-intro">
            <h2 className="lp-section-title lp-white">{t.why.title}</h2>
            <p className="lp-section-tagline lp-white-dim">{t.why.tagline}</p>
            <a href={CTA_LINK} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
              <FaWhatsapp /><span>{t.nav.cta}</span>
            </a>
          </div>
          <div className="lp-why-list">
            {t.why.items.map((b) => (
              <div key={b.title} className="lp-why-item">
                <span className="lp-why-icon">{b.icon}</span>
                <div>
                  <h3 className="lp-why-title">{b.title}</h3>
                  <p className="lp-why-desc">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio — moved under "trusted local partner" */}
      <section id="work" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-section-title">{t.work.title}</h2>
            <p className="lp-section-tagline">{t.work.tagline}</p>
          </div>
          <div className="lp-work-grid">
            {portfolio.map((p) => (
              <a key={p.domain} href={`https://${p.domain}`} target="_blank" rel="noopener noreferrer" className="lp-work" aria-label={p.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="lp-work-img" src={shot(p.domain)} alt={p.title} loading="lazy" />
                <span className="lp-work-cap"><span>{p.title}</span></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Process — 3 steps */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-section-title">{t.process.title}</h2>
          </div>
          <div className="lp-steps">
            {t.process.steps.map((s, i) => (
              <div key={s.title} className="lp-step">
                <span className="lp-step-num">{i + 1}</span>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-card-desc">{s.desc}</p>
                {i < t.process.steps.length - 1 && <span className="lp-step-arrow"><MdArrowForward /></span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews — two auto-scrolling rows */}
      <section id="reviews" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-section-title">{t.reviews.title}</h2>
          </div>
        </div>
        <div className="lp-marquee">
          <div className="lp-marquee-track lp-marquee-left">
            {[...reviewsRow1, ...reviewsRow1].map((r, i) => <Review key={`a${i}`} r={r} />)}
          </div>
        </div>
        <div className="lp-marquee">
          <div className="lp-marquee-track lp-marquee-right">
            {[...reviewsRow2, ...reviewsRow2].map((r, i) => <Review key={`b${i}`} r={r} />)}
          </div>
        </div>
      </section>

      {/* Final CTA — full-bleed, no container box */}
      <section className="lp-cta" style={{ backgroundImage: `linear-gradient(rgba(11,11,20,0.82), rgba(11,11,20,0.9)), url(${IMG_WORKSPACE})` }}>
        <div className="lp-container lp-cta-content">
          <h2 className="lp-cta-title">{t.finalCta.title}</h2>
          <p className="lp-cta-body">{t.finalCta.body}</p>
          <a href={CTA_LINK} className="btn btn-whatsapp lp-cta-btn" target="_blank" rel="noopener noreferrer">
            <FaWhatsapp /><span>{t.finalCta.button}</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <Image src="/light-bg-logo.png" alt="Juruweb Studio" width={140} height={40} style={{ objectFit: 'contain' }} />
          <p className="lp-footer-copy">{t.footer.copy}</p>
          <div className="lp-footer-links">
            <a href="#pricing">{t.nav.pricing}</a>
            <a href={CTA_LINK} target="_blank" rel="noopener noreferrer">{t.footer.contact}</a>
            <Link href="/login">{t.footer.admin}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Review({ r }) {
  return (
    <div className="lp-review">
      <div className="lp-review-top">
        <div className="lp-review-stars">{[0, 1, 2, 3, 4].map((i) => <MdStar key={i} />)}</div>
        <FcGoogle className="lp-review-google" title="Google review" />
      </div>
      <p className="lp-review-text">{r.quote}</p>
      <div className="lp-review-author"><strong>{r.name}</strong><span>{r.role}</span></div>
    </div>
  );
}

// Count-up animation that triggers when scrolled into view.
function CountUp({ value }) {
  const m = /^(\d+)([%+]*)$/.exec(String(value));
  const ref = useRef(null);
  const [display, setDisplay] = useState(m ? `0${m[2] || ''}` : value);

  useEffect(() => {
    if (!m) { setDisplay(value); return; }
    const target = parseInt(m[1], 10);
    const suffix = m[2] || '';
    const el = ref.current;
    if (!el) return;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      const dur = 1400;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(`${Math.round(target * eased)}${suffix}`);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(); io.disconnect(); } });
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return <span ref={ref}>{display}</span>;
}

// Red urgency bar with a live countdown to the end of the day + CTA.
function FomoBar({ offer }) {
  const [tl, setTl] = useState(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      let d = Math.max(0, Math.floor((end - now) / 1000));
      const h = Math.floor(d / 3600); d %= 3600;
      const m = Math.floor(d / 60);
      const s = d % 60;
      setTl({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div className="lp-fomo">
      <div className="lp-container lp-fomo-inner">
        <span className="lp-fomo-label"><MdBolt /> {offer.label}</span>
        <span className="lp-fomo-timer" suppressHydrationWarning>
          {tl ? (
            <>
              <b>{pad(tl.h)}</b><i>:</i><b>{pad(tl.m)}</b><i>:</i><b>{pad(tl.s)}</b>
            </>
          ) : (<><b>00</b><i>:</i><b>00</b><i>:</i><b>00</b></>)}
        </span>
        <a href={CTA_LINK} className="lp-fomo-cta" target="_blank" rel="noopener noreferrer">{offer.cta}</a>
      </div>
    </div>
  );
}
