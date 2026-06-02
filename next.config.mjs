/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: { unoptimized: true },
  
  // Removed deprecated instrumentationHook

  // Webpack configuration for Prisma
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle Prisma client on server side
      config.externals.push('@prisma/client');
    }
    return config;
  },

  async headers() {
    return [
      {
        source: '/dashboard/neural-nexus(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  transpilePackages: [
    '@deck.gl',
    '@luma.gl',
    '@math.gl',
    'd3',
    'three',
    '@cornerstonejs/core',
    '@cornerstonejs/tools',
  ],

  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    resolveAlias: {
      three: 'three',
    },
  },
};

export default nextConfig;
