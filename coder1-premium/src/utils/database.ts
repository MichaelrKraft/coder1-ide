/**
 * Database Initialization
 * Sets up all database tables for premium services
 */

import { Pool } from 'pg';
import { logger } from './logger';
import { memoryService } from '../services/memory-service';
import { supervisionService } from '../services/supervision-service';
import { trialService } from '../services/trial-service';

class Database {
  private pool: Pool;
  private initialized: boolean = false;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error', err);
    });
  }

  /**
   * Initialize all database tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.info('Database already initialized');
      return;
    }

    try {
      logger.info('🔧 Initializing database...');

      await this.testConnection();

      // Skip optional service table creation for now - billing uses existing subscriptions table
      // logger.info('📦 Creating Memory service tables...');
      // await memoryService.initialize();

      // logger.info('👁️ Creating Supervision service tables...');
      // await supervisionService.initialize();

      // logger.info('🎯 Creating Trial service tables...');
      // await trialService.initialize();

      logger.info('✅ Database initialization complete! (Billing service ready)');
      this.initialized = true;
    } catch (error) {
      logger.error('❌ Database initialization failed', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      logger.info(`Database connected: ${result.rows[0].now}`);
    } finally {
      client.release();
    }
  }

  /**
   * Check if database is healthy
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: Date;
    connectionCount: number;
    error?: string;
  }> {
    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        return {
          status: 'healthy',
          timestamp: new Date(),
          connectionCount: this.pool.totalCount,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        connectionCount: this.pool.totalCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  } {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
    };
  }
}

export const database = new Database();
