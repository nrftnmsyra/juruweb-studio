import './landing.css';
import LandingClient from '@/components/LandingClient';

export const metadata = {
  title: 'Juruweb Studio — Affordable Websites for Malaysian SMEs',
  description:
    'Juruweb Studio builds fast, affordable, mobile-friendly websites for Malaysian SMEs — WhatsApp integration, product catalogs, SEO, and booking, from RM699.',
};

export const viewport = {
  themeColor: '#0b0b14',
};

export default function Page() {
  return <LandingClient />;
}
