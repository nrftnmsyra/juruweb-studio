import Image from 'next/image';
import Link from 'next/link';
import './landing.css';
import {
  MdArrowForward,
  MdChat,
  MdCode,
  MdPhoneIphone,
  MdCampaign,
  MdCheckCircle,
  MdBolt,
  MdHub,
  MdAutoAwesome,
  MdSavings,
  MdFormatQuote,
} from 'react-icons/md';

export const metadata = {
  title: 'Juruweb Studio — Malaysia\'s Digital Solutions Partner',
  description:
    'We help Malaysian SMEs scale with custom websites, mobile apps, and results-driven digital marketing.',
};

// WhatsApp contact link. Set NEXT_PUBLIC_WHATSAPP_URL in the environment
// (e.g. https://wa.me/60123456789) to configure it without editing code.
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_URL || 'https://wa.me/60123456789';

const solutions = [
  {
    icon: <MdCode />,
    title: 'Web & System',
    desc: 'Fast, secure, and scalable web solutions tailored to your operations.',
    items: ['Company Website', 'Landing Page', 'Custom Web App / Dashboard', 'Booking System', 'Internal System (CRM)'],
  },
  {
    icon: <MdPhoneIphone />,
    title: 'Mobile Apps',
    desc: 'Bring your ideas to life on the App Store and Google Play.',
    items: ['UI/UX Design', 'MVP App Development', 'Android & iOS Apps', 'Maintenance'],
  },
  {
    icon: <MdCampaign />,
    title: 'Digital Marketing',
    desc: 'Drive traffic, build brand awareness, and get real leads.',
    items: ['Social Media Management', 'Content Planning', 'Post Design', 'Video Editing', 'Monthly Packages'],
  },
];

const pricing = [
  {
    category: 'Web & Systems',
    tiers: [
      { name: 'Starter Website', price: 'From RM800' },
      { name: 'Business Website', price: 'From RM1,500' },
      { name: 'Custom Web App', price: 'From RM3,000' },
    ],
    cta: 'Get Quote',
    featured: false,
  },
  {
    category: 'Digital Marketing',
    tiers: [
      { name: 'Basic Plan', price: 'From RM500/mo' },
      { name: 'Growth Plan', price: 'From RM1,000/mo' },
      { name: 'Advanced Plan', price: 'From RM2,000/mo' },
    ],
    cta: 'Start Growing',
    featured: true,
  },
  {
    category: 'Mobile Apps',
    tiers: [
      { name: 'MVP App', price: 'From RM5,000' },
      { name: 'Full Application', price: 'From RM8,000' },
    ],
    cta: 'Get Quote',
    featured: false,
  },
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
          <span className="lp-eyebrow">Your Digital Solutions Partner</span>
          <h1 className="lp-hero-title">Malaysia&apos;s Top Digital Solutions Partner</h1>
          <p className="lp-hero-sub">
            We help Malaysian SMEs scale effortlessly with custom websites, robust mobile apps, and
            results-driven digital marketing.
          </p>
          <div className="lp-hero-actions">
            <a href={WHATSAPP} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              <span>Start Your Project</span>
              <MdArrowForward />
            </a>
            <a href="#pricing" className="btn btn-secondary">Book Consultation</a>
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
            <h2 className="lp-section-title">Solutions Designed For Growth</h2>
            <p className="lp-section-tagline">We don&apos;t just build websites; we build engines for your business.</p>
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

      {/* Pricing */}
      <section id="pricing" className="lp-section lp-section--tint">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-section-title">Simple, Transparent Pricing</h2>
            <p className="lp-section-tagline">Premium quality suited for SME budgets.</p>
          </div>
          <div className="lp-grid-3">
            {pricing.map((p) => (
              <div key={p.category} className={`lp-price-card ${p.featured ? 'lp-price-card--featured' : ''}`}>
                {p.featured && <span className="lp-badge-value">Most Value</span>}
                <h3 className="lp-card-title">{p.category}</h3>
                <ul className="lp-price-list">
                  {p.tiers.map((t) => (
                    <li key={t.name}>
                      <span>{t.name}</span>
                      <strong>{t.price}</strong>
                    </li>
                  ))}
                </ul>
                <a href={WHATSAPP} className={`btn ${p.featured ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }} target="_blank" rel="noopener noreferrer">
                  {p.cta}
                </a>
              </div>
            ))}
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
