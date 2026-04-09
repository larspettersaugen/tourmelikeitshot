/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: false,
  register: true,
  skipWaiting: true,
});

/** Boring, standards-based headers — helps trust filters and avoids mixed expectations. */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 180,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// PWA: on in production builds unless ENABLE_PWA=false; in dev, set ENABLE_PWA=true to test.
const pwaExplicitOn = process.env.ENABLE_PWA === 'true';
const pwaExplicitOff = process.env.ENABLE_PWA === 'false';
const pwaProdDefault = process.env.NODE_ENV === 'production' && !pwaExplicitOff;
const enablePwa = pwaExplicitOn || pwaProdDefault;

module.exports = enablePwa ? withPWA(nextConfig) : nextConfig;
