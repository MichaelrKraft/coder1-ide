/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variables that should be available on the client side
  env: {
    NEXT_PUBLIC_CODER1_IDE_URL: process.env.NEXT_PUBLIC_CODER1_IDE_URL || 'https://coder1.dev/ide',
  },

  // Optimize for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // API routes configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },

  // Redirects for backwards compatibility
  async redirects() {
    return [
      {
        source: '/github',
        destination: 'https://github.com/MichaelrKraft/coder1-prd-generator',
        permanent: false,
      },
      {
        source: '/community',
        destination: 'https://github.com/MichaelrKraft/coder1-community',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
