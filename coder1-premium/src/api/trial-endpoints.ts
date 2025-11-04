/**
 * Trial API Endpoints
 * 7-day trial management system
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { trialService } from '../services/trial-service';
import { memoryService } from '../services/memory-service';

export const trialRouter = Router();

/**
 * Get trial status for a user
 * GET /api/premium/trial/status/:userId
 */
trialRouter.get('/status/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const status = await trialService.getStatus(userId);

    res.json({
      success: true,
      ...status,
      trialStartDate: status.trialStartDate?.toISOString() || null,
      trialEndDate: status.trialEndDate?.toISOString() || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Start 7-day trial for a user
 * POST /api/premium/trial/start
 */
trialRouter.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new ValidationError('Missing required field: userId');
    }

    const trial = await trialService.startTrial(userId);

    res.json({
      success: true,
      message: '7-day trial activated! Enjoy Eternal Memory + AI Supervision',
      userId,
      trialStartDate: trial.trialStartDate.toISOString(),
      trialEndDate: trial.trialEndDate.toISOString(),
      daysRemaining: 7,
      features: [
        'Eternal Memory - Perfect context across unlimited sessions',
        'AI Supervision - Real-time guidance and error prevention',
        'Advanced Analytics - Insights into coding patterns',
        'Priority Support - Direct access to help'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Convert trial to Pro subscription
 * POST /api/premium/trial/convert
 */
trialRouter.post('/convert', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, stripeSubscriptionId } = req.body;

    if (!userId || !stripeSubscriptionId) {
      throw new ValidationError('Missing required fields: userId, stripeSubscriptionId');
    }

    await trialService.convertToPro(userId, stripeSubscriptionId);

    res.json({
      success: true,
      message: 'Welcome to Coder1 Pro! Your Eternal Memory has been restored.',
      userId,
      plan: 'pro',
      status: 'active',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Preserve memory data after trial expiry
 * POST /api/premium/trial/preserve-memory
 */
trialRouter.post('/preserve-memory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new ValidationError('Missing required field: userId');
    }

    const expiresAt = await memoryService.preserveMemoryData(userId);

    res.json({
      success: true,
      message: 'Your memory has been preserved for 30 days. Upgrade anytime to restore it!',
      userId,
      preservationPeriod: '30 days',
      expiresAt: expiresAt.toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Restore memory data on upgrade
 * POST /api/premium/trial/restore-memory
 */
trialRouter.post('/restore-memory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new ValidationError('Missing required field: userId');
    }

    const sessionsRestored = await memoryService.restoreMemoryData(userId);

    res.json({
      success: true,
      message: 'Your Eternal Memory has been restored! All your context is back.',
      userId,
      sessionsRestored,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});
