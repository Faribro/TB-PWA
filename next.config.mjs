/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/(.*)',
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
    'lucide-react',
    '@cornerstonejs/core',
    '@cornerstonejs/tools'
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'three': 'three'
    };
    return config;
  }
};

export default nextConfig;
