/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // Monitoring and Analytics were two pages listing the same client sites.
    // They are one page now. These keep old bookmarks, and any link already
    // handed to a client, landing somewhere real.
    return [
      { source: '/admin/monitoring', destination: '/admin/websites', permanent: false },
      { source: '/admin/analytics', destination: '/admin/websites', permanent: false },
      {
        source: '/admin/analytics/:domain',
        destination: '/admin/websites/:domain',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
