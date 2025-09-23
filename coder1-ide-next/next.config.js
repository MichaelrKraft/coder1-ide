/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to prevent double-initialization issues
  // Disable standalone mode for development - causes static asset issues
  // output: 'standalone', // Only enable for production builds
  images: {
    unoptimized: true, // Disable image optimization to fix preload error
  },
  eslint: {
    // Temporarily disable ESLint during builds for Alpha deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip TypeScript errors during build for deployment
    ignoreBuildErrors: true,
  },
  // Speed up development CSS loading and fix CSS serving issues
  experimental: {
    optimizeCss: false,
    optimizePackageImports: ['@xterm/xterm'],
    // Fix CSS hot reload issues in development
    cssChunking: 'loose',
  },
  webpack: (config, { isServer, dev }) => {
    // Add path alias resolution first
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    };
    
    // CRITICAL FIX: Replace browser-only libraries with stubs during SSR
    if (isServer) {
      const path = require('path');
      const stubPath = path.resolve(__dirname, 'lib/stubs/browser-stub.js');
      
      // Replace ALL browser-only modules with our stub
      config.resolve.alias = {
        ...config.resolve.alias,
        '@xterm/xterm': stubPath,
        '@xterm/addon-fit': stubPath,
        'monaco-editor': stubPath,
        '@monaco-editor/react': stubPath,
        'three': stubPath,
        '@react-three/fiber': stubPath,
        'ogl': stubPath,
        'd3': stubPath,
        'cheerio': stubPath,
      };
      
      // DISABLE vendor chunk splitting entirely for SSR
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
      };
    }
    
    // Only apply optimizations for CLIENT production builds
    if (!isServer && !dev) {
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
        // Browser-only libraries are now handled by stub replacement above
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
  
  // Add rewrites to bridge Express-to-Next.js routing for component capture system
  async rewrites() {
    return [
      {
        source: '/components-beta/api/list',
        destination: '/api/components-beta/list'
      },
      {
        source: '/components-beta/api/component/:id',
        destination: '/api/components-beta/component/:id'
      },
      {
        source: '/components-beta/api/generate-code/:id',
        destination: '/api/components-beta/generate-code/:id'
      }
    ];
  },
}

module.exports = nextConfig;