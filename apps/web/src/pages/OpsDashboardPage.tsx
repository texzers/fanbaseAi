/**
 * Operations Dashboard — for organizers and volunteers.
 *
 * Tabs:
 * - Crowd Intelligence: live heatmap with AI briefing
 * - Incident Assist: staff incident logging + AI report drafting
 * - Volunteer Briefings: AI-generated shift briefings (organizer only)
 * - Ops Chat: grounded AI assistant
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { crowdApi, incidentApi, briefingApi, chatApi } from '../api/client.js';
import type {
  CrowdStatusResponse,
  Incident,
  VolunteerBriefing,
  ChatMessage,
  CreateIncidentRequest,
  CreateBriefingRequest,
} from '@fanpulse/shared-types';

type OpsTab = 'crowd' | 'incidents' | 'briefings' | 'chat';

export default function OpsDashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<OpsTab>('crowd');

  const isOrganizer = user?.role === 'organizer';

  const tabs = [
    { id: 'crowd' as const, icon: '📊', label: 'Crowd Intel' },
    { id: 'incidents' as const, icon: '🚨', label: 'Incidents' },
    ...(isOrganizer ? [{ id: 'briefings' as const, icon: '📋', label: 'Briefings' }] : []),
    { id: 'chat' as const, icon: '🤖', label: 'Ops Chat' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-base)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0.875rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }} role="img" aria-label="Control room">🎛️</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)' }}>
              <span className="gradient-text">FanPulse Ops</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {user?.username} · <span style={{ textTransform: 'capitalize', color: user?.role === 'organizer' ? 'var(--color-brand-secondary)' : 'var(--color-success)' }}>{user?.role}</span>
            </div>
          </div>
        </div>
        <button onClick={logout} className="btn btn-ghost btn-sm" aria-label="Sign out">
          Sign out ↩
        </button>
      </header>

      {/* Tab Navigation */}
      <nav
        role="tablist"
        aria-label="Operations dashboard navigation"
        style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', padding: '0.5rem 1rem', gap: '0.25rem', overflowX: 'auto' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`ops-tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`ops-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            style={{ minWidth: 110 }}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Panels */}
      <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
        {activeTab === 'crowd' && <CrowdIntelPanel />}
        {activeTab === 'incidents' && <IncidentAssistPanel />}
        {activeTab === 'briefings' && isOrganizer && <BriefingGeneratorPanel />}
        {activeTab === 'chat' && <OpsChatPanel />}
      </main>
    </div>
  );
}

// ── Crowd Intelligence Panel ────────────────────────────────────────────────────

