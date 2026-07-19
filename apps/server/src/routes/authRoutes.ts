/**
 * Auth Routes — handles mock authentication for demo purposes.
 *
 * In production, this would integrate with a real SSO/ticketing system.
 * Demo credentials are:
 *   fan: alex_fan / fan123
 *   volunteer: sam_volunteer / vol123
 *   organizer: admin_organizer / org123
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { validate, loginSchema } from '../middleware/validationMiddleware.js';
import { standardLimiter } from '../middleware/rateLimiter.js';
import db from '../db/database.js';
import { JwtPayload, UserRole } from '@fanpulse/shared-types';

export const authRouter = Router();

authRouter.post('/login', standardLimiter, validate(loginSchema), (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };

  // Look up user in DB (password stored as "demo:<password>" for demo)
  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username) as {
      id: string;
      username: string;
      email: string;
      password_hash: string;
      role: UserRole;
    } | undefined;

  if (!user || user.password_hash !== `demo:${password}`) {
    res.status(401).json({
      success: false,
      error: 'Invalid username or password.',
      code: 'INVALID_CREDENTIALS',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    username: user.username,
    role: user.role,
  };

  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

/** Returns the current user profile from their JWT. */
authRouter.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ success: false, error: 'Not authenticated', timestamp: new Date().toISOString() });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    res.json({
      success: true,
      data: { id: decoded.sub, username: decoded.username, role: decoded.role },
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token', timestamp: new Date().toISOString() });
  }
});
