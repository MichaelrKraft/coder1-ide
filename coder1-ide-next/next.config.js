/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Temporarily disable ESLint during builds for Alpha deployment
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Monaco Editor fix and client-side externals
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
      
      // Prevent bundling of native modules on client side
      config.externals = [...(config.externals || []), 
        'chokidar',
        'fsevents',
        'better-sqlite3'
      ];
    }
    
    // Handle native modules for Context system
    if (isServer) {
      config.externals = [...(config.externals || []), 
        'better-sqlite3',
        'chokidar',
        'fsevents'
      ];
    }
    
    // Ignore binary modules
    config.module = {
      ...config.module,
      rules: [
        ...(config.module?.rules || []),
        {
          test: /\.node$/,
          use: 'node-loader'
        }
      ]
    };
    
    return config;
  },
}

module.exports = nextConfig;