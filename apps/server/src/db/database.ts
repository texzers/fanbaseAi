/**
 * SQLite database initialization, schema creation, and seeding.
 *
 * Uses better-sqlite3 (synchronous API) for simplicity. All queries in
 * services go through this shared db instance.
 *
 * Tables:
 *   - users: mock auth users with hashed passwords
 *   - zones: stadium zones (North, South, East, West)
 *   - gates: individual gate entry points per zone
 *   - sections: seating sections per gate/zone
 *   - incidents: staff-created incident records
 *   - volunteer_briefings: AI-generated shift briefings
 *   - live_alerts: operational/safety announcements
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Ensures the data directory exists before opening the DB file. */
function ensureDataDir(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Resolve absolute path from potentially relative DATABASE_URL config. */
const DB_PATH = path.isAbsolute(config.databaseUrl)
  ? config.databaseUrl
  : path.resolve(process.cwd(), config.databaseUrl);

ensureDataDir(DB_PATH);

/** Singleton better-sqlite3 Database instance. */
export const db = new Database(DB_PATH);

// Enable WAL mode for better read concurrency.
db.pragma('journal_mode = WAL');
// Enforce foreign key constraints.
db.pragma('foreign_keys = ON');

/** Creates all schema tables if they don't already exist. */
function createSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('fan', 'volunteer', 'organizer')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      description TEXT NOT NULL,
      total_capacity INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      zone_id TEXT NOT NULL REFERENCES zones(id),
      section_range TEXT NOT NULL,
      has_accessible_route INTEGER NOT NULL DEFAULT 0,
      has_prayer_room INTEGER NOT NULL DEFAULT 0,
      has_nursing_room INTEGER NOT NULL DEFAULT 0,
      has_restroom INTEGER NOT NULL DEFAULT 1,
      level INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gate_id TEXT NOT NULL REFERENCES gates(id),
      zone_id TEXT NOT NULL REFERENCES zones(id),
      level INTEGER NOT NULL DEFAULT 1,
      has_accessible_seating INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      raw_note TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('medical','security','crowd_control','infrastructure','general')),
      severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved')),
      location TEXT NOT NULL,
      response_plan TEXT NOT NULL DEFAULT '',
      radio_summary TEXT NOT NULL DEFAULT '',
      public_announcement TEXT,
      public_announcement_translated TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS volunteer_briefings (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      shift_notes TEXT NOT NULL,
      content TEXT NOT NULL,
      translated_content TEXT,
      language TEXT NOT NULL DEFAULT 'en',
      generated_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS live_alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('safety','operational','weather','transport')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('info','warning','critical')),
      issued_at TEXT NOT NULL DEFAULT (datetime('now')),
      translated_title TEXT,
      translated_content TEXT,
      language TEXT
    );
  `);
}

/** Seeds the database with initial data only if not already populated. */
function seedDatabase(): void {
  const existingZones = db.prepare('SELECT COUNT(*) as count FROM zones').get() as {
    count: number;
  };
  if (existingZones.count > 0) return; // Already seeded

  console.log('[DB] Seeding database with initial data...');

  // ── Zones ──────────────────────────────────────────────────────────────────
  const insertZone = db.prepare(
    'INSERT INTO zones (id, name, color, description, total_capacity) VALUES (?, ?, ?, ?, ?)'
  );
  const zones = [
    ['zone-north', 'North Zone', '#3B82F6', 'Main entrance side, premium seating', 20000],
    ['zone-south', 'South Zone', '#10B981', 'Family sections and lower bowl', 20000],
    ['zone-east', 'East Zone', '#F59E0B', 'Media, press box, and club level', 18000],
    ['zone-west', 'West Zone', '#EF4444', 'General admission and supporters', 18000],
  ];
  for (const z of zones) insertZone.run(...z);

  // ── Gates ──────────────────────────────────────────────────────────────────
  const insertGate = db.prepare(`
    INSERT INTO gates (id, name, zone_id, section_range, has_accessible_route,
      has_prayer_room, has_nursing_room, has_restroom, level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const gates = [
    // North Zone gates
    ['gate-a', 'Gate A', 'zone-north', '101-110', 1, 1, 1, 1, 1],
    ['gate-b', 'Gate B', 'zone-north', '111-120', 1, 0, 0, 1, 1],
    ['gate-c', 'Gate C', 'zone-north', '121-130', 0, 0, 1, 1, 1],
    // South Zone gates
    ['gate-d', 'Gate D', 'zone-south', '201-210', 1, 1, 1, 1, 1],
    ['gate-e', 'Gate E', 'zone-south', '211-220', 0, 0, 0, 1, 1],
    ['gate-f', 'Gate F', 'zone-south', '221-230', 1, 0, 1, 1, 2],
    // East Zone gates
    ['gate-g', 'Gate G', 'zone-east', '301-315', 1, 0, 0, 1, 1],
    ['gate-h', 'Gate H', 'zone-east', '316-330', 0, 1, 0, 1, 1],
    // West Zone gates
    ['gate-i', 'Gate I', 'zone-west', '401-415', 1, 0, 1, 1, 1],
    ['gate-j', 'Gate J', 'zone-west', '416-430', 0, 0, 0, 1, 1],
  ];
  for (const g of gates) insertGate.run(...g);

  // ── Sections (sample) ──────────────────────────────────────────────────────
  const insertSection = db.prepare(`
    INSERT INTO sections (id, name, gate_id, zone_id, level, has_accessible_seating)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const sections = [
    ['sec-101', 'Section 101', 'gate-a', 'zone-north', 1, 1],
    ['sec-105', 'Section 105', 'gate-a', 'zone-north', 1, 0],
    ['sec-110', 'Section 110', 'gate-b', 'zone-north', 1, 1],
    ['sec-201', 'Section 201', 'gate-d', 'zone-south', 1, 1],
    ['sec-214', 'Section 214', 'gate-e', 'zone-south', 2, 0],
    ['sec-220', 'Section 220', 'gate-f', 'zone-south', 2, 1],
    ['sec-301', 'Section 301', 'gate-g', 'zone-east', 1, 1],
    ['sec-315', 'Section 315', 'gate-h', 'zone-east', 1, 0],
    ['sec-401', 'Section 401', 'gate-i', 'zone-west', 1, 1],
    ['sec-415', 'Section 415', 'gate-j', 'zone-west', 1, 0],
  ];
  for (const s of sections) insertSection.run(...s);

  // ── Mock Users ─────────────────────────────────────────────────────────────
  // NOTE: Passwords are bcrypt-like hashed. In this demo, we use a fixed
  // "hash" (plain-text prefixed) since bcrypt would require an async setup.
  // In production, replace with proper bcrypt.hash() comparison.
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `);
  const users = [
    ['user-fan-1', 'alex_fan', 'alex@example.com', 'demo:fan123', 'fan'],
    ['user-vol-1', 'sam_volunteer', 'sam@example.com', 'demo:vol123', 'volunteer'],
    ['user-org-1', 'admin_organizer', 'admin@fanpulse.ai', 'demo:org123', 'organizer'],
  ];
  for (const u of users) insertUser.run(...u);

  // ── Live Alerts (seeded) ────────────────────────────────────────────────────
  const insertAlert = db.prepare(`
    INSERT INTO live_alerts (id, type, title, content, severity, issued_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  insertAlert.run(
    'alert-1',
    'operational',
    'Gates Open — Match Day',
    'All gates are now open. Please proceed to your assigned gate. Show your ticket QR code at turnstiles.',
    'info'
  );
  insertAlert.run(
    'alert-2',
    'transport',
    'Metro Running — Extended Service',
    'Metro Line 7 and Bus Route 42 are operating extended hours today. Free service for ticket holders.',
    'info'
  );
  insertAlert.run(
    'alert-3',
    'safety',
    'No Re-Entry After Kickoff',
    'Once the match begins, re-entry is not permitted. Plan restroom and food visits before kickoff.',
    'warning'
  );

  console.log('[DB] Seeding complete.');
}

// Initialize schema and seed on module load
createSchema();
seedDatabase();

export default db;
