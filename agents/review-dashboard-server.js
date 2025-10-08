#!/usr/bin/env node

/**
 * Review Dashboard Server
 * Standalone server for the content review dashboard
 */

const express = require('express');
const path = require('path');
const reviewQueueRoutes = require('./routes/review-queue');

const app = express();
const PORT = process.env.REVIEW_PORT || 3005;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/review-queue', reviewQueueRoutes);

// Root route - redirect to dashboard
app.get('/', (req, res) => {
  res.redirect('/review-dashboard.html');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'review-dashboard',
    port: PORT
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     📋 Content Review Dashboard Server Started           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Dashboard URL: http://localhost:${PORT}`);
  console.log(`🔧 API Endpoint:  http://localhost:${PORT}/api/review-queue`);
  console.log(`💚 Health Check:  http://localhost:${PORT}/health`);
  console.log('');
  console.log('📝 Features:');
  console.log('   • View all pending content with full text');
  console.log('   • One-click approve/reject actions');
  console.log('   • Edit content before approving');
  console.log('   • Real-time stats dashboard');
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down review dashboard server...');
  process.exit(0);
});
