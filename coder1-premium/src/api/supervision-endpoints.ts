/**
 * Supervision API Endpoints
 * AI Supervision system - real-time code guidance and error prevention
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { supervisionService } from '../services/supervision-service';

export const supervisionRouter = Router();

/**
 * Enable AI supervision for a user
 * POST /api/premium/supervision/enable
 */
supervisionRouter.post('/enable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, sessionId } = req.body;

    if (!userId || !sessionId) {
      throw new ValidationError('Missing required fields: userId, sessionId');
    }

    await supervisionService.enable(userId, sessionId);

    res.json({
      success: true,
      message: 'AI Supervision activated',
      userId,
      sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Disable AI supervision
 * POST /api/premium/supervision/disable
 */
supervisionRouter.post('/disable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, sessionId } = req.body;

    if (!userId || !sessionId) {
      throw new ValidationError('Missing required fields: userId, sessionId');
    }

    await supervisionService.disable(userId, sessionId);

    res.json({
      success: true,
      message: 'AI Supervision deactivated',
      userId,
      sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Analyze code for issues and provide guidance
 * POST /api/premium/supervision/analyze
 */
supervisionRouter.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, code, context } = req.body;

    if (!userId || !code) {
      throw new ValidationError('Missing required fields: userId, code');
    }

    const analysis = await supervisionService.analyze(code, context);

    res.json({
      success: true,
      ...analysis,
      timestamp: analysis.timestamp.toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get supervision status
 * GET /api/premium/supervision/status
 */
supervisionRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, sessionId } = req.query;

    if (!userId || !sessionId) {
      throw new ValidationError('Missing required query parameters: userId, sessionId');
    }

    const status = await supervisionService.getStatus(userId as string, sessionId as string);

    res.json({
      success: true,
      ...status,
      lastCheck: status.lastCheck?.toISOString() || null
    });
  } catch (error) {
    next(error);
  }
});
