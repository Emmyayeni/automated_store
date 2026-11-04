import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      // POS subdomain rewrites
      {
        source: '/pos/:path*',
        destination: '/pos/:path*',
      },
      // Admin subdomain rewrites
      {
        source: '/admin/:path*',
        destination: '/admin/:path*',
      },
      // Manager subdomain rewrites
      {
        source: '/manager/:path*',
        destination: '/manager/:path*',
      },
      // Cashier subdomain rewrites
      {
        source: '/cashier/:path*',
        destination: '/cashier/:path*',
      },
    ];
  },
}

// PWA Configuration
const isPWAEnabled = process.env.ENABLE_PWA === 'true';

let finalConfig = nextConfig;
if (isPWAEnabled) {
  const pwaConfig = withPWA({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
    sw: 'sw.js',
  });
  finalConfig = pwaConfig(nextConfig);
}

export default finalConfig;
