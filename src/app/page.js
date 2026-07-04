import Image from 'next/image';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { FaWhatsapp } from 'react-icons/fa';
import './landing.css';
import {
  MdArrowForward,
  MdCheckCircle,
  MdClose,
  MdDevices,
  MdStorefront,
  MdExtension,
  MdBolt,
  MdHub,
  MdAutoAwesome,
  MdSavings,
  MdFormatQuote,
} from 'react-icons/md';

// Landing page uses Inter (the admin dashboard keeps Google Sans).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata = {
  title: 'Juruweb Studio — Affordable Websites for Malaysian SMEs',
  description:
    'Juruweb Studio builds fast, affordable, mobile-friendly websites for Malaysian SMEs — with WhatsApp integration, product catalogs, and booking, from RM699.',
};

// Main call-to-action link (Linktree hub).
const CTA_LINK = process.env.NEXT_PUBLIC_CTA_URL || 'https://linktr.ee/juruweb';

// Background images (business related), shown under an overlay.
const IMG_CODE = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=60';
const IMG_TEAM = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=60';

// Live site screenshot thumbnail (WordPress mShots — free, no key).
const shot = (domain) =>
  `https://s.wordpress.com/mshots/v1/${encodeURIComponent('https://' + domain)}?w=640&h=420`;

const solutions = [
  {
    icon: <MdDevices />,
    title: 'Business Websites',
    desc: 'Fast, responsive websites that make Malaysian SMEs look professional online.',
    items: ['1-page & multi-section sites', 'WhatsApp integration', 'Mobile-first responsive design', 'Custom brand design'],
  },
  {
    icon: <MdStorefront />,
    title: 'Catalog & Booking',
    desc: 'Showcase your products and take bookings directly from your website.',
    items: ['Full product catalog', 'Online booking system', 'Content & catalog uploads'],
  },
  {
    icon: <MdExtension />,
    title: 'Add-On Services',
    desc: 'Extend and maintain your site as your business grows.',
    items: ['Domain registration', 'Monthly website management', 'Brand logo design', 'Extra revisions & landing pages'],
  },
];

// Website packages (from the Juruweb pricing sheet).
const packages = [
  {
    name: 'Basic',
    price: 'RM 699',
    tagline: 'Perfect for getting online fast.',
    included: ['1-page responsive website', 'WhatsApp integration', 'Mobile-friendly design', 'Delivery in 3-5 days'],
    notIncluded: ['Multiple pages / sections', 'Product catalog', 'Booking system'],
    featured: false,
  },
  {
    name: 'Standard',
    price: 'RM 999',
    tagline: 'Our most popular package for growing SMEs.',
    included: ['Multi-section professional website', '5 revisions included', 'WhatsApp integration', 'Delivery in 5-7 days'],
    notIncluded: ['Product catalog & booking', 'Unlimited revisions'],
    featured: true,
  },
  {
    name: 'Premium',
    price: 'RM 1,499',
    tagline: 'Full-featured store and booking site.',
    included: ['Premium custom design', 'Full product catalog & booking', 'Unlimited revisions', 'Delivery in 7-14 days'],
    notIncluded: ['Mobile app development', 'Monthly digital marketing'],
    featured: false,
  },
];

const addons = [
  { label: 'Domain Registration (.com / .com.my)', price: 'RM 100' },
  { label: 'Monthly Website Management', price: 'RM 120/mo' },
  { label: 'Extra Catalog Uploads (per 10 items)', price: 'RM 30' },
  { label: 'Additional Revision (per request)', price: 'RM 50' },
  { label: 'Additional Landing Page (per page)', price: 'RM 100' },
  { label: 'Brand Logo Design', price: 'RM 200' },
];

// Featured client sites (with a name).
const portfolioFeatured = [
  { title: 'Business Cat Rumah', domain: 'catrumah.com.my' },
  { title: 'Servis Pemasangan Wall Panel', domain: 'wallpanel.my' },
  { title: 'Servis Katering Makanan', domain: 'cateringservice.my' },
];

// More live client sites (thumbnail only, clickable).
const portfolioMore = [
  'electrician24hour.my',
  'sleeptest.my',
  'kerusimeja.my',
  'catboarding.my',
  'plumbingservices.my',
  'lorikren.com.my',
  'concretemixer.my',
  'ibnusinacare.com.my',
  'sewavanjohor.my',
  'oxygentank.my',
  'air-compressor.my',
  'cat-rumah.my',
  'coldroomrental.my',
  'motorsewa.com.my',
  'rollershutterdoors.my',
  'servisaircondrumah.my',
  'tablechairrentals.my',
];

