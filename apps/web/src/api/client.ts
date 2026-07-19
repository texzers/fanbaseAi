/**
 * API client — all HTTP calls to the backend go through this module.
 * Never calls the Anthropic API directly — always proxies through the backend.
 */

const API_BASE = '/api';

/** Retrieves stored auth token from localStorage. */
function getAuthToken(): string | null {
  return localStorage.getItem('fanpulse_token');
}

/** Builds default headers, including Authorization if token exists. */
function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/** Generic fetch wrapper with error handling. */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options.headers as Record<string, string> ?? {}),
  });

  const json = await response.json() as { success: boolean; data?: T; error?: string };

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? `HTTP ${response.status}`);
  }

  return json.data as T;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<{ token: string; user: { id: string; username: string; email: string; role: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) }
    ),
};

// ── Crowd ────────────────────────────────────────────────────────────────────

export const crowdApi = {
  getStatus: () => apiFetch<import('@fanpulse/shared-types').CrowdStatusResponse>('/crowd/status'),
};

// ── Chat ────────────────────────────────────────────────────────────────────

export const chatApi = {
  fanChat: (body: import('@fanpulse/shared-types').FanChatRequest) =>
    apiFetch<import('@fanpulse/shared-types').ChatResponse>('/chat/fan', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  opsChat: (body: import('@fanpulse/shared-types').OpsChatRequest) =>
    apiFetch<import('@fanpulse/shared-types').ChatResponse>('/chat/ops', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  wayfinding: (body: import('@fanpulse/shared-types').WayfindingRequest) =>
    apiFetch<import('@fanpulse/shared-types').WayfindingResponse>('/chat/wayfinding', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Incidents ────────────────────────────────────────────────────────────────

export const incidentApi = {
  list: (page = 1, limit = 10) =>
    apiFetch<import('@fanpulse/shared-types').Incident[]>(`/incidents?page=${page}&limit=${limit}`),

  create: (body: import('@fanpulse/shared-types').CreateIncidentRequest) =>
    apiFetch<import('@fanpulse/shared-types').Incident>('/incidents', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateStatus: (id: string, status: string) =>
    apiFetch<import('@fanpulse/shared-types').Incident>(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ── Briefings ────────────────────────────────────────────────────────────────

export const briefingApi = {
  list: () => apiFetch<import('@fanpulse/shared-types').VolunteerBriefing[]>('/briefings'),

  create: (body: import('@fanpulse/shared-types').CreateBriefingRequest) =>
    apiFetch<import('@fanpulse/shared-types').VolunteerBriefing>('/briefings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Sustainability ────────────────────────────────────────────────────────────

export const sustainabilityApi = {
  getRecommendations: (body: import('@fanpulse/shared-types').SustainabilityRequest) =>
    apiFetch<import('@fanpulse/shared-types').SustainabilityResponse>(
      '/sustainability/recommendations',
      { method: 'POST', body: JSON.stringify(body) }
    ),
};
