/**
 * Incident Service — business logic for creating and managing incidents.
 *
 * Handles AI-powered incident report generation from free-text staff notes.
 * All user input is validated before being passed to the GenAI layer.
 */

import { randomUUID } from 'crypto';
import {
  Incident,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  CreateIncidentRequest,
} from '@fanpulse/shared-types';
import { callClaude, buildIncidentPrompt } from '../ai/claudeClient.js';
import db from '../db/database.js';

/** Maximum incidents per page. */
const INCIDENTS_PAGE_LIMIT = 20;

/** Expected shape of Claude's incident report JSON output. */
interface IncidentAiReport {
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  responsePlan: string;
  radioSummary: string;
  publicAnnouncement?: string;
}

/**
 * Creates a new incident record with AI-generated structured report.
 *
 * Flow:
 * 1. Call Claude API with the raw note to generate a structured report
 * 2. Parse the JSON response (with fallback on parse error)
 * 3. Persist the record to SQLite
 * 4. Return the full incident record
 *
 * @param request - Validated incident creation request
 * @param createdBy - User ID of the creating staff member
 * @returns The created Incident record
 */
export async function createIncident(
  request: CreateIncidentRequest,
  createdBy: string
): Promise<Incident> {
  const { rawNote, location, generatePublicAnnouncement = false, announcementLanguage = 'en' } =
    request;

  // ── Generate AI report ──────────────────────────────────────────────────────
  let aiReport: IncidentAiReport;

  try {
    const promptOptions = buildIncidentPrompt(
      rawNote,
      location,
      generatePublicAnnouncement,
      announcementLanguage
    );
    const rawResponse = await callClaude(promptOptions);

    // Parse JSON — Claude may include markdown fences in some modes
    const jsonStr = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
    aiReport = JSON.parse(jsonStr) as IncidentAiReport;
  } catch (error) {
    // Fallback to safe defaults if AI call or JSON parse fails
    console.error('[IncidentService] AI report generation failed:', error);
    aiReport = {
      title: `Incident at ${location}`,
      category: 'general',
      severity: 'medium',
      responsePlan:
        '1. Assess the situation\n2. Contact supervisor\n3. Document observations\n4. Await further instructions',
      radioSummary: `Incident reported at ${location}. Details to follow.`,
    };
  }

  // ── Persist to DB ──────────────────────────────────────────────────────────
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO incidents (
      id, title, raw_note, category, severity, status, location,
      response_plan, radio_summary, public_announcement, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    aiReport.title,
    rawNote,
    aiReport.category,
    aiReport.severity,
    'open' satisfies IncidentStatus,
    location,
    aiReport.responsePlan,
    aiReport.radioSummary,
    aiReport.publicAnnouncement ?? null,
    createdBy,
    now,
    now
  );

  return {
    id,
    title: aiReport.title,
    rawNote,
    category: aiReport.category,
    severity: aiReport.severity,
    status: 'open',
    location,
    responsePlan: aiReport.responsePlan,
    radioSummary: aiReport.radioSummary,
    publicAnnouncement: aiReport.publicAnnouncement,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Retrieves paginated list of incidents, most recent first.
 *
 * @param page - Page number (1-indexed)
 * @param limit - Max records per page (capped at INCIDENTS_PAGE_LIMIT)
 * @returns Array of incident records
 */
export function getIncidents(page: number = 1, limit: number = 10): Incident[] {
  const safeLimit = Math.min(limit, INCIDENTS_PAGE_LIMIT);
  const offset = (page - 1) * safeLimit;

  const rows = db
    .prepare(
      `SELECT * FROM incidents ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(safeLimit, offset) as Record<string, unknown>[];

  return rows.map(rowToIncident);
}

/**
 * Updates an incident's status.
 *
 * @param id - Incident ID
 * @param status - New status
 * @returns Updated incident or null if not found
 */
export function updateIncidentStatus(id: string, status: IncidentStatus): Incident | null {
  const now = new Date().toISOString();
  const result = db
    .prepare('UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, now, id);

  if (result.changes === 0) return null;

  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToIncident(row) : null;
}

/** Maps a SQLite row (snake_case) to an Incident interface (camelCase). */
function rowToIncident(row: Record<string, unknown>): Incident {
  return {
    id: row['id'] as string,
    title: row['title'] as string,
    rawNote: row['raw_note'] as string,
    category: row['category'] as IncidentCategory,
    severity: row['severity'] as IncidentSeverity,
    status: row['status'] as IncidentStatus,
    location: row['location'] as string,
    responsePlan: row['response_plan'] as string,
    radioSummary: row['radio_summary'] as string,
    publicAnnouncement: row['public_announcement'] as string | undefined,
    publicAnnouncementTranslated: row['public_announcement_translated'] as
      | string
      | undefined,
    createdBy: row['created_by'] as string,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}
