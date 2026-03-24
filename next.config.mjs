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

  // Tree-shake heavy packages — cuts per-module compile time significantly
  optimizePackageImports: [
    'lucide-react',
    'framer-motion',
    'd3',
    'recharts',
    '@radix-ui/react-dialog',
    '@radix-ui/react-select',
    '@radix-ui/react-tabs',
    '@radix-ui/react-dropdown-menu',
  ],

  transpilePackages: [
    '@deck.gl',
    '@luma.gl',
    '@math.gl',
    'd3',
    'three',
    '@cornerstonejs/core',
    '@cornerstonejs/tools',
  ],

  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      three: 'three',
    };

    if (dev && !isServer) {
      // Faster source maps in dev — eval-cheap-module is the sweet spot
      config.devtool = 'eval-cheap-module-source-map';
    }

    return config;
  },
};

export default nextConfig;
