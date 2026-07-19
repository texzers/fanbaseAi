/**
 * Briefing Routes — volunteer briefing generation for organizers.
 */

import { Router, Request, Response } from 'express';
import { aiLimiter, standardLimiter } from '../middleware/rateLimiter.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { validate, createBriefingSchema } from '../middleware/validationMiddleware.js';
import { createVolunteerBriefing, getVolunteerBriefings } from '../services/briefingService.js';
import { CreateBriefingRequest } from '@fanpulse/shared-types';

export const briefingRouter = Router();

// Briefings are organizer-only
briefingRouter.use(authenticateToken, requireRole('organizer'));

briefingRouter.get('/', standardLimiter, (_req, res: Response) => {
  const briefings = getVolunteerBriefings(20);
  res.json({ success: true, data: briefings, timestamp: new Date().toISOString() });
});

briefingRouter.post(
  '/',
  aiLimiter,
  validate(createBriefingSchema),
  async (req: Request, res: Response) => {
    const briefing = await createVolunteerBriefing(
      req.body as CreateBriefingRequest,
      req.user!.sub
    );
    res.status(201).json({ success: true, data: briefing, timestamp: new Date().toISOString() });
  }
);
