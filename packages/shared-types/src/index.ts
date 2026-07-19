/**
 * Shared TypeScript interfaces for FanPulse AI.
 * Imported by both frontend (apps/web) and backend (apps/server)
 * to ensure contract consistency and prevent type drift.
 */

// ─── Auth & Users ─────────────────────────────────────────────────────────────

/** Roles available in the system. Fans get read-only fan app; volunteers/organizers access Ops Dashboard. */
export type UserRole = 'fan' | 'volunteer' | 'organizer';

/** A registered system user. */
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string; // ISO 8601
}

/** JWT payload embedded in tokens. */
export interface JwtPayload {
  sub: string; // user id
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/** Authentication response returned on successful login. */
export interface AuthResponse {
  token: string;
  user: Omit<User, 'createdAt'>;
}

// ─── Stadium Geography ────────────────────────────────────────────────────────

/** Broad color-coded zone (e.g., North, South, East, West). */
export interface Zone {
  id: string;
  name: string;
  color: string; // hex code for UI heatmap
  description: string;
  totalCapacity: number;
  gateIds: string[];
}

/** A physical gate entry point to the stadium. */
export interface Gate {
  id: string;
  name: string; // e.g., "Gate A", "Gate C-2"
  zoneId: string;
  sectionRange: string; // e.g., "101-120"
  hasAccessibleRoute: boolean;
  hasPrayerRoom: boolean;
  hasNursingRoom: boolean;
  hasRestroom: boolean;
  level: number; // floor level
}

/** A section within the stadium. */
export interface Section {
  id: string;
  name: string; // e.g., "Section 214"
  gateId: string;
  zoneId: string;
  level: number;
  hasAccessibleSeating: boolean;
}

// ─── Crowd Data ───────────────────────────────────────────────────────────────

/** Crowd density status thresholds. */
export type CrowdStatus = 'low' | 'moderate' | 'congested';

/** A live (simulated) crowd reading for a single gate or zone. */
export interface CrowdReading {
  id: string;
  gateId: string;
  zoneId: string;
  densityPercentage: number; // 0–100
  queueTimeMin: number; // estimated wait in minutes
  status: CrowdStatus;
  inboundFlowPerMin: number; // simulated turnstile count
  updatedAt: string; // ISO 8601
}

/** Aggregated zone crowd summary. */
export interface ZoneCrowdSummary {
  zoneId: string;
  zoneName: string;
  avgDensityPercentage: number;
  maxDensityPercentage: number;
  status: CrowdStatus;
  gates: CrowdReading[];
  aiBriefing?: string; // AI-generated operational briefing
}

/** Full crowd state for all zones — returned by /api/crowd/status. */
export interface CrowdStatusResponse {
  simulatedAt: string; // ISO 8601
  isSimulated: true; // always true — no real IoT feed exists
  zones: ZoneCrowdSummary[];
  overallStatus: CrowdStatus;
  operationalBriefing: string; // AI-generated English briefing
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

/** A single message in a conversation. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601
  language?: string; // BCP-47 language tag, e.g. "es", "ar", "fr"
}

/** Request body for fan concierge chat. */
export interface FanChatRequest {
  message: string;
  language?: string; // fan's preferred language (BCP-47)
  conversationHistory?: Pick<ChatMessage, 'role' | 'content'>[];
  accessibilityMode?: boolean; // if true, AI uses plain-language simplification
}

/** Request body for ops assistant chat. */
export interface OpsChatRequest {
  message: string;
  conversationHistory?: Pick<ChatMessage, 'role' | 'content'>[];
}

/** Generic chat response. */
export interface ChatResponse {
  message: ChatMessage;
  suggestedActions?: string[]; // quick-reply suggestions
}

// ─── Wayfinding ───────────────────────────────────────────────────────────────

/** Request for AI-generated wayfinding directions. */
export interface WayfindingRequest {
  fromLocation: string; // e.g., "Gate A", "Section 101", "Main entrance"
  toLocation: string; // e.g., "Section 214", "North restroom", "Gate C"
  preferStepFree?: boolean; // accessibility preference
  language?: string; // BCP-47 language tag
}

/** AI-generated wayfinding response. */
export interface WayfindingResponse {
  directions: string; // AI-generated natural language step-by-step
  routeStatus: CrowdStatus; // crowd status along primary route
  alternateRoute?: string; // AI-generated alternate if primary is congested
  estimatedMinutes: number;
  stepFreeRoute: boolean;
}

// ─── Incidents ────────────────────────────────────────────────────────────────

/** Incident severity levels. */
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

/** Incident category. */
export type IncidentCategory =
  | 'medical'
  | 'security'
  | 'crowd_control'
  | 'infrastructure'
  | 'general';

/** Status of an incident. */
export type IncidentStatus = 'open' | 'in_progress' | 'resolved';

/** A structured incident record. */
export interface Incident {
  id: string;
  title: string;
  rawNote: string; // original free-text from staff
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: string;
  responsePlan: string; // AI-generated recommended response
  radioSummary: string; // AI-generated concise radio-ready summary
  publicAnnouncement?: string; // AI-generated public-safe announcement
  publicAnnouncementTranslated?: string; // translated version
  createdBy: string; // user id
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Request to create a new incident from a staff note. */
export interface CreateIncidentRequest {
  rawNote: string; // free-text incident note
  location: string; // e.g., "Section 214", "Gate C"
  generatePublicAnnouncement?: boolean;
  announcementLanguage?: string; // BCP-47
}

// ─── Volunteer Briefings ──────────────────────────────────────────────────────

/** An AI-generated volunteer shift briefing. */
export interface VolunteerBriefing {
  id: string;
  date: string; // ISO 8601 date
  shiftNotes: string; // raw input from organizer
  content: string; // AI-generated structured briefing (English)
  translatedContent?: string; // AI-translated version
  language: string; // BCP-47 of translation
  generatedBy: string; // user id
  createdAt: string; // ISO 8601
}

/** Request to generate a volunteer briefing. */
export interface CreateBriefingRequest {
  shiftNotes: string;
  targetLanguage?: string; // BCP-47 — if provided, also translate
  date?: string; // ISO 8601 — defaults to today
}

// ─── Sustainability ───────────────────────────────────────────────────────────

/** Request for sustainability/transport recommendations. */
export interface SustainabilityRequest {
  origin: string; // user's starting location/neighborhood
  language?: string; // BCP-47
}

/** A single transport option. */
export interface TransportOption {
  mode: string; // e.g., "Metro Line 7", "Electric Bus Route 42", "Walking"
  estimatedMinutes: number;
  carbonKgCO2: number; // carbon footprint in kg CO2
  isBestOption: boolean;
  details: string; // AI-generated description
}

/** Sustainability recommendation response. */
export interface SustainabilityResponse {
  origin: string;
  options: TransportOption[];
  aiSummary: string; // AI-generated carbon-savings narrative
  carbonSavedVsDriving: number; // kg CO2 saved by best option vs solo car
}

// ─── Live Alerts ──────────────────────────────────────────────────────────────

/** A live operational/safety alert for the fan feed. */
export interface LiveAlert {
  id: string;
  type: 'safety' | 'operational' | 'weather' | 'transport';
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'critical';
  issuedAt: string; // ISO 8601
  translatedTitle?: string;
  translatedContent?: string;
  language?: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

/** Standard API success wrapper. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

/** Standard API error response. */
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
