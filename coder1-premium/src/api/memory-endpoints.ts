/**
 * Memory API Endpoints
 * Eternal Memory system - stores and retrieves session context
 */

import { Router, Request, Response, NextFunction } from 'express';
import { NotFoundError, ValidationError } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { memoryService } from '../services/memory-service';

export const memoryRouter = Router();

/**
 * Store session data in Eternal Memory
 * POST /api/premium/memory/store
 */
memoryRouter.post('/store', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, sessionId, sessionData } = req.body;

    if (!userId || !sessionId || !sessionData) {
      throw new ValidationError('Missing required fields: userId, sessionId, sessionData');
    }

    await memoryService.store(userId, sessionId, sessionData);

    res.json({
      success: true,
      message: 'Session data stored in Eternal Memory',
      sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Retrieve memory context for a session
 * GET /api/premium/memory/context/:sessionId
 */
memoryRouter.get('/context/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      throw new ValidationError('Missing required query parameter: userId');
    }

    const context = await memoryService.getContext(userId as string, sessionId);

    if (!context) {
      throw new NotFoundError('Session context');
    }

    res.json({
      success: true,
      sessionId,
      context,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * List all sessions for a user
 * GET /api/premium/memory/sessions
 */
memoryRouter.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      throw new ValidationError('Missing required query parameter: userId');
    }

    const sessions = await memoryService.listSessions(userId as string);

    res.json({
      success: true,
      userId,
      sessions,
      count: sessions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a session from memory
 * DELETE /api/premium/memory/:sessionId
 */
memoryRouter.delete('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      throw new ValidationError('Missing required query parameter: userId');
    }

    await memoryService.deleteSession(userId as string, sessionId);

    res.json({
      success: true,
      message: 'Session deleted from Eternal Memory',
      sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});
