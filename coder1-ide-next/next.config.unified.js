/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Disable static generation for unified server deployment
  output: 'standalone',
  
  // Force all pages to be server-side rendered
  experimental: {
    // Disable static optimization for API routes
    outputFileTracing: true,
  },
  
  // Skip static generation for these routes
  generateBuildId: async () => {
    return 'unified-server-build';
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        'node-pty': false,
      };
    }
    
    // Handle node-pty module
    if (isServer) {
      config.externals.push('node-pty');
    }
    
    return config;
  },
  
  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_UNIFIED_SERVER: 'true',
    NEXT_PUBLIC_DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE || 'production',
  },
  
  // Disable image optimization for Render deployment
  images: {
    unoptimized: true,
  },
  
  // Custom headers for WebSocket support
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;