/**
 * Input Validation Middleware — Zod schemas for all request bodies.
 *
 * All user input is validated and sanitized before touching the database
 * or being inserted into GenAI prompts. Zod provides runtime type safety
 * in addition to TypeScript's compile-time checks.
 *
 * Security principle: treat ALL client-submitted data as untrusted.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

// ─── Validation schemas ────────────────────────────────────────────────────────

/** Auth login request */
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username too long')
    .trim(),
  password: z.string().min(1, 'Password is required').max(200, 'Password too long'),
});

/** Fan concierge chat request */
export const fanChatSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(1000, 'Message too long (max 1000 characters)')
    .trim(),
  language: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code (use BCP-47 format, e.g. "en", "es")')
    .optional()
    .default('en'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .max(20, 'History too long')
    .optional()
    .default([]),
  accessibilityMode: z.boolean().optional().default(false),
});

/** Ops assistant chat request */
export const opsChatSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(500, 'Message too long (max 500 characters)')
    .trim(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

/** Wayfinding request */
export const wayfindingSchema = z.object({
  fromLocation: z
    .string()
    .min(1, 'From location is required')
    .max(200, 'Location too long')
    .trim(),
  toLocation: z
    .string()
    .min(1, 'To location is required')
    .max(200, 'Location too long')
    .trim(),
  preferStepFree: z.boolean().optional().default(false),
  language: z.string().optional().default('en'),
});

/** Incident creation request */
export const createIncidentSchema = z.object({
  rawNote: z
    .string()
    .min(5, 'Incident note must be at least 5 characters')
    .max(2000, 'Incident note too long (max 2000 characters)')
    .trim(),
  location: z
    .string()
    .min(2, 'Location is required')
    .max(200, 'Location too long')
    .trim(),
  generatePublicAnnouncement: z.boolean().optional().default(false),
  announcementLanguage: z.string().optional().default('en'),
});

/** Briefing creation request */
export const createBriefingSchema = z.object({
  shiftNotes: z
    .string()
    .min(10, 'Shift notes must be at least 10 characters')
    .max(5000, 'Shift notes too long (max 5000 characters)')
    .trim(),
  targetLanguage: z.string().optional().default('en'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

/** Sustainability request */
export const sustainabilitySchema = z.object({
  origin: z
    .string()
    .min(2, 'Origin location is required')
    .max(200, 'Origin too long')
    .trim(),
  language: z.string().optional().default('en'),
});

/** Incident status update */
export const updateIncidentStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved']),
});

// ─── Validation middleware factory ─────────────────────────────────────────────

/**
 * Creates an Express middleware that validates req.body against the given Zod schema.
 * On validation failure, responds with 400 Bad Request and detailed field errors.
 * On success, replaces req.body with the parsed (and coerced) value.
 *
 * @param schema - Zod schema to validate against
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          timestamp: new Date().toISOString(),
        });
      } else {
        next(error);
      }
    }
  };
}
