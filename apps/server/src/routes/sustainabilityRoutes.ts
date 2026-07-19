/**
 * Sustainability Routes — transport recommendations with carbon footprint.
 */

import { Router, Request, Response } from 'express';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { validate, sustainabilitySchema } from '../middleware/validationMiddleware.js';
import { getSustainabilityRecommendations } from '../services/sustainabilityService.js';
import { SustainabilityRequest } from '@fanpulse/shared-types';

export const sustainabilityRouter = Router();

/**
 * POST /api/sustainability/recommendations
 * Public endpoint — returns transport options with carbon footprint estimates.
 */
sustainabilityRouter.post(
  '/recommendations',
  aiLimiter,
  validate(sustainabilitySchema),
  async (req: Request, res: Response) => {
    const result = await getSustainabilityRecommendations(req.body as SustainabilityRequest);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  }
);
