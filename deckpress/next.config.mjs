/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // v1 Cinematic template
        source: '/deck',
        destination: '/deck/index.html',
      },
      {
        // v2 Keynote template
        source: '/decks/keynote',
        destination: '/decks/keynote/index.html',
      },
      {
        // v3 Narrated template
        source: '/decks/narrated',
        destination: '/decks/narrated/index.html',
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
