const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true,
  latex: true,
  flexsearch: {
    codeblocks: true
  }
});

module.exports = withNextra({
  reactStrictMode: true,
  images: {
    domains: ['avatars.githubusercontent.com', 'images.unsplash.com'],
    unoptimized: true
  },
  output: 'standalone',
  basePath: process.env.BASE_PATH || '',
  trailingSlash: true
});
