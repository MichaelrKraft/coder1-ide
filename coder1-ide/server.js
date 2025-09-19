// Production server entry point
const app = require('./src/app-simple');
const PORT = process.env.PORT || 3000;

// Start the server - bind to all interfaces for production
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Coder1 Platform is running on port ${PORT}`);
  console.log(`📱 Frontend: http://0.0.0.0:${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Graceful shutdown...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Graceful shutdown...');
  process.exit(0);
});