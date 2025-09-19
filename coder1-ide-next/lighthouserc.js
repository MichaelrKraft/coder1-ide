module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3001',
        'http://localhost:3001/ide',
        'http://localhost:3001/documentation',
        'http://localhost:3001/consultation'
      ],
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Server running',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --headless'
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 500 }],
        'interactive': ['warn', { maxNumericValue: 5000 }],
        'speed-index': ['warn', { maxNumericValue: 4000 }],
        'unused-javascript': ['warn', { maxNumericValue: 100000 }],
        'modern-image-formats': 'off',
        'uses-webp-images': 'off'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    },
    server: {
      port: 9001,
      storage: {
        storageMethod: 'sql',
        sqlDialect: 'sqlite',
        sqlDatabasePath: '.lighthouseci/lighthouse-ci.db'
      }
    },
    wizard: {
      githubAppToken: process.env.LHCI_GITHUB_APP_TOKEN
    }
  }
};