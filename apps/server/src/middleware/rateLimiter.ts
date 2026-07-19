/**
 * Rate Limiter — protects AI-heavy endpoints from abuse and cost overruns.
 *
 * Uses express-rate-limit with configurable window/max from environment.
 * Separate limiters for different risk levels:
 * - aiLimiter: Tight limit for GenAI endpoints (chat, incidents, wayfinding)
 * - standardLimiter: Looser limit for read-only endpoints
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

/** Standard API rate limiter (read endpoints). */
export const standardLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests * 3, // 3x the AI limit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please wait before trying again.',
    code: 'RATE_LIMITED',
    timestamp: new Date().toISOString(),
  },
});

/**
 * AI endpoint rate limiter — tight limits to control API costs.
 * Applied to: chat, wayfinding, incidents, briefings, sustainability.
 */
export const aiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error:
      'AI request limit reached. Please wait a few minutes before sending another message.',
    code: 'AI_RATE_LIMITED',
    timestamp: new Date().toISOString(),
  },
});
