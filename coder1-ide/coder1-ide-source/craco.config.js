const path = require('path');

module.exports = {
  babel: {
    // Remove react-refresh from production builds
    plugins: process.env.NODE_ENV === 'production' ? [] : undefined,
    presets: process.env.NODE_ENV === 'production' ? [
      ['@babel/preset-env', { targets: 'defaults' }],
      ['@babel/preset-react', { runtime: 'automatic' }],
      '@babel/preset-typescript'
    ] : undefined,
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Remove react-refresh from production builds to avoid errors
      if (env === 'production') {
        webpackConfig.plugins = webpackConfig.plugins.filter(
          plugin => plugin.constructor.name !== 'ReactRefreshPlugin'
        );
      }

      // Add path alias support
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@': path.resolve(__dirname, 'src'),
        '@/components': path.resolve(__dirname, 'src/components'),
        '@/lib': path.resolve(__dirname, 'src/lib'),
      };

      // Add fallbacks for Node.js modules that Prettier might need
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "fs": false,
        "path": false,
        "os": false,
        "crypto": false,
        "stream": false,
        "buffer": false,
      };

      // Ensure Prettier modules are handled correctly
      webpackConfig.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: "javascript/auto",
      });

      // Force xterm to be included in the bundle
      webpackConfig.module.rules.push({
        test: /node_modules[\\/]@xterm[\\/]/,
        sideEffects: true
      });

      // Ensure xterm CSS is processed
      webpackConfig.module.rules.forEach(rule => {
        if (rule.oneOf) {
          rule.oneOf.forEach(oneOfRule => {
            if (oneOfRule.test && oneOfRule.test.toString().includes('css')) {
              if (oneOfRule.exclude) {
                oneOfRule.exclude = [
                  oneOfRule.exclude,
                  /node_modules[\\/]@xterm[\\/]xterm[\\/]css/
                ].filter(Boolean);
              }
            }
          });
        }
      });

      return webpackConfig;
    },
  },
};