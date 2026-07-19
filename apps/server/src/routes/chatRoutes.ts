/**
 * Chat Routes — fan concierge and ops assistant endpoints.
 */

import { Router, Request, Response } from 'express';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { validate, fanChatSchema, opsChatSchema } from '../middleware/validationMiddleware.js';
import { processFanChatMessage, processOpsChatMessage } from '../services/chatService.js';
import { FanChatRequest, OpsChatRequest } from '@fanpulse/shared-types';

export const chatRouter = Router();

/**
 * POST /api/chat/fan
 * Fan concierge chat — public endpoint with rate limiting.
 * Fans can ask questions in their own language about the stadium.
 */
chatRouter.post('/fan', aiLimiter, validate(fanChatSchema), async (req: Request, res: Response) => {
  const chatResponse = await processFanChatMessage(req.body as FanChatRequest);
  res.json({ success: true, data: chatResponse, timestamp: new Date().toISOString() });
});

/**
 * POST /api/chat/ops
 * Ops assistant chat — restricted to volunteer and organizer roles.
 * Answers questions grounded in current crowd simulation data.
 */
chatRouter.post(
  '/ops',
  aiLimiter,
  authenticateToken,
  requireRole('volunteer', 'organizer'),
  validate(opsChatSchema),
  async (req: Request, res: Response) => {
    const chatResponse = await processOpsChatMessage(req.body as OpsChatRequest);
    res.json({ success: true, data: chatResponse, timestamp: new Date().toISOString() });
  }
);

/**
 * POST /api/chat/wayfinding
 * Wayfinding directions — public endpoint, rate limited.
 */
import { validate as validateSchema, wayfindingSchema } from '../middleware/validationMiddleware.js';
import { generateWayfinding } from '../services/wayfindingService.js';
import { WayfindingRequest } from '@fanpulse/shared-types';

chatRouter.post(
  '/wayfinding',
  aiLimiter,
  validate(wayfindingSchema),
  async (req: Request, res: Response) => {
    const result = await generateWayfinding(req.body as WayfindingRequest);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  }
);
