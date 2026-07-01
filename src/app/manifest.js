export default function manifest() {
  return {
    name: 'Juruweb Studio - Admin Dashboard',
    short_name: 'Juruweb',
    description: 'Manage client orders, generate quotations, and track payment invoices.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
