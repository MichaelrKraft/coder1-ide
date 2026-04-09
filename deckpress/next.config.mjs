/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/deck',
        destination: '/deck/index.html',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/deck',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
