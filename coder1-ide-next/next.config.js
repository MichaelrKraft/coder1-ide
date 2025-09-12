/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable standalone mode for development - causes static asset issues
  // output: 'standalone', // Only enable for production builds
  eslint: {
    // Temporarily disable ESLint during builds for Alpha deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip TypeScript errors during build for deployment
    ignoreBuildErrors: true,
  },
  // Speed up development CSS loading
  experimental: {
    optimizeCss: false,
    optimizePackageImports: ['@xterm/xterm'],
  },
  webpack: (config, { isServer, dev }) => {
    // Only apply heavy optimizations in production
    if (!dev) {
      // Production webpack stability improvements
      config.cache = {
        type: 'filesystem',
        maxMemoryGenerations: 1,
      };
      
      // Optimize chunks for production only
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 1,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    
    // Add path alias resolution for standalone mode
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    };
    
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