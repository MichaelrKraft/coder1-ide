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
    
    // CRITICAL: Exclude browser-only libraries from SSR to prevent "self is not defined" errors
    if (isServer) {
      // Replace browser-only modules with empty stubs during SSR
      config.resolve.alias = {
        ...config.resolve.alias,
        '@xterm/xterm': false,
        '@xterm/addon-fit': false,
        'monaco-editor': false,
        '@monaco-editor/react': false,
        'three': false,
        '@react-three/fiber': false,
        'ogl': false,
        'd3': false,
      };
      
      // Use webpack NormalModuleReplacementPlugin to handle these modules
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^(@xterm\/xterm|@xterm\/addon-fit|monaco-editor|three|ogl|d3)$/,
          (resource) => {
            resource.request = false;
          }
        )
      );
    }
    
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
        'node-pty',
        // Add browser-only libraries to externals as well
        '@xterm/xterm',
        '@xterm/addon-fit',
        'monaco-editor',
        '@monaco-editor/react',
        'three',
        '@react-three/fiber',
        'ogl',
        'd3'
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