/**
 * Coder1 Premium API Server
 * Eternal Memory + AI Supervision Service
 * 
 * This is a CLOSED-SOURCE service for premium features.
 * Free tier users access basic features through the public IDE.
 */

// Load environment variables FIRST (before any other imports that use them)
import dotenv from 'dotenv';
dotenv.config();

// Debug: Log environment variables (remove after debugging)
console.log('🔍 Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
console.log('STRIPE_PRICE_ID:', process.env.STRIPE_PRICE_ID);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { memoryRouter } from './api/memory-endpoints';
import { supervisionRouter } from './api/supervision-endpoints';
import { trialRouter } from './api/trial-endpoints';
import { billingRouter } from './api/billing-endpoints';
import { logger } from './utils/logger';
import { errorHandler } from './utils/error-handler';
import { database } from './utils/database';
import { schedulerService } from './services/scheduler-service';

const app = express();
const PORT = process.env.PORT || 3003;

// Security middleware
app.use(helmet());

// CORS configuration - only allow requests from public IDE
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'coder1-premium-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/premium/memory', memoryRouter);
app.use('/api/premium/supervision', supervisionRouter);
app.use('/api/premium/trial', trialRouter);
app.use('/api/premium/billing', billingRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      '/health',
      '/api/premium/memory/*',
      '/api/premium/supervision/*',
      '/api/premium/trial/*',
      '/api/premium/billing/*'
    ]
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handler
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`🚀 Coder1 Premium API Server Started`);
  logger.info(`📍 Server: http://localhost:${PORT}`);
  logger.info(`🔒 Environment: ${process.env.NODE_ENV}`);
  
  // Initialize database
  try {
    await database.initialize();
    logger.info(`💾 Database initialized successfully`);
  } catch (error) {
    logger.error('Failed to initialize database', error as Error);
    process.exit(1);
  }
  
  // Start scheduled tasks
  try {
    schedulerService.start();
    logger.info(`📅 Scheduler started successfully`);
  } catch (error) {
    logger.error('Failed to start scheduler (email service may be unavailable)', error as Error);
    // Don't exit - scheduler is optional
  }
  
  logger.info(`✅ Memory API: http://localhost:${PORT}/api/premium/memory`);
  logger.info(`✅ Supervision API: http://localhost:${PORT}/api/premium/supervision`);
  logger.info(`✅ Trial API: http://localhost:${PORT}/api/premium/trial`);
  logger.info(`✅ Billing API: http://localhost:${PORT}/api/premium/billing`);
});

export default app;
