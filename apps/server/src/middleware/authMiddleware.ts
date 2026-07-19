/**
 * Authentication Middleware — JWT verification and role-based access control.
 *
 * Security notes:
 * - JWTs are verified using the secret from config (never hardcoded)
 * - Role authorization is enforced server-side — clients cannot bypass it
 * - Tokens with missing/invalid/expired signatures are rejected with 401
 * - Role mismatches return 403 Forbidden
 * - No sensitive token data is logged
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '@fanpulse/shared-types';
import { config } from '../config.js';

/** Extends Express Request to include the verified JWT payload. */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Extracts and verifies the JWT from the Authorization header.
 * On success, attaches the decoded payload to req.user.
 * On failure, responds with 401 Unauthorized.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Include a Bearer token in the Authorization header.',
      code: 'AUTH_REQUIRED',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    // Don't log the token — it may contain user data
    res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token.',
      code: 'AUTH_INVALID',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Factory function: returns a middleware that allows only the specified roles.
 * Must be used AFTER authenticateToken middleware.
 *
 * @param allowedRoles - One or more roles that may access this endpoint
 * @returns Express middleware function
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. This endpoint requires one of these roles: ${allowedRoles.join(', ')}.`,
        code: 'FORBIDDEN',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
