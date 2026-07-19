/**
 * Briefing Service — generates AI volunteer shift briefings.
 */

import { randomUUID } from 'crypto';
import { VolunteerBriefing, CreateBriefingRequest } from '@fanpulse/shared-types';
import { callClaude, buildBriefingPrompt } from '../ai/claudeClient.js';
import db from '../db/database.js';

/**
 * Generates a volunteer shift briefing from raw organizer notes.
 *
 * @param request - Validated briefing creation request
 * @param generatedBy - User ID of the organizer
 * @returns The created VolunteerBriefing record
 */
export async function createVolunteerBriefing(
  request: CreateBriefingRequest,
  generatedBy: string
): Promise<VolunteerBriefing> {
  const {
    shiftNotes,
    targetLanguage = 'en',
    date = new Date().toISOString().split('T')[0]!,
  } = request;

  const promptOptions = buildBriefingPrompt(shiftNotes, date, targetLanguage);
  const content = await callClaude(promptOptions);

  const id = randomUUID();
  const now = new Date().toISOString();

  // Parse out translation if present
  let mainContent = content;
  let translatedContent: string | undefined;

  if (targetLanguage !== 'en' && content.includes('TRANSLATION:')) {
    const parts = content.split('TRANSLATION:');
    mainContent = parts[0]!.trim();
    translatedContent = parts[1]?.trim();
  }

  db.prepare(`
    INSERT INTO volunteer_briefings (id, date, shift_notes, content, translated_content, language, generated_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, date, shiftNotes, mainContent, translatedContent ?? null, targetLanguage, generatedBy, now);

  return {
    id,
    date,
    shiftNotes,
    content: mainContent,
    translatedContent,
    language: targetLanguage,
    generatedBy,
    createdAt: now,
  };
}

/**
 * Retrieves recent volunteer briefings.
 */
export function getVolunteerBriefings(limit: number = 10): VolunteerBriefing[] {
  const rows = db.prepare(
    'SELECT * FROM volunteer_briefings ORDER BY created_at DESC LIMIT ?'
  ).all(Math.min(limit, 50)) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row['id'] as string,
    date: row['date'] as string,
    shiftNotes: row['shift_notes'] as string,
    content: row['content'] as string,
    translatedContent: row['translated_content'] as string | undefined,
    language: row['language'] as string,
    generatedBy: row['generated_by'] as string,
    createdAt: row['created_at'] as string,
  }));
}
