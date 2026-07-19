/**
 * Error Handler Middleware — global Express error handler.
 *
 * Catches all unhandled errors from routes and prevents internal stack traces
 * from leaking to clients (which could expose implementation details).
 *
 * Logs errors server-side for diagnostics. Returns generic safe messages to clients.
 */

import { Request, Response, NextFunction } from 'express';

/** Error handler must have 4 parameters to be recognized by Express. */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log full error server-side (redact any API keys from message just in case)
  const safeMessage = error.message?.replace(/sk-ant-[^\s]*/g, '[REDACTED]') ?? 'Unknown error';
  console.error(`[Error] ${req.method} ${req.path}: ${safeMessage}`);

  // Determine if this is an Anthropic API error
  const isApiError = error.constructor?.name === 'APIError' ||
    error.message?.includes('anthropic') ||
    error.message?.includes('Claude');

  if (isApiError) {
    res.status(503).json({
      success: false,
      error: 'AI service temporarily unavailable. Please try again in a moment.',
      code: 'AI_SERVICE_ERROR',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Generic 500 for all other errors — never leak stack traces
  res.status(500).json({
    success: false,
    error: 'An internal server error occurred.',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  });
}

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
}
