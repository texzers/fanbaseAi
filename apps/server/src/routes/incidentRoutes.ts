/**
 * Incident Routes — protected staff-only incident management.
 */

import { Router, Request, Response } from 'express';
import { aiLimiter, standardLimiter } from '../middleware/rateLimiter.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  validate,
  createIncidentSchema,
  updateIncidentStatusSchema,
} from '../middleware/validationMiddleware.js';
import {
  createIncident,
  getIncidents,
  updateIncidentStatus,
} from '../services/incidentService.js';
import { CreateIncidentRequest } from '@fanpulse/shared-types';

export const incidentRouter = Router();

// All incident endpoints require authentication + volunteer/organizer role
incidentRouter.use(authenticateToken, requireRole('volunteer', 'organizer'));

/**
 * GET /api/incidents
 * Retrieves paginated list of incidents, most recent first.
 */
incidentRouter.get('/', standardLimiter, (req: Request, res: Response) => {
  const page = parseInt((req.query['page'] as string) ?? '1', 10);
  const limit = parseInt((req.query['limit'] as string) ?? '10', 10);
  const incidents = getIncidents(page, limit);
  res.json({ success: true, data: incidents, timestamp: new Date().toISOString() });
});

/**
 * POST /api/incidents
 * Creates a new incident with AI-generated structured report.
 */
incidentRouter.post(
  '/',
  aiLimiter,
  validate(createIncidentSchema),
  async (req: Request, res: Response) => {
    const incident = await createIncident(
      req.body as CreateIncidentRequest,
      req.user!.sub
    );
    res.status(201).json({ success: true, data: incident, timestamp: new Date().toISOString() });
  }
);

/**
 * PATCH /api/incidents/:id/status
 * Updates incident status (open → in_progress → resolved).
 */
incidentRouter.patch(
  '/:id/status',
  standardLimiter,
  validate(updateIncidentStatusSchema),
  (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: 'open' | 'in_progress' | 'resolved' };
    const updated = updateIncidentStatus(id, status);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Incident not found', timestamp: new Date().toISOString() });
      return;
    }
    res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  }
);
