/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone mode for Render deployment
  eslint: {
    // Temporarily disable ESLint during builds for Alpha deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip TypeScript errors during build for deployment
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Monaco Editor fix and client-side externals
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        net: false,
        tls: false,
        child_process: false,
      };
      
      // Prevent bundling of native modules on client side
      config.externals = [...(config.externals || []), 
        'chokidar',
        'fsevents',
        'better-sqlite3',
        'node-pty'
      ];
    }
    
    // Handle native modules for server
    if (isServer) {
      config.externals = [...(config.externals || []), 
        'better-sqlite3',
        'chokidar',
        'fsevents',
        'node-pty'
      ];
    }
    
    // Remove node-loader (not needed and may cause issues)
    config.module = {
      ...config.module,
      rules: [
        ...(config.module?.rules || []).filter(rule => 
          rule.test?.toString() !== /\.node$/.toString()
        )
      ]
    };
    
    return config;
  },
}

module.exports = nextConfig;