const benefits = [
  { icon: <MdHub />, title: 'All-In-One Hub', desc: 'No need to hire separate devs and marketers. We handle everything.' },
  { icon: <MdAutoAwesome />, title: 'Custom-Built', desc: 'Real code and strategic design, not just bought templates.' },
  { icon: <MdBolt />, title: 'Fast Turnaround', desc: 'We respect your timeline and launch on schedule.' },
  { icon: <MdSavings />, title: 'Affordable For SMEs', desc: 'Premium corporate-level quality priced for local businesses.' },
];

const processSteps = [
  { step: '01', title: 'Discussion', desc: 'We learn your goals, challenges, and vision.' },
  { step: '02', title: 'Planning', desc: 'We scope the work and map a clear timeline.' },
  { step: '03', title: 'Design & Dev', desc: 'We craft and build with real code and strategy.' },
  { step: '04', title: 'Launch & Support', desc: 'We ship on schedule and keep you growing.' },
];

const testimonials = [
  { name: 'Hafiz', role: 'Logistics Manager', quote: 'Juruweb built our delivery tracking system perfectly. They understood exactly what we needed and delivered ahead of time.' },
  { name: 'Sarah', role: 'Boutique Owner', quote: 'We used to get zero leads from our website. After Juruweb redesigned it, enquiries started coming in every week.' },
  { name: 'Lim', role: 'Retail SME', quote: 'Very fast, very responsive, and no hidden charges. It is hard to find an honest team like this.' },
  { name: 'Aisyah', role: 'Startup Founder', quote: 'We needed a site launched within a tight deadline — Juruweb made it happen without any stress.' },
  { name: 'David', role: 'F&B Chain Owner', quote: 'Since letting Juruweb handle our website and branding, our foot traffic has grown noticeably.' },
  { name: 'Wei Jie', role: 'Real Estate Agency', quote: 'The lead-generation landing pages they built for our property listings convert far better than before.' },
];

const stats = [
  { value: '20+', label: 'Websites Delivered' },
  { value: '3-14', label: 'Days to Launch' },
  { value: '100%', label: 'SME Focused' },
];

