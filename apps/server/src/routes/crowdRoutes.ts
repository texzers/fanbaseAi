/**
 * Crowd Routes — serves simulated live crowd data.
 */

import { Router, Request, Response } from 'express';
import { standardLimiter } from '../middleware/rateLimiter.js';
import { getCurrentCrowdStatus } from '../services/crowdService.js';

export const crowdRouter = Router();

/**
 * GET /api/crowd/status
 * Returns the current crowd density for all zones/gates with AI briefing.
 * Public endpoint (no auth required) — rate limited.
 */
crowdRouter.get('/status', standardLimiter, async (req: Request, res: Response) => {
  try {
    const status = await getCurrentCrowdStatus();
    res.json({ success: true, data: status, timestamp: new Date().toISOString() });
  } catch (error) {
    throw error;
  }
});
