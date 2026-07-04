import Image from 'next/image';
import Link from 'next/link';
import './landing.css';
import {
  MdArrowForward,
  MdChat,
  MdDevices,
  MdStorefront,
  MdExtension,
  MdCheckCircle,
  MdBolt,
  MdHub,
  MdAutoAwesome,
  MdSavings,
  MdFormatQuote,
} from 'react-icons/md';

export const metadata = {
  title: 'Juruweb Studio — Affordable Websites for Malaysian SMEs',
  description:
    'Juruweb Studio builds fast, affordable, mobile-friendly websites for Malaysian SMEs — with WhatsApp integration, product catalogs, and booking, from RM699.',
};

// WhatsApp contact link. Set NEXT_PUBLIC_WHATSAPP_URL in the environment
// (e.g. https://wa.me/60123456789) to configure it without editing code.
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_URL || 'https://wa.me/60123456789';

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

// Website packages (from the Juruweb pricing sheet)
const packages = [
  {
    name: 'Basic',
    price: 'RM 699',
    tagline: 'Perfect for getting online fast.',
    features: ['1-page responsive website', 'WhatsApp integration', 'Mobile-friendly design', 'Delivery in 3-5 days'],
    featured: false,
  },
  {
    name: 'Standard',
    price: 'RM 999',
    tagline: 'Our most popular package for growing SMEs.',
    features: ['Multi-section professional website', '5 revisions included', 'WhatsApp integration', 'Delivery in 5-7 days'],
    featured: true,
  },
  {
    name: 'Premium',
    price: 'RM 1,499',
    tagline: 'Full-featured store and booking site.',
    features: ['Premium custom design', 'Full product catalog & booking', 'Unlimited revisions', 'Delivery in 7-14 days'],
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

// Live client websites built by Juruweb Studio
const portfolio = [
  { title: 'Air Compressor', category: 'Industrial Equipment', domain: 'air-compressor.my' },
  { title: 'Cat Rumah', category: 'Home Painting Services', domain: 'cat-rumah.my' },
  { title: 'Cold Room Rental', category: 'Equipment Rental', domain: 'coldroomrental.my' },
  { title: 'Motor Sewa', category: 'Motorbike Rental', domain: 'motorsewa.com.my' },
  { title: 'Roller Shutter Doors', category: 'Doors & Security', domain: 'rollershutterdoors.my' },
  { title: 'Servis Aircond Rumah', category: 'Aircond Services', domain: 'servisaircondrumah.my' },
  { title: 'Table & Chair Rentals', category: 'Event Rentals', domain: 'tablechairrentals.my' },
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
  { name: 'Aisyah', role: 'Tech Startup CEO', quote: 'We needed an MVP app launched within a tight deadline to secure funding — Juruweb made it happen.' },
  { name: 'David', role: 'F&B Chain Owner', quote: 'Since letting Juruweb handle our digital marketing and rebranding, our foot traffic has grown noticeably.' },
  { name: 'Wei Jie', role: 'Real Estate Agency', quote: 'The lead-generation landing pages they built for our property listings convert far better than before.' },
];

const stats = [
  { value: '50+', label: 'Projects Delivered' },
  { value: '14 Days', label: 'Avg. Completion' },
  { value: '3+ Years', label: 'Experience' },
];

export default function LandingPage() {
  return (
    <div className="lp">
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
          <a href={WHATSAPP} className="btn btn-primary lp-nav-cta" target="_blank" rel="noopener noreferrer">
            Let&apos;s Talk
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
            <a href={WHATSAPP} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              <span>Get Your Website</span>
              <MdArrowForward />
            </a>
            <a href="#pricing" className="btn btn-secondary">View Packages</a>
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
            {portfolio.map((p) => (
              <a
                key={p.domain}
                href={`https://${p.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-work"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="lp-work-favicon"
                  src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=64`}
                  alt=""
                  width={36}
                  height={36}
                  loading="lazy"
                />
                <h3 className="lp-work-title">{p.title}</h3>
                <span className="lp-work-cat">{p.category}</span>
                <span className="lp-work-link">{p.domain} <MdArrowForward /></span>
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
                  {p.features.map((f) => (
                    <li key={f}><MdCheckCircle /> <span>{f}</span></li>
                  ))}
                </ul>
                <a href={WHATSAPP} className={`btn ${p.featured ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', marginTop: '1.5rem' }} target="_blank" rel="noopener noreferrer">
                  Choose {p.name}
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

      {/* Why us */}
      <section id="why" className="lp-section">
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

      {/* Final CTA */}
      <section className="lp-cta">
        <div className="lp-container lp-cta-inner">
          <h2 className="lp-cta-title">Ready to Upgrade Your Business?</h2>
          <p className="lp-cta-body">Don&apos;t let your competitors get ahead. Let&apos;s build something great together.</p>
          <a href={WHATSAPP} className="btn btn-primary lp-cta-btn" target="_blank" rel="noopener noreferrer">
            <MdChat />
            <span>Contact Us on WhatsApp</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <Image src="/dark-bg-logo.png" alt="Juruweb Studio" width={140} height={40} style={{ objectFit: 'contain' }} />
          <p className="lp-footer-copy">© 2026 Juruweb Studio. Delivering premium digital solutions for SMEs.</p>
          <div className="lp-footer-links">
            <a href="#solutions">Services</a>
            <a href="#pricing">Pricing</a>
            <Link href="/login">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
