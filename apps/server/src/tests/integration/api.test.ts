/**
 * Integration tests for key API endpoints using Supertest.
 *
 * Tests cover:
 * - Auth: login success, login failure, invalid credentials
 * - Crowd: GET /api/crowd/status
 * - Chat: POST /api/chat/fan (public), POST /api/chat/ops (protected)
 * - Incidents: role-based access control
 * - Input validation failures
 *
 * No real API calls — runs in mock AI mode.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { stopSimulator } from '../../simulator/crowdSimulator.js';

// Import app after env vars are set by setup.ts
const { app } = await import('../../index.js');

let fanToken: string;
let volunteerToken: string;
let organizerToken: string;

describe('API Integration Tests', () => {
  afterAll(() => {
    stopSimulator();
  });

  // ── Auth ────────────────────────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('should login as fan and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alex_fan', password: 'fan123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('fan');

      fanToken = res.body.data.token as string;
    });

    it('should login as volunteer', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'sam_volunteer', password: 'vol123' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('volunteer');
      volunteerToken = res.body.data.token as string;
    });

    it('should login as organizer', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin_organizer', password: 'org123' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('organizer');
      organizerToken = res.body.data.token as string;
    });

    it('should reject invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alex_fan', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing fields with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alex_fan' }); // missing password

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── Crowd Status ────────────────────────────────────────────────────────────
  describe('GET /api/crowd/status', () => {
    it('should return crowd status (no auth required)', async () => {
      const res = await request(app).get('/api/crowd/status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSimulated).toBe(true);
      expect(Array.isArray(res.body.data.zones)).toBe(true);
      expect(res.body.data.zones).toHaveLength(4);
    });

    it('should return valid crowd status fields', async () => {
      const res = await request(app).get('/api/crowd/status');
      const data = res.body.data as {
        zones: Array<{ avgDensityPercentage: number; status: string }>;
        overallStatus: string;
      };

      expect(['low', 'moderate', 'congested']).toContain(data.overallStatus);
      for (const zone of data.zones) {
        expect(zone.avgDensityPercentage).toBeGreaterThanOrEqual(0);
        expect(zone.avgDensityPercentage).toBeLessThanOrEqual(100);
      }
    });
  });

  // ── Fan Chat ────────────────────────────────────────────────────────────────
  describe('POST /api/chat/fan', () => {
    it('should respond to fan chat message (no auth)', async () => {
      const res = await request(app)
        .post('/api/chat/fan')
        .send({ message: 'Where is Gate A?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.role).toBe('assistant');
      expect(typeof res.body.data.message.content).toBe('string');
    });

    it('should reject empty message with 400', async () => {
      const res = await request(app)
        .post('/api/chat/fan')
        .send({ message: '' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject overly long message with 400', async () => {
      const res = await request(app)
        .post('/api/chat/fan')
        .send({ message: 'a'.repeat(1001) });

      expect(res.status).toBe(400);
    });

    it('should reject invalid language code', async () => {
      const res = await request(app)
        .post('/api/chat/fan')
        .send({ message: 'Hello', language: 'invalid-lang-123456' });

      expect(res.status).toBe(400);
    });
  });

  // ── Ops Chat — Role Authorization ────────────────────────────────────────────
  describe('POST /api/chat/ops', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/chat/ops')
        .send({ message: 'Which gates are congested?' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });

    it('should reject fan-role users with 403', async () => {
      const res = await request(app)
        .post('/api/chat/ops')
        .set('Authorization', `Bearer ${fanToken}`)
        .send({ message: 'Which gates are congested?' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should allow volunteer-role users', async () => {
      const res = await request(app)
        .post('/api/chat/ops')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ message: 'What is the crowd status?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow organizer-role users', async () => {
      const res = await request(app)
        .post('/api/chat/ops')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ message: 'Summarize crowd status.' });

      expect(res.status).toBe(200);
    });
  });

  // ── Incidents — Role Authorization ───────────────────────────────────────────
  describe('POST /api/incidents', () => {
    it('should reject fan users with 403', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${fanToken}`)
        .send({ rawNote: 'Medical situation', location: 'Section 214' });

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .send({ rawNote: 'Medical situation', location: 'Section 214' });

      expect(res.status).toBe(401);
    });

    it('should create incident for volunteer', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          rawNote: 'Fan collapsed at Gate D, appears to be heat-related.',
          location: 'Gate D, Section 201',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('category');
      expect(res.body.data).toHaveProperty('severity');
      expect(res.body.data).toHaveProperty('radioSummary');
    });

    it('should validate rawNote minimum length', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ rawNote: 'bad', location: 'Gate A' }); // too short

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── Health Check ─────────────────────────────────────────────────────────────
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.aiMode).toBe('mock'); // No API key in tests
    });
  });

  // ── 404 Handler ──────────────────────────────────────────────────────────────
  describe('Unknown routes', () => {
    it('should return 404 for unknown paths', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
