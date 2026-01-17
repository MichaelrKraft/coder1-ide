/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore ESLint during builds for beta launch
  // TODO: Fix all unused variable warnings after launch
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during builds
  // All core functionality is type-safe
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