function CrowdIntelPanel() {
  const [crowdData, setCrowdData] = useState<CrowdStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await crowdApi.getStatus();
      setCrowdData(data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchData]);

  const statusColors: Record<string, string> = {
    low: 'var(--color-crowd-low)',
    moderate: 'var(--color-crowd-moderate)',
    congested: 'var(--color-crowd-congested)',
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
          📊 Crowd Intelligence
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {crowdData && (
            <span className={`badge badge-${crowdData.overallStatus}`}>
              Stadium: {crowdData.overallStatus.toUpperCase()}
            </span>
          )}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </span>
          <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>⚠️ SIMULATED DATA</span>
        </div>
      </div>

      {/* AI Briefing */}
      {isLoading ? (
        <div className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-xl)', marginBottom: '1.5rem' }} aria-label="Loading AI briefing" />
      ) : crowdData?.operationalBriefing && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(29,142,247,0.07)', border: '1px solid rgba(29,142,247,0.2)' }} aria-label="AI operational briefing" aria-live="polite">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-brand-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            🤖 AI Operational Briefing
          </div>
          <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--color-text-primary)' }}>
            {crowdData.operationalBriefing}
          </div>
        </div>
      )}

      {/* Zone Heatmap Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-xl)' }} />)}
        </div>
      ) : (
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}
          aria-label="Crowd density by zone"
        >
          {crowdData?.zones.map((zone) => (
            <div
              key={zone.zoneId}
              className={`heatmap-cell ${zone.status}`}
              style={{ background: 'var(--color-bg-surface)', border: `1px solid ${statusColors[zone.status]}33` }}
              role="region"
              aria-label={`${zone.zoneName}: ${zone.status} crowd, ${zone.avgDensityPercentage}% density`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>{zone.zoneName}</span>
                <span className={`badge badge-${zone.status}`}>
                  {/* Crowd status shown as text+badge, not color-only */}
                  {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                </span>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Avg density</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: statusColors[zone.status] }}>
                    {zone.avgDensityPercentage}%
                  </span>
                </div>
                <div className="density-bar" role="progressbar" aria-valuenow={zone.avgDensityPercentage} aria-valuemin={0} aria-valuemax={100} aria-label={`Density: ${zone.avgDensityPercentage}%`}>
                  <div className={`density-bar-fill ${zone.status}`} style={{ width: `${zone.avgDensityPercentage}%` }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {zone.gates.map((gate) => (
                  <div key={gate.gateId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                    <span style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                      {gate.gateId.replace('gate-', 'Gate ').toUpperCase()}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ color: statusColors[gate.status] }}>{gate.densityPercentage}%</span>
                      {gate.queueTimeMin > 0 && (
                        <span style={{ color: 'var(--color-text-muted)' }}>~{gate.queueTimeMin}min</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Incident Assist Panel ──────────────────────────────────────────────────────

function IncidentAssistPanel() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [rawNote, setRawNote] = useState('');
  const [location, setLocation] = useState('');
  const [generateAnnouncement, setGenerateAnnouncement] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newIncident, setNewIncident] = useState<Incident | null>(null);

  useEffect(() => {
    incidentApi.list().then(setIncidents).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawNote.trim() || !location.trim()) return;
    setIsSubmitting(true);
    setError(null);
    setNewIncident(null);
    try {
      const req: CreateIncidentRequest = {
        rawNote,
        location,
        generatePublicAnnouncement: generateAnnouncement,
        announcementLanguage: 'en',
      };
      const incident = await incidentApi.create(req);
      setNewIncident(incident);
      setIncidents((prev) => [incident, ...prev]);
      setRawNote('');
      setLocation('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityClass: Record<string, string> = {
    low: 'badge-info', medium: 'badge-moderate', high: 'badge-warning', critical: 'badge-critical',
  };

  return (
    <div style={{ maxWidth: 900, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      {/* New Incident Form */}
      <section aria-labelledby="new-incident-heading">
        <h2 id="new-incident-heading" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '1.25rem' }}>
          🚨 Report Incident
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="incident-location" style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
              Location
            </label>
            <input
              id="incident-location"
              type="text"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Section 214, Gate C, North Concourse"
              required
            />
          </div>
          <div>
            <label htmlFor="incident-note" style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
              Incident Note <span style={{ color: 'var(--color-text-muted)' }}>(free text)</span>
            </label>
            <textarea
              id="incident-note"
              className="input"
              value={rawNote}
              onChange={(e) => setRawNote(e.target.value)}
              placeholder="Describe the incident in your own words…"
              required
              rows={4}
              minLength={5}
              maxLength={2000}
            />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: '0.25rem' }}>
              {rawNote.length}/2000
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
            <input
              type="checkbox"
              id="generate-announcement"
              checked={generateAnnouncement}
              onChange={(e) => setGenerateAnnouncement(e.target.checked)}
            />
            Also generate public-safe announcement
          </label>

          {error && <div role="alert" className="alert alert-critical"><span>⚠️</span><span>{error}</span></div>}

          <button id="submit-incident-btn" type="submit" className="btn btn-primary" disabled={isSubmitting || !rawNote.trim() || !location.trim()}>
            {isSubmitting ? <><div className="spinner" aria-hidden="true" /> AI Analyzing…</> : '🤖 Generate Incident Report'}
          </button>
        </form>

        {/* AI-Generated Report */}
        {newIncident && (
          <div className="card animate-fadeInUp" style={{ marginTop: '1.25rem', border: '1px solid rgba(16,185,129,0.3)' }} aria-label="Generated incident report" aria-live="polite">
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
              ✅ AI-Generated Report
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <span className={`badge ${severityClass[newIncident.severity]}`}>{newIncident.severity.toUpperCase()}</span>
              <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{newIncident.category}</span>
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: '0.75rem' }}>{newIncident.title}</h3>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>📻 RADIO SUMMARY</div>
              <div style={{ background: 'var(--color-bg-base)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontStyle: 'italic', color: '#93c5fd' }}>
                "{newIncident.radioSummary}"
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>📋 RESPONSE PLAN</div>
              <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{newIncident.responsePlan}</div>
            </div>

            {newIncident.publicAnnouncement && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>📢 PUBLIC ANNOUNCEMENT</div>
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', lineHeight: 1.6, color: '#fcd34d' }}>
                  {newIncident.publicAnnouncement}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Incidents List */}
      <section aria-labelledby="incidents-list-heading">
        <h2 id="incidents-list-heading" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '1.25rem' }}>
          Recent Incidents
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 600, overflowY: 'auto', paddingRight: '0.5rem' }}>
          {incidents.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: '2rem' }}>
              No incidents logged yet.
            </div>
          ) : incidents.map((inc) => (
            <div key={inc.id} className="card-elevated" style={{ fontSize: 'var(--text-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 600, flex: 1 }}>{inc.title}</span>
                <span className={`badge ${severityClass[inc.severity]}`} style={{ flexShrink: 0, marginLeft: '0.5rem' }}>{inc.severity}</span>
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                📍 {inc.location} · {new Date(inc.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Briefing Generator Panel ───────────────────────────────────────────────────

function BriefingGeneratorPanel() {
  const [shiftNotes, setShiftNotes] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [result, setResult] = useState<VolunteerBriefing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefings, setBriefings] = useState<VolunteerBriefing[]>([]);

  useEffect(() => {
    briefingApi.list().then(setBriefings).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const req: CreateBriefingRequest = { shiftNotes, targetLanguage };
      const briefing = await briefingApi.create(req);
      setResult(briefing);
      setBriefings((prev) => [briefing, ...prev]);
      setShiftNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate briefing');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <section aria-labelledby="briefing-form-heading">
        <h2 id="briefing-form-heading" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '1.25rem' }}>
          📋 Generate Briefing
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="shift-notes" style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
              Shift Notes (raw)
            </label>
            <textarea
              id="shift-notes"
              className="input"
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              placeholder="Paste raw shift notes, event schedule, special instructions…"
              required
              rows={8}
              minLength={10}
            />
          </div>
          <div>
            <label htmlFor="briefing-language" style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
              Also translate to:
            </label>
            <select
              id="briefing-language"
              className="input"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              <option value="en">English only</option>
              <option value="es">+ Spanish</option>
              <option value="fr">+ French</option>
              <option value="ar">+ Arabic</option>
              <option value="pt">+ Portuguese</option>
            </select>
          </div>
          {error && <div role="alert" className="alert alert-critical"><span>⚠️</span><span>{error}</span></div>}
          <button id="generate-briefing-btn" type="submit" className="btn btn-primary" disabled={isLoading || !shiftNotes.trim()}>
            {isLoading ? <><div className="spinner" aria-hidden="true" /> Generating…</> : '🤖 Generate Volunteer Briefing'}
          </button>
        </form>

        {result && (
          <div className="card animate-fadeInUp" style={{ marginTop: '1.25rem' }} aria-live="polite">
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
              ✅ Generated Briefing
            </div>
            <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{result.content}</div>
            {result.translatedContent && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-brand-primary)', fontWeight: 700, marginBottom: '0.5rem' }}>TRANSLATION</div>
                <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{result.translatedContent}</div>
              </div>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="recent-briefings-heading">
        <h2 id="recent-briefings-heading" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '1.25rem' }}>
          Recent Briefings
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 600, overflowY: 'auto' }}>
          {briefings.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: '2rem' }}>No briefings yet.</div>
          ) : briefings.map((b) => (
            <div key={b.id} className="card-elevated" style={{ fontSize: 'var(--text-sm)' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{b.date}</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>{b.content.slice(0, 120)}…</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Ops Chat Panel ─────────────────────────────────────────────────────────────

function OpsChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'ops-welcome',
      role: 'assistant',
      content: `Welcome to FanPulse Ops Assistant 🤖\n\nI answer questions grounded in real-time (simulated) crowd data. I won't fabricate statistics.\n\nTry asking:\n• "Which gates are over 80% capacity?"\n• "What is the overall crowd status?"\n• "Which zone is most congested?"`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const res = await chatApi.opsChat({ message: text, conversationHistory: history });
      setMessages((prev) => [...prev, res.message]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`, role: 'assistant',
        content: '⚠️ Could not process request. Please check your connection and try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  return (
    <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '1rem' }}>
        🤖 Ops Assistant
      </h2>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-brand-primary)', padding: '0.4rem 0.75rem', background: 'rgba(29,142,247,0.08)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
        Grounded in live simulated crowd data — no hallucinated statistics
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Ops chat conversation"
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '0.5rem' }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className="animate-fadeInUp" style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', gap: 6, padding: '0.75rem 1rem' }} aria-live="polite" aria-label="AI is processing">
            {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-text-muted)', animation: `pulse-red 1.2s ease ${i * 0.2}s infinite` }} />)}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
        <input
          id="ops-chat-input"
          type="text"
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask about crowd data, gate status, congestion…"
          aria-label="Operational question"
          disabled={isLoading}
          style={{ flex: 1 }}
          maxLength={500}
        />
        <button id="ops-chat-send" onClick={sendMessage} disabled={!input.trim() || isLoading} className="btn btn-primary" aria-label="Send">
          {isLoading ? <div className="spinner" aria-hidden="true" /> : '→'}
        </button>
      </div>
    </div>
  );
}