export default function LandingPage() {
  return (
    <div className={`lp ${inter.variable}`}>
      {/* Nav */}
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link href="/" className="lp-brand">
            <Image src="/dark-bg-logo.png" alt="Juruweb Studio" width={150} height={44} style={{ objectFit: 'contain' }} priority />
          </Link>
          <nav className="lp-nav-links">
            <a href="#solutions">Services</a>
            <a href="#work">Portfolio</a>
            <a href="#pricing">Pricing</a>
            <a href="#why">Why Us</a>
          </nav>
          <a href={CTA_LINK} className="btn btn-whatsapp lp-nav-cta" target="_blank" rel="noopener noreferrer">
            <FaWhatsapp />
            <span>Let&apos;s Talk</span>
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-container">
          <span className="lp-eyebrow">Websites for Malaysian SMEs</span>
          <h1 className="lp-hero-title">Professional Websites That Grow Your Business</h1>
          <p className="lp-hero-sub">
            Juruweb Studio builds fast, affordable, mobile-friendly websites for Malaysian
            SMEs — with WhatsApp integration, product catalogs, and booking, from RM699.
          </p>
          <div className="lp-hero-actions">
            <a href={CTA_LINK} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
              <FaWhatsapp />
              <span>Get Your Website</span>
            </a>
            <a href="#pricing" className="btn lp-btn-light">
              <span>View Packages</span>
              <MdArrowForward />
            </a>
          </div>

          <div className="lp-stats">
            {stats.map((s) => (
              <div key={s.label} className="lp-stat">
                <span className="lp-stat-value">{s.value}</span>
                <span className="lp-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section id="solutions" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-section-title">What We Build For You</h2>
            <p className="lp-section-tagline">Everything your business needs to look great and sell online.</p>
          </div>
          <div className="lp-grid-3">
            {solutions.map((s) => (
              <div key={s.title} className="lp-card">
                <span className="lp-card-icon">{s.icon}</span>
                <h3 className="lp-card-title">{s.title}</h3>
                <p className="lp-card-desc">{s.desc}</p>
                <ul className="lp-list">
                  {s.items.map((it) => (
                    <li key={it}><MdCheckCircle /> <span>{it}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section id="work" className="lp-section lp-section--tint">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-section-title">Recent Work</h2>
            <p className="lp-section-tagline">Live websites we&apos;ve built for Malaysian businesses.</p>
          </div>

          <div className="lp-work-grid">
            {portfolioFeatured.map((p) => (
              <a key={p.domain} href={`https://${p.domain}`} target="_blank" rel="noopener noreferrer" className="lp-work">
                <div className="lp-work-shot">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot(p.domain)} alt={p.title} loading="lazy" />
                </div>
                <div className="lp-work-body">
                  <h3 className="lp-work-title">{p.title}</h3>
                  <span className="lp-work-link">Visit site <MdArrowForward /></span>
                </div>
              </a>
            ))}
          </div>

          <h3 className="lp-work-more-title">More websites we&apos;ve launched</h3>
          <div className="lp-work-more-grid">
            {portfolioMore.map((d) => (
              <a key={d} href={`https://${d}`} target="_blank" rel="noopener noreferrer" className="lp-work-thumb" aria-label={`Visit ${d}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot(d)} alt="" loading="lazy" />
                <span className="lp-work-thumb-overlay"><MdArrowForward /></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-section-title">Simple, Transparent Packages</h2>
            <p className="lp-section-tagline">Premium quality websites, priced for SME budgets. No hidden charges.</p>
          </div>
          <div className="lp-grid-3">
            {packages.map((p) => (
              <div key={p.name} className={`lp-price-card ${p.featured ? 'lp-price-card--featured' : ''}`}>
                {p.featured && <span className="lp-badge-value">Most Popular</span>}
                <h3 className="lp-card-title">{p.name}</h3>
                <div className="lp-price-amount">{p.price}</div>
                <p className="lp-price-tagline">{p.tagline}</p>
                <ul className="lp-list">
                  {p.included.map((f) => (
                    <li key={f}><MdCheckCircle /> <span>{f}</span></li>
                  ))}
                  {p.notIncluded.map((f) => (
                    <li key={f} className="lp-list-no"><MdClose /> <span>{f}</span></li>
                  ))}
                </ul>
                <a href={CTA_LINK} className="btn btn-whatsapp" style={{ width: '100%', marginTop: '1.5rem' }} target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp />
                  <span>Choose {p.name}</span>
                </a>
              </div>
            ))}
          </div>

          {/* Add-ons */}
          <div className="lp-addons">
            <h3 className="lp-addons-title">Optional Add-Ons</h3>
            <div className="lp-addons-grid">
              {addons.map((a) => (
                <div key={a.label} className="lp-addon">
                  <span>{a.label}</span>
                  <strong>{a.price}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why us (background image + overlay) */}
      <section
        id="why"
        className="lp-section lp-section--image"
        style={{ backgroundImage: `linear-gradient(rgba(246,246,249,0.93), rgba(246,246,249,0.96)), url(${IMG_TEAM})` }}
      >
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-section-title">Your Trusted Local Partner</h2>
          </div>
          <div className="lp-grid-4">
            {benefits.map((b) => (
              <div key={b.title} className="lp-benefit">
                <span className="lp-benefit-icon">{b.icon}</span>
                <h3 className="lp-benefit-title">{b.title}</h3>
                <p className="lp-card-desc">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="lp-section lp-section--tint">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-section-title">Our Process</h2>
          </div>
          <div className="lp-grid-4">
            {processSteps.map((p) => (
              <div key={p.step} className="lp-step">
                <span className="lp-step-num">{p.step}</span>
                <h3 className="lp-benefit-title">{p.title}</h3>
                <p className="lp-card-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-section-title">What Local Businesses Say</h2>
          </div>
          <div className="lp-grid-3">
            {testimonials.map((t) => (
              <div key={t.name} className="lp-quote">
                <MdFormatQuote className="lp-quote-mark" />
                <p className="lp-quote-text">{t.quote}</p>
                <div className="lp-quote-author">
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA (background image + dark overlay) */}
      <section className="lp-cta">
        <div
          className="lp-container lp-cta-inner"
          style={{ backgroundImage: `linear-gradient(rgba(24,16,24,0.86), rgba(24,24,27,0.92)), url(${IMG_CODE})` }}
        >
          <h2 className="lp-cta-title">Ready to Upgrade Your Business?</h2>
          <p className="lp-cta-body">Don&apos;t let your competitors get ahead. Let&apos;s build something great together.</p>
          <a href={CTA_LINK} className="btn btn-whatsapp lp-cta-btn" target="_blank" rel="noopener noreferrer">
            <FaWhatsapp />
            <span>Talk to Us on WhatsApp</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <Image src="/dark-bg-logo.png" alt="Juruweb Studio" width={140} height={40} style={{ objectFit: 'contain' }} />
          <p className="lp-footer-copy">© 2026 Juruweb Studio. Affordable websites for Malaysian SMEs.</p>
          <div className="lp-footer-links">
            <a href="#solutions">Services</a>
            <a href="#pricing">Pricing</a>
            <a href={CTA_LINK} target="_blank" rel="noopener noreferrer">Contact</a>
            <Link href="/login">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
