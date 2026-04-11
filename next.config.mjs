/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: { unoptimized: true },

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